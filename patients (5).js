/* Pacientes: lista por status, detalhe e formulário */
(function () {
  'use strict';
  const CP = window.CP, U = CP.U, UI = CP.UI, esc = U.esc, P = CP.patients, A = CP.actions;
  let tab = 'ativa', q = '';

  function patientForm(p) {
    UI.form({
      title: p ? 'Editar paciente' : 'Nova paciente', wide: true, notice: P.NOTICE,
      values: p || { status: 'ativa' }, submitText: p ? 'Salvar alterações' : 'Cadastrar paciente',
      fields: P.fields(),
      extraButtons: p ? [{ label: 'Excluir', cls: 'danger', onClick: (m) => { m.close(); A.deletePatient(p.id); } }] : [],
      onSubmit: async (v) => {
        const rec = { ...(p || {}), ...v };
        if (rec.paymentModel !== 'pacote_mensal') rec.packageSize = null;
        const saved = await P.save(rec);
        // mantém o nome atualizado nos registros antigos (cópia do nome)
        if (p && p.name !== saved.name) {
          for (const x of CP.payments.forPatient(p.id)) await CP.payments.save({ ...x, patientName: saved.name });
          for (const x of CP.sessions.forPatient(p.id)) await CP.sessions.save({ ...x, patientName: saved.name });
        }
        UI.toast(p ? 'Paciente atualizada.' : 'Paciente cadastrada.');
        CP.App.refresh();
      },
    });
  }
  A.newPatient = (prefill) => patientForm(prefill ? { status: 'ativa', ...prefill } : null);
  A.editPatient = (id) => { const p = P.get(id); if (p) patientForm(p); };
  A.deletePatient = async (id) => {
    const p = P.get(id); if (!p) return;
    const ok = await UI.confirm({ title: 'Excluir paciente', message: `Excluir <strong>${esc(p.name)}</strong>? Os pagamentos e sessões já registrados continuam no histórico, com o nome dela.`, confirmText: 'Excluir paciente', danger: true });
    if (!ok) return;
    await P.remove(id);
    UI.toast('Paciente excluída.');
    if (CP.App.current.name === 'pacientes' && CP.App.current.param) CP.App.go('pacientes'); else CP.App.refresh();
  };

  function card(p) {
    const st = P.stats(p.id);
    const model = UI.labelOf(P.MODEL, p.paymentModel);
    return `<button class="pcard" data-open="${p.id}"><h4>${esc(p.name)}${UI.sb(p.status, UI.labelOf(P.STATUS, p.status))}</h4>
      <p>${p.sessionValue ? U.money(p.sessionValue) + ' por sessão' : 'Valor da sessão não informado'}${p.paymentModel ? ' · ' + esc(model) : ''}</p>
      <p>Próximo atendimento: ${st.nextSession ? U.fmtDate(st.nextSession) : '—'}</p>
      <p>Recebido no mês: <strong>${U.money(st.receivedMonth)}</strong></p>
      ${st.pendingValue > 0 ? `<p class="pend">Pendente: ${U.money(st.pendingValue)}</p>` : ''}</button>`;
  }

  function list(root) {
    const count = (s) => P.all().filter((p) => p.status === s).length;
    root.innerHTML = UI.pageHead('Pacientes', 'Cadastro administrativo e financeiro.', `<button class="btn primary" id="newP">${UI.icon('plus', 18)} Paciente</button>`) +
      `<div class="notice" style="margin-bottom:18px">${esc(P.NOTICE)}</div>` +
      UI.tabs([['ativa', 'Ativas', count('ativa')], ['nova', 'Novas', count('nova')], ['inativa', 'Inativas', count('inativa')], ['antiga', 'Antigas', count('antiga')], ['leads', 'Leads', CP.leads.all().length]], tab) +
      `<div class="filters">${UI.filters([{ key: 'q', label: 'Buscar por nome, telefone ou e-mail', type: 'search' }], { q })}</div><div id="list"></div>`;
    const draw = () => {
      const box = root.querySelector('#list');
      if (tab === 'leads') {
        const ls = CP.leads.all().filter((l) => !q || U.norm(l.name).includes(U.norm(q)));
        box.innerHTML = ls.length ? `<div class="grid g-3">${ls.map((l) => `<button class="pcard" data-lead="${l.id}"><h4>${esc(l.name)}${UI.sb(l.status, UI.labelOf(CP.leads.STATUS, l.status))}</h4><p>Origem: ${esc(UI.labelOf(CP.leads.ORIGIN, l.origin))}</p><p>Próximo contato: ${U.fmtDate(l.nextContact)}</p></button>`).join('')}</div><p style="margin-top:16px"><a class="btn soft" href="#/leads">Abrir módulo de Leads</a></p>`
          : UI.empty({ icon: 'userplus', title: 'Nenhum lead ainda', text: 'Registre novos contatos no módulo Leads.', action: '<a class="btn soft" href="#/leads">Ir para Leads</a>' });
        return;
      }
      const ps = U.sortBy(P.all().filter((p) => p.status === tab && (!q || [p.name, p.phone, p.email].some((v) => U.norm(v).includes(U.norm(q))))), (p) => U.norm(p.name));
      box.innerHTML = ps.length ? `<div class="grid g-3">${ps.map(card).join('')}</div>`
        : UI.empty({ icon: 'users', title: q ? 'Nada encontrado' : 'Nenhuma paciente nesta categoria', text: q ? 'Tente outro termo de busca.' : 'Cadastre uma paciente para começar.', action: q ? '' : '<button class="btn soft" data-new>+ Paciente</button>' });
    };
    draw();
    UI.bindTabs(root, (t) => { tab = t; list(root); });
    root.querySelector('[data-f="q"]').addEventListener('input', (e) => { q = e.target.value; draw(); });
    root.querySelector('#newP').onclick = () => A.newPatient();
    root.querySelector('#list').addEventListener('click', (e) => {
      const o = e.target.closest('[data-open]'); if (o) return CP.App.go('pacientes', o.dataset.open);
      const l = e.target.closest('[data-lead]'); if (l) return A.editLead(l.dataset.lead);
      if (e.target.closest('[data-new]')) A.newPatient();
    });
  }

  function detail(root, id) {
    const p = P.get(id);
    if (!p) { CP.App.go('pacientes'); return; }
    const month = U.thisMonth(), year = month.slice(0, 4);
    const st = P.stats(id, month), tot = CP.payments.totals(id, month, year);
    const row = (l, v) => `<div><dt>${esc(l)}</dt><dd>${v || '—'}</dd></div>`;
    root.innerHTML = `<a class="back" href="#/pacientes">${UI.icon('chevL', 18)} Pacientes</a>` +
      UI.pageHead(p.name, UI.sb(p.status, UI.labelOf(P.STATUS, p.status)),
        `<button class="btn soft" data-d="pay">${UI.icon('wallet', 18)} Pagamento</button><button class="btn soft" data-d="ses">${UI.icon('calendar', 18)} Sessão</button><button class="btn ghost" data-d="edit">${UI.icon('edit', 18)} Editar</button><button class="btn danger" data-d="del">${UI.icon('trash', 18)} Excluir</button>`) +
      `<div class="grid g-stats">
        ${UI.stat({ label: 'Recebido no mês', value: U.money(tot.month), sub: `${tot.countMonth} pagamento(s)` })}
        ${UI.stat({ label: 'Recebido no ano', value: U.money(tot.year), sub: `${tot.count} pagamento(s) no total` })}
        ${UI.stat({ label: 'Valor pendente', value: U.money(st.pendingValue), sub: `${st.pendingCount} pendente(s)`, tone: st.pendingValue > 0 ? 'neg' : '' })}
       </div>
       <section class="card section"><h3>Dados administrativos</h3><dl class="info-grid">
        ${row('Data da avaliação', U.fmtDate(p.evaluationDate) !== '—' ? U.fmtDate(p.evaluationDate) : '')}
        ${row('Valor da avaliação', p.evaluationValue ? U.money(p.evaluationValue) : '')}
        ${row('Data de início', U.fmtDate(p.startDate) !== '—' ? U.fmtDate(p.startDate) : '')}
        ${row('Valor da sessão', p.sessionValue ? U.money(p.sessionValue) : '')}
        ${row('Modalidade de cobrança', p.paymentModel ? esc(UI.labelOf(P.MODEL, p.paymentModel)) : '')}
        ${row('Forma de pagamento', p.paymentMethod ? esc(UI.labelOf(CP.payments.METHODS, p.paymentMethod)) : '')}
        ${row('Frequência', p.frequency ? esc(UI.labelOf(P.FREQ, p.frequency)) : '')}
        ${row('Sessões do pacote', p.packageSize)}
        ${row('Dia da sessão', esc(p.sessionDay || ''))}
        ${row('Horário', esc(p.sessionTime || ''))}
        ${row('Telefone', esc(p.phone || ''))}
        ${row('E-mail', esc(p.email || ''))}
        ${row('Último atendimento', st.lastSession ? U.fmtDate(st.lastSession) : '')}
        ${row('Próximo atendimento', st.nextSession ? U.fmtDate(st.nextSession) : '')}
        ${row('Último pagamento', st.lastPayment ? U.fmtDate(st.lastPayment) : '')}
        ${row('Próximo pagamento', st.nextPayment ? U.fmtDate(st.nextPayment) : '')}
        ${p.exitDate ? row('Data de saída', U.fmtDate(p.exitDate)) : ''}
       </dl>${p.notes ? `<p style="margin-top:18px"><strong style="color:var(--wine)">Observações administrativas</strong><br>${esc(p.notes)}</p>` : ''}
       <div class="notice big">${esc(P.NOTICE)}</div></section>
       ${p.paymentModel === 'pacote_mensal' ? '<section class="card section" id="pkgBox"></section>' : ''}
       <section class="card section"><div class="card-head"><h3>Pagamentos</h3></div><div id="payBox"></div></section>
       <section class="card section"><div class="card-head"><h3>Sessões registradas</h3></div><div id="sesBox"></div></section>`;
    if (p.paymentModel === 'pacote_mensal') CP.pkgUI.mount(root.querySelector('#pkgBox'), id);
    const pays = U.sortBy(CP.payments.forPatient(id), (x) => x.date, -1);
    root.querySelector('#payBox').innerHTML = pays.length ? CP.payUI.table(pays, { hidePatient: true }) : UI.empty({ icon: 'wallet', title: 'Nenhum pagamento registrado', text: 'Os pagamentos desta paciente aparecerão aqui.' });
    const ses = U.sortBy(CP.sessions.forPatient(id), (x) => x.date, -1);
    root.querySelector('#sesBox').innerHTML = ses.length ? CP.sesUI.table(ses, { hidePatient: true }) : UI.empty({ icon: 'calendar', title: 'Nenhuma sessão registrada', text: 'Registre sessões para acompanhar presença e pacotes.' });
    CP.payUI.bind(root.querySelector('#payBox')); CP.sesUI.bind(root.querySelector('#sesBox'));
    const d = (k) => root.querySelector(`[data-d="${k}"]`);
    d('pay').onclick = () => A.newPayment({ patientId: id, paymentMethod: p.paymentMethod, method: p.paymentMethod || 'pix' });
    d('ses').onclick = () => A.newSession({ patientId: id, time: p.sessionTime || '' });
    d('edit').onclick = () => A.editPatient(id);
    d('del').onclick = () => A.deletePatient(id);
  }

  CP.views.pacientes = { render(root, id) { if (id) detail(root, id); else list(root); } };
})();
