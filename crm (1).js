/* Leads (CRM simples) e Follow-up */
(function () {
  'use strict';
  const CP = window.CP, U = CP.U, UI = CP.UI, esc = U.esc, L = CP.leads, Fu = CP.followups, A = CP.actions;
  const lf = { q: '', status: '', origin: '' };
  const ff = { q: '', status: 'pendente', type: '' };

  /* ---------- Leads ---------- */
  function leadForm(l) {
    UI.form({
      title: l ? 'Editar lead' : 'Novo lead', submitText: l ? 'Salvar alterações' : 'Cadastrar lead',
      values: l || { firstContact: U.today(), origin: 'instagram', status: 'novo' },
      fields: [
        { key: 'name', label: 'Nome', type: 'text', required: true, full: true },
        { key: 'firstContact', label: 'Data do primeiro contato', type: 'date' },
        { key: 'origin', label: 'Origem', type: 'select', options: L.ORIGIN },
        { key: 'phone', label: 'Telefone', type: 'tel' },
        { key: 'interest', label: 'Interesse', type: 'text', placeholder: 'Ex.: terapia online' },
        { key: 'status', label: 'Status', type: 'select', options: L.STATUS },
        { key: 'nextContact', label: 'Próximo contato', type: 'date' },
        { key: 'note', label: 'Observação administrativa', type: 'textarea', hint: 'Sem informações clínicas.' },
      ],
      extraButtons: l ? [{ label: 'Excluir', cls: 'danger', onClick: (m) => { m.close(); A.deleteLead(l.id); } }] : [],
      onSubmit: async (v) => { await L.save({ ...(l || {}), ...v }); UI.toast(l ? 'Lead atualizado.' : 'Lead cadastrado.'); CP.App.refresh(); },
    });
  }
  A.newLead = () => leadForm(null);
  A.editLead = (id) => { const l = L.get(id); if (l) leadForm(l); };
  A.deleteLead = async (id) => {
    const ok = await UI.confirm({ title: 'Excluir lead', message: 'Excluir este lead?', confirmText: 'Excluir', danger: true });
    if (!ok) return; await L.remove(id); UI.toast('Lead excluído.'); CP.App.refresh();
  };

  CP.views.leads = {
    render(root) {
      const stats = L.STATUS.map(([k, l]) => [l, L.all().filter((x) => x.status === k).length]).filter((x) => x[1]);
      root.innerHTML = UI.pageHead('Leads', 'Acompanhe pessoas interessadas, do primeiro contato ao fechamento.', `<button class="btn primary" id="newL">${UI.icon('plus', 18)} Lead</button>`) +
        (stats.length ? `<div class="sum-strip">${stats.map(([l, n]) => `<span>${esc(l)}: <b>${n}</b></span>`).join('')}</div>` : '') +
        `<section class="card">${UI.filters([{ key: 'q', label: 'Buscar lead', type: 'search' }, { key: 'status', label: 'Status', options: UI.opts.list(L.STATUS, 'Todos') }, { key: 'origin', label: 'Origem', options: UI.opts.list(L.ORIGIN, 'Todas') }], lf)}<div id="list"></div></section>`;
      const draw = () => {
        const rows = U.sortBy(L.all().filter((l) => (!lf.q || U.norm(l.name + ' ' + (l.interest || '')).includes(U.norm(lf.q))) && (!lf.status || l.status === lf.status) && (!lf.origin || l.origin === lf.origin)), (l) => l.nextContact || '9999');
        root.querySelector('#list').innerHTML = rows.length ? UI.table([
          { label: 'Nome', render: (l) => `<strong>${esc(l.name)}</strong>${l.phone ? `<br><small>${esc(l.phone)}</small>` : ''}` },
          { label: 'Primeiro contato', render: (l) => U.fmtDate(l.firstContact) }, { label: 'Origem', render: (l) => esc(UI.labelOf(L.ORIGIN, l.origin)) },
          { label: 'Interesse', render: (l) => esc(l.interest || '—') }, { label: 'Status', render: (l) => UI.sb(l.status, UI.labelOf(L.STATUS, l.status)) },
          { label: 'Próximo contato', render: (l) => U.fmtDate(l.nextContact) },
          { label: '', cls: 'act', render: (l) => UI.actions([...(l.status === 'fechou' ? [{ act: 'l-conv', id: l.id, icon: 'userplus', label: 'Cadastrar como paciente' }] : []), { act: 'l-edit', id: l.id, icon: 'edit', label: 'Editar' }, { act: 'l-del', id: l.id, icon: 'trash', label: 'Excluir', danger: true }]) },
        ], rows) : UI.empty({ icon: 'userplus', title: 'Nenhum lead encontrado', text: 'Registre contatos de Instagram, indicações, Google ou WhatsApp.', action: '<button class="btn soft" data-act="l-new">+ Lead</button>' });
      };
      draw(); UI.bindFilters(root, lf, draw);
      root.querySelector('#newL').onclick = () => A.newLead();
      UI.delegate(root, (act, id) => {
        if (act === 'l-new') A.newLead(); else if (act === 'l-edit') A.editLead(id); else if (act === 'l-del') A.deleteLead(id);
        else if (act === 'l-conv') { const l = L.get(id); if (l) A.newPatient({ name: l.name, phone: l.phone || '', status: 'nova' }); }
      });
    },
  };

  /* ---------- Follow-up ---------- */
  function followForm(x) {
    UI.form({
      title: x ? 'Editar follow-up' : 'Novo follow-up', submitText: x ? 'Salvar alterações' : 'Cadastrar',
      values: x || { type: 'antiga', status: 'pendente' },
      fields: [
        { key: 'name', label: 'Nome', type: 'text', required: true, full: true },
        { key: 'type', label: 'Situação', type: 'select', options: Fu.TYPE },
        { key: 'status', label: 'Status', type: 'select', options: Fu.STATUS },
        { key: 'lastContact', label: 'Último contato', type: 'date' },
        { key: 'nextContact', label: 'Data do próximo contato', type: 'date' },
        { key: 'note', label: 'Observação administrativa', type: 'textarea', hint: 'Sem informações clínicas.' },
      ],
      extraButtons: x ? [{ label: 'Excluir', cls: 'danger', onClick: (m) => { m.close(); A.deleteFollowup(x.id); } }] : [],
      onSubmit: async (v) => { await Fu.save({ ...(x || {}), ...v }); UI.toast(x ? 'Follow-up atualizado.' : 'Follow-up cadastrado.'); CP.App.refresh(); },
    });
  }
  A.newFollowup = () => followForm(null);
  A.editFollowup = (id) => { const x = Fu.get(id); if (x) followForm(x); };
  A.deleteFollowup = async (id) => {
    const ok = await UI.confirm({ title: 'Excluir follow-up', message: 'Excluir este follow-up?', confirmText: 'Excluir', danger: true });
    if (!ok) return; await Fu.remove(id); UI.toast('Follow-up excluído.'); CP.App.refresh();
  };
  function contacted(x) {
    UI.form({
      title: 'Registrar contato', submitText: 'Salvar', values: { lastContact: U.today(), nextContact: '' },
      fields: [
        { key: 'lastContact', label: 'Data do contato', type: 'date', required: true },
        { key: 'nextContact', label: 'Próximo contato (opcional)', type: 'date', hint: 'Sem próxima data, o follow-up fica como “contatado”.' },
        { key: 'note', label: 'Observação administrativa', type: 'textarea' },
      ],
      onSubmit: async (v) => { await Fu.save({ ...x, lastContact: v.lastContact, nextContact: v.nextContact, note: v.note || x.note, status: v.nextContact ? 'pendente' : 'contatado' }); UI.toast('Contato registrado.'); CP.App.refresh(); },
    });
  }

  CP.views.followup = {
    render(root) {
      const due = Fu.dueToday();
      root.innerHTML = UI.pageHead('Follow-up', 'Pacientes antigas, pausas, altas e pessoas que demonstraram interesse.', `<button class="btn primary" id="newF">${UI.icon('plus', 18)} Follow-up</button>`) +
        (due.count ? `<div class="alerts"><div class="alert">${UI.icon('bell', 20)}<span>Você possui ${due.count} contato${due.count > 1 ? 's' : ''} para acompanhar hoje.${due.leads.length ? ` (${due.leads.length} em Leads)` : ''}</span></div></div>` : '') +
        `<section class="card">${UI.filters([{ key: 'q', label: 'Buscar por nome', type: 'search' }, { key: 'status', label: 'Status', options: UI.opts.list(Fu.STATUS, 'Todos') }, { key: 'type', label: 'Situação', options: UI.opts.list(Fu.TYPE, 'Todas') }], ff)}<div id="list"></div></section>`;
      const draw = () => {
        const t = U.today();
        const rows = U.sortBy(Fu.all().filter((x) => (!ff.q || U.norm(x.name).includes(U.norm(ff.q))) && (!ff.status || x.status === ff.status) && (!ff.type || x.type === ff.type)), (x) => x.nextContact || '9999');
        root.querySelector('#list').innerHTML = rows.length ? UI.table([
          { label: 'Nome', render: (x) => `<strong>${esc(x.name)}</strong>` }, { label: 'Situação', render: (x) => esc(UI.labelOf(Fu.TYPE, x.type)) },
          { label: 'Último contato', render: (x) => U.fmtDate(x.lastContact) },
          { label: 'Próximo contato', render: (x) => (x.nextContact && x.status === 'pendente' && x.nextContact <= t ? `<strong style="color:var(--bad)">${U.fmtDate(x.nextContact)}</strong>` : U.fmtDate(x.nextContact)) },
          { label: 'Status', render: (x) => UI.sb(x.status, UI.labelOf(Fu.STATUS, x.status)) }, { label: 'Observação', render: (x) => esc(x.note || '—') },
          { label: '', cls: 'act', render: (x) => UI.actions([{ act: 'f-done', id: x.id, icon: 'check', label: 'Registrar contato' }, { act: 'f-edit', id: x.id, icon: 'edit', label: 'Editar' }, { act: 'f-del', id: x.id, icon: 'trash', label: 'Excluir', danger: true }]) },
        ], rows) : UI.empty({ icon: 'bell', title: 'Nenhum follow-up neste filtro', text: 'Cadastre quem você quer reencontrar e a data do próximo contato.', action: '<button class="btn soft" data-act="f-new">+ Follow-up</button>' });
      };
      draw(); UI.bindFilters(root, ff, draw);
      root.querySelector('#newF').onclick = () => A.newFollowup();
      UI.delegate(root, (act, id) => {
        if (act === 'f-new') A.newFollowup(); else if (act === 'f-edit') A.editFollowup(id); else if (act === 'f-del') A.deleteFollowup(id);
        else if (act === 'f-done') { const x = Fu.get(id); if (x) contacted(x); }
      });
    },
  };
})();
