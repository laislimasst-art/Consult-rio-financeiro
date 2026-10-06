/* Tela de pagamentos + componentes reutilizáveis (payUI) */
(function () {
  'use strict';
  const CP = window.CP, U = CP.U, UI = CP.UI, esc = U.esc, Pay = CP.payments, A = CP.actions;
  const nm = CP.patients.name;

  /* ---------- Formulário ---------- */
  function paymentForm(p, prefill) {
    const vals = p ? { ...p, refMonth: p.refMonth || U.monthKey(p.date) } : { date: U.today(), status: 'pago', refType: 'sessao', method: 'pix', ...prefill };
    if (!vals.refMonth) vals.refMonth = U.monthKey(vals.date);
    let auto = null;
    if (!p && vals.patientId && vals.value == null) { const d = Pay.defaultValue(vals.patientId, vals.refType); if (d != null) { vals.value = d; auto = d; } }
    UI.form({
      title: p ? 'Editar pagamento' : 'Registrar pagamento', values: vals, submitText: p ? 'Salvar alterações' : 'Registrar pagamento', wide: true,
      fields: [
        { key: 'patientId', label: 'Paciente', type: 'select', options: UI.opts.patients('— sem paciente —') },
        { key: 'value', label: 'Valor (R$)', type: 'money', required: true },
        { key: 'date', label: 'Data', type: 'date', required: true },
        { key: 'refType', label: 'Referente a', type: 'select', options: Pay.REF },
        { key: 'refMonth', label: 'Mês do pacote', type: 'month', showIf: (v) => v.refType === 'pacote' },
        { key: 'method', label: 'Forma de pagamento', type: 'select', options: Pay.METHODS },
        { key: 'status', label: 'Status', type: 'select', options: Pay.STATUS, hint: 'Só pagamentos “pagos” entram na receita recebida.' },
        { type: 'section', label: 'Recibo e Carnê-Leão' },
        { key: 'receiptIssued', label: 'Recibo emitido?', type: 'checkbox' },
        { key: 'receiptDate', label: 'Data do recibo', type: 'date', showIf: (v) => v.receiptIssued },
        { key: 'carneLeao', label: 'Carnê-Leão registrado?', type: 'checkbox' },
        { key: 'carneDate', label: 'Data do registro', type: 'date', showIf: (v) => v.carneLeao },
        { key: 'note', label: 'Observações', type: 'textarea' },
      ],
      onChange: (key, v, set) => {
        if (key === 'patientId' || key === 'refType') {
          const d = Pay.defaultValue(v.patientId, v.refType);
          if (d != null && (v.value == null || v.value === auto)) { set('value', d); auto = d; }
        }
      },
      extraButtons: p ? [{ label: 'Excluir', cls: 'danger', onClick: async (m) => { m.close(); A.deletePayment(p.id); } }] : [],
      onSubmit: async (v) => {
        const pat = v.patientId ? CP.patients.get(v.patientId) : null;
        const rec = {
          ...(p || {}), ...v, value: Number(v.value) || 0,
          patientName: pat ? pat.name : (p && p.patientId === v.patientId ? p.patientName : ''),
          refMonth: v.refType === 'pacote' ? v.refMonth || U.monthKey(v.date) : '',
          receiptDate: v.receiptIssued ? v.receiptDate || U.today() : '',
          carneDate: v.carneLeao ? v.carneDate || U.today() : '',
        };
        if (!(rec.value > 0)) throw new Error('Informe um valor maior que zero.');
        await Pay.save(rec);
        UI.toast(p ? 'Pagamento atualizado.' : 'Pagamento registrado com sucesso.');
        CP.App.refresh();
      },
    });
  }
  A.newPayment = (prefill) => paymentForm(null, prefill || {});
  A.editPayment = (id) => { const p = Pay.get(id); if (p) paymentForm(p); };
  A.deletePayment = async (id) => {
    const ok = await UI.confirm({ title: 'Excluir pagamento', message: 'Excluir este pagamento do histórico? Esta ação não pode ser desfeita.', confirmText: 'Excluir', danger: true });
    if (!ok) return;
    await Pay.remove(id); UI.toast('Pagamento excluído.'); CP.App.refresh();
  };

  /* ---------- Tabela reutilizável ---------- */
  CP.payUI = {
    table(rows, opts = {}) {
      const cols = [
        { label: 'Data', render: (p) => U.fmtDate(p.date) },
        ...(opts.hidePatient ? [] : [{ label: 'Paciente', render: (p) => `<strong>${esc(nm(p.patientId, p.patientName))}</strong>` }]),
        { label: 'Referente', render: (p) => esc(UI.labelOf(Pay.REF, p.refType)) + (p.refType === 'pacote' && p.refMonth ? `<br><small>${esc(U.monthLabel(p.refMonth))}</small>` : '') },
        { label: 'Forma', render: (p) => esc(UI.labelOf(Pay.METHODS, p.method)) },
        { label: 'Valor', cls: 'num', render: (p) => `<strong>${U.money(p.value)}</strong>` },
        { label: 'Status', render: (p) => UI.sb(p.status, UI.labelOf(Pay.STATUS, p.status)) },
        { label: 'Recibo', render: (p) => UI.sb(p.receiptIssued ? 'sim' : 'nao', p.receiptIssued ? 'Sim' : 'Não') },
        { label: 'Carnê-Leão', render: (p) => UI.sb(p.carneLeao ? 'sim' : 'nao', p.carneLeao ? 'Sim' : 'Não') },
        { label: '', cls: 'act', render: (p) => UI.actions([
          ...(p.status === 'pago' ? [{ act: 'pay-receipt', id: p.id, icon: 'receipt', label: 'Gerar recibo' }] : []),
          { act: 'pay-edit', id: p.id, icon: 'edit', label: 'Editar' },
          { act: 'pay-del', id: p.id, icon: 'trash', label: 'Excluir', danger: true },
        ]) },
      ];
      return UI.table(cols, rows);
    },
    bind(root) {
      UI.delegate(root, (act, id) => {
        if (act === 'pay-edit') A.editPayment(id);
        else if (act === 'pay-del') A.deletePayment(id);
        else if (act === 'pay-receipt') A.issueReceipt(id);
      });
    },
  };

  /* ---------- Tela ---------- */
  const f = { month: U.thisMonth(), year: '', patient: '', status: '', method: '', receipt: '', carne: '' };
  const yn = [['', 'Todos'], ['sim', 'Sim'], ['nao', 'Não']];

  function filtered() {
    return U.sortBy(Pay.all().filter((p) => {
      if (f.month && U.monthKey(p.date) !== f.month) return false;
      if (!f.month && f.year && U.yearOf(p.date) !== f.year) return false;
      if (f.patient && p.patientId !== f.patient) return false;
      if (f.status && p.status !== f.status) return false;
      if (f.method && p.method !== f.method) return false;
      if (f.receipt && (f.receipt === 'sim') !== !!p.receiptIssued) return false;
      if (f.carne && (f.carne === 'sim') !== !!p.carneLeao) return false;
      return true;
    }), (p) => p.date + (p.createdAt || ''), -1);
  }

  CP.views.pagamentos = {
    render(root) {
      const weekly = CP.patients.all().filter((p) => ['semanal', 'quinzenal', 'por_sessao'].includes(p.paymentModel) && ['ativa', 'nova'].includes(p.status));
      const refMonth = f.month || U.thisMonth();
      const refYear = f.month ? f.month.slice(0, 4) : f.year || U.today().slice(0, 4);
      root.innerHTML = UI.pageHead('Pagamentos', 'Histórico completo de pagamentos recebidos e pendentes.', `<button class="btn primary" id="newPay">${UI.icon('plus', 18)} Registrar pagamento</button>`) +
        (weekly.length ? `<section class="card"><h3>Pagamentos semanais</h3><p class="sub" style="margin-top:-8px">Referência: ${esc(U.monthLabel(refMonth))} e ano ${refYear}.</p><div class="grid g-3">${weekly.map((p) => {
          const t = Pay.totals(p.id, refMonth, refYear);
          return `<div class="stat"><span class="stat-l">${esc(p.name)}${p.sessionValue ? ` · padrão ${U.money(p.sessionValue)}` : ''}</span><strong class="stat-v">${U.money(t.month)}</strong><span class="stat-s">no mês · ${t.countMonth} pagamento(s)</span><span class="stat-s">${U.money(t.year)} no ano · ${t.count} no total · ${t.pendingCount} pendente(s)</span></div>`;
        }).join('')}</div></section>` : '') +
        `<section class="card section">${UI.filters([
          { key: 'month', label: 'Mês', type: 'month' },
          { key: 'year', label: 'Ano', options: UI.opts.list(UI.opts.years().map((y) => [y, y]), 'Todos') },
          { key: 'patient', label: 'Paciente', options: UI.opts.patients('Todas') },
          { key: 'status', label: 'Status', options: UI.opts.list(Pay.STATUS, 'Todos') },
          { key: 'method', label: 'Forma de pagamento', options: UI.opts.list(Pay.METHODS, 'Todas') },
          { key: 'receipt', label: 'Recibo emitido', options: yn },
          { key: 'carne', label: 'Carnê-Leão', options: yn },
        ], f)}<div id="list"></div></section>`;
      const draw = () => {
        const rows = filtered();
        const paid = U.sum(rows.filter((p) => p.status === 'pago'), (p) => p.value);
        const pend = U.sum(rows.filter((p) => p.status === 'pendente' || p.status === 'parcial'), (p) => p.value);
        root.querySelector('#list').innerHTML = rows.length
          ? `<div class="sum-strip"><span>Recebido: <b>${U.money(paid)}</b></span><span>Pendente/parcial: <b>${U.money(pend)}</b></span><span>${rows.length} registro(s)</span></div>${CP.payUI.table(rows)}`
          : UI.empty({ icon: 'wallet', title: 'Nenhum pagamento encontrado', text: 'Ajuste os filtros ou registre um novo pagamento.', action: '<button class="btn soft" data-act="new">+ Registrar pagamento</button>' });
      };
      draw();
      UI.bindFilters(root, f, draw);
      root.querySelector('#newPay').onclick = () => A.newPayment();
      CP.payUI.bind(root);
      root.querySelector('#list').addEventListener('click', (e) => { if (e.target.closest('[data-act="new"]')) A.newPayment(); });
    },
  };
})();
