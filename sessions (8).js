/* Sessões e pacote mensal (pkgUI / sesUI) */
(function () {
  'use strict';
  const CP = window.CP, U = CP.U, UI = CP.UI, esc = U.esc, S = CP.sessions, A = CP.actions;
  const nm = CP.patients.name;

  function sessionForm(s, prefill) {
    const vals = s ? { ...s } : { date: U.today(), status: 'agendada', ...prefill };
    if (vals.slot && !vals.month) vals.month = U.monthKey(vals.date);
    UI.form({
      title: s ? 'Editar sessão' : 'Registrar sessão', values: vals, submitText: s ? 'Salvar alterações' : 'Registrar sessão',
      fields: [
        { key: 'patientId', label: 'Paciente', type: 'select', required: true, options: UI.opts.patients() },
        { key: 'date', label: 'Data', type: 'date', required: true },
        { key: 'time', label: 'Horário', type: 'time' },
        { key: 'status', label: 'Status', type: 'select', options: S.STATUS },
        { key: 'slot', label: 'Sessão do pacote mensal', type: 'select', options: [['', 'Avulsa (fora de pacote)'], ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => [n, `Sessão ${n}`])] },
        { key: 'month', label: 'Mês do pacote', type: 'month', showIf: (v) => !!v.slot },
        { key: 'note', label: 'Observação administrativa', type: 'textarea', hint: 'Sem conteúdo clínico.' },
      ],
      extraButtons: s ? [{ label: 'Excluir', cls: 'danger', onClick: (m) => { m.close(); A.deleteSession(s.id); } }] : [],
      onSubmit: async (v) => {
        const pat = CP.patients.get(v.patientId);
        const slot = v.slot ? Number(v.slot) : '';
        const month = slot ? v.month || U.monthKey(v.date) : '';
        if (slot && S.all().some((x) => x.id !== (s && s.id) && x.patientId === v.patientId && Number(x.slot) === slot && (x.month || U.monthKey(x.date)) === month)) {
          throw new Error(`Já existe a Sessão ${slot} deste pacote em ${U.monthLabel(month)}. Edite a existente.`);
        }
        await S.save({ ...(s || {}), ...v, slot, month, patientName: pat ? pat.name : '' });
        UI.toast(s ? 'Sessão atualizada.' : 'Sessão registrada.');
        CP.App.refresh();
      },
    });
  }
  A.newSession = (prefill) => sessionForm(null, prefill || {});
  A.editSession = (id) => { const s = S.get(id); if (s) sessionForm(s); };
  A.deleteSession = async (id) => {
    const ok = await UI.confirm({ title: 'Excluir sessão', message: 'Excluir esta sessão do registro?', confirmText: 'Excluir', danger: true });
    if (!ok) return;
    await S.remove(id); UI.toast('Sessão excluída.'); CP.App.refresh();
  };

  CP.sesUI = {
    table(rows, opts = {}) {
      return UI.table([
        { label: 'Data', render: (s) => U.fmtDate(s.date) + (s.time ? ` · ${esc(s.time)}` : '') },
        ...(opts.hidePatient ? [] : [{ label: 'Paciente', render: (s) => `<strong>${esc(nm(s.patientId, s.patientName))}</strong>` }]),
        { label: 'Status', render: (s) => UI.sb(s.status, UI.labelOf(S.STATUS, s.status)) },
        { label: 'Pacote', render: (s) => (s.slot ? `Sessão ${s.slot} · ${esc(U.monthLabel(s.month || U.monthKey(s.date)))}` : 'Avulsa') },
        { label: 'Observação', render: (s) => esc(s.note || '—') },
        { label: '', cls: 'act', render: (s) => UI.actions([{ act: 'ses-edit', id: s.id, icon: 'edit', label: 'Editar' }, { act: 'ses-del', id: s.id, icon: 'trash', label: 'Excluir', danger: true }]) },
      ], rows);
    },
    bind(root) { UI.delegate(root, (act, id) => { if (act === 'ses-edit') A.editSession(id); else if (act === 'ses-del') A.deleteSession(id); }); },
  };

  /* Painel do pacote mensal de uma paciente */
  CP.pkgUI = {
    month: U.thisMonth(),
    mount(el, patientId) {
      const self = CP.pkgUI;
      const draw = () => {
        const p = CP.patients.get(patientId);
        if (!p) { el.innerHTML = ''; return; }
        const pk = S.pkg(patientId, self.month);
        el.innerHTML = `<div class="pkg-top"><div><h3 style="margin:0">Pacote mensal — ${esc(p.name)}</h3><p style="margin:4px 0 0"><strong>${pk.done} de ${pk.size} sessões realizadas</strong> · Pagamento: ${UI.sb(pk.paid ? 'pago' : 'pendente', pk.paid ? 'Pago' : 'Pendente')}</p></div>
          <div class="head-actions">${UI.monthNav(self.month)}${pk.paid ? '' : `<button class="btn soft sm" data-pk="pay">Registrar pagamento do pacote</button>`}</div></div>
          ${UI.progress(Math.round(pk.done / pk.size * 100))}
          <div class="slots">${pk.slots.map(({ n, session: s }) => `<button class="slot ${s && s.status === 'realizada' ? 'done' : ''}" data-pk="slot" data-n="${n}"><h5>Sessão ${n}${s ? UI.sb(s.status, UI.labelOf(S.STATUS, s.status)) : ''}</h5>${s ? `<p>${U.fmtDate(s.date)}${s.time ? ' · ' + esc(s.time) : ''}</p>${s.note ? `<p>${esc(s.note)}</p>` : ''}` : '<p>Sem data — toque para agendar</p>'}</button>`).join('')}</div>`;
      };
      draw();
      el.onclick = (e) => {
        const nav = e.target.closest('[data-nav]');
        if (nav) { self.month = U.addMonths(self.month, Number(nav.dataset.nav)); draw(); return; }
        const b = e.target.closest('[data-pk]'); if (!b) return;
        const p = CP.patients.get(patientId);
        if (b.dataset.pk === 'pay') {
          A.newPayment({ patientId, refType: 'pacote', refMonth: self.month, date: U.today(), status: 'pago', method: p && p.paymentMethod ? p.paymentMethod : 'pix' });
        } else {
          const n = Number(b.dataset.n);
          const s = S.pkg(patientId, self.month).slots.find((x) => x.n === n).session;
          if (s) A.editSession(s.id);
          else A.newSession({ patientId, slot: n, month: self.month, date: self.month === U.thisMonth() ? U.today() : self.month + '-01', time: p && p.sessionTime ? p.sessionTime : '' });
        }
      };
    },
  };
})();
