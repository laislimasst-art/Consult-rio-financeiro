/* Recibos + Controle Carnê-Leão */
(function () {
  'use strict';
  const CP = window.CP, U = CP.U, UI = CP.UI, esc = U.esc, Rc = CP.receipts, Pay = CP.payments, A = CP.actions;
  const nm = CP.patients.name;
  const cf = { status: '', month: '', patient: '' };

  /* HTML do recibo (somente informações fornecidas — nada fiscal é inventado) */
  function receiptHtml(r) {
    const s = CP.settings.data;
    return `<div class="receipt">
      <header>${s.logo ? `<img class="r-logo" src="${esc(s.logo)}" alt="">` : ''}<div><h1>${esc(s.name)}</h1>
        <p>${esc(s.profession)}${s.crp ? ' · CRP ' + esc(s.crp) : ''}</p>
        ${s.cpf ? `<p>CPF/CNPJ: ${esc(s.cpf)}</p>` : ''}${s.address ? `<p>${esc(s.address)}</p>` : ''}
        ${s.phone || s.email ? `<p>${[s.phone, s.email].filter(Boolean).map(esc).join(' · ')}</p>` : ''}</div></header>
      <h2>RECIBO <span>Nº ${esc(r.number)}</span></h2>
      <div class="r-val">${U.money(r.value)}</div>
      <p>Recebi de <strong>${esc(r.payerName)}</strong> a quantia de <strong>${U.money(r.value)}</strong>${U.extenso(r.value) ? ` (${esc(U.extenso(r.value))})` : ''}, referente a ${esc(r.description || 'serviços de psicologia')}.</p>
      <p>Data do pagamento: ${U.fmtDate(r.date)}</p>
      <div class="sign">${esc(s.name)}<br>${esc(s.profession)}${s.crp ? ' — CRP ' + esc(s.crp) : ''}</div>
      <footer>Emitido em ${U.fmtDate(r.issueDate)}${s.receiptNote ? ' · ' + esc(s.receiptNote) : ''}</footer></div>`;
  }

  function preview(r) {
    const m = UI.modal({ title: `Recibo Nº ${r.number}`, wide: true, footer: true, body: receiptHtml(r) });
    m.foot.innerHTML = '<span class="spacer"></span><button class="btn ghost" data-c>Fechar</button><button class="btn primary" data-p>Imprimir / salvar como PDF</button>';
    m.foot.querySelector('[data-c]').onclick = () => m.close();
    m.foot.querySelector('[data-p]').onclick = () => UI.print(receiptHtml(r));
  }
  A.viewReceipt = (id) => { const r = Rc.get(id); if (r) preview(r); };

  function receiptForm(pay) {
    const vals = pay
      ? { patientId: pay.patientId || '', payerName: nm(pay.patientId, pay.patientName) === '—' ? '' : nm(pay.patientId, pay.patientName), value: pay.value, date: pay.date, description: Rc.defaultDescription(pay), issueDate: U.today() }
      : { issueDate: U.today(), date: U.today(), description: 'Serviços de psicologia' };
    UI.form({
      title: pay ? 'Gerar recibo' : 'Novo recibo', values: vals, submitText: 'Gerar recibo',
      fields: [
        { key: 'patientId', label: 'Paciente cadastrada', type: 'select', options: UI.opts.patients('— nome digitado abaixo —') },
        { key: 'payerName', label: 'Recebido de (nome)', type: 'text', required: true },
        { key: 'value', label: 'Valor (R$)', type: 'money', required: true },
        { key: 'date', label: 'Data do pagamento', type: 'date', required: true },
        { key: 'issueDate', label: 'Data de emissão', type: 'date', required: true },
        { key: 'description', label: 'Descrição', type: 'textarea', required: true, hint: 'Ex.: sessão de psicoterapia, pacote mensal, avaliação.' },
      ],
      onChange: (k, v, set) => { if (k === 'patientId' && v.patientId) set('payerName', nm(v.patientId)); },
      onSubmit: async (v) => {
        if (!(Number(v.value) > 0)) throw new Error('Informe um valor maior que zero.');
        const rec = await Rc.issue({ paymentId: pay ? pay.id : '', patientId: v.patientId, payerName: v.payerName, value: Number(v.value), date: v.date, description: v.description, issueDate: v.issueDate });
        UI.toast('Recibo gerado.');
        CP.App.refresh();
        setTimeout(() => preview(rec), 250);
      },
    });
  }
  A.issueReceipt = (paymentId) => { const p = Pay.get(paymentId); if (p) receiptForm(p); };
  A.newReceipt = () => receiptForm(null);

  /* ---------- Carnê-Leão ---------- */
  function carneForm(p) {
    UI.form({
      title: 'Registrar no Carnê-Leão', values: { carneDate: U.today() }, submitText: 'Marcar como registrado',
      fields: [{ key: 'carneDate', label: 'Data do registro', type: 'date', required: true }],
      onSubmit: async (v) => { await Pay.save({ ...p, carneLeao: true, carneDate: v.carneDate }); UI.toast('Registro no Carnê-Leão salvo.'); CP.App.refresh(); },
    });
  }

  function carneTab(box) {
    const all = Pay.all().filter((p) => p.status === 'pago');
    const waiting = all.filter((p) => !p.carneLeao);
    const rows = U.sortBy(all.filter((p) => {
      if (cf.status === 'registrado' && !p.carneLeao) return false;
      if (cf.status === 'pendente' && p.carneLeao) return false;
      if (cf.month && U.monthKey(p.date) !== cf.month) return false;
      if (cf.patient && p.patientId !== cf.patient) return false;
      return true;
    }), (p) => p.date, -1);
    box.innerHTML = `<section class="card"><div class="card-head"><h3>Controle Carnê-Leão</h3></div>
      <div class="sum-strip"><span>Pagamentos aguardando registro: <b>${waiting.length}</b></span><span>Valor: <b>${U.money(U.sum(waiting, (p) => p.value))}</b></span></div>
      ${UI.filters([
        { key: 'status', label: 'Situação', options: [['', 'Todos'], ['pendente', 'Pendente'], ['registrado', 'Registrado']] },
        { key: 'month', label: 'Mês', type: 'month' },
        { key: 'patient', label: 'Paciente', options: UI.opts.patients('Todas') },
      ], cf)}<div id="clist"></div></section>`;
    const draw = () => {
      const filtered = U.sortBy(all.filter((p) => (!cf.status || (cf.status === 'registrado') === !!p.carneLeao) && (!cf.month || U.monthKey(p.date) === cf.month) && (!cf.patient || p.patientId === cf.patient)), (p) => p.date, -1);
      box.querySelector('#clist').innerHTML = filtered.length ? UI.table([
        { label: 'Data', render: (p) => U.fmtDate(p.date) },
        { label: 'Paciente', render: (p) => `<strong>${esc(nm(p.patientId, p.patientName))}</strong>` },
        { label: 'Valor', cls: 'num', render: (p) => U.money(p.value) },
        { label: 'Referente', render: (p) => esc(UI.labelOf(Pay.REF, p.refType)) },
        { label: 'Recibo', render: (p) => UI.sb(p.receiptIssued ? 'sim' : 'nao', p.receiptIssued ? 'Emitido' : 'Pendente') },
        { label: 'Carnê-Leão', render: (p) => UI.sb(p.carneLeao ? 'sim' : 'nao', p.carneLeao ? 'Sim' : 'Não') },
        { label: 'Data do registro', render: (p) => U.fmtDate(p.carneDate) },
        { label: 'Status', render: (p) => UI.sb(p.carneLeao ? 'ok' : 'pendente', p.carneLeao ? 'Registrado' : 'Pendente') },
        { label: '', cls: 'act', render: (p) => `<div class="row-actions">${p.carneLeao ? `<button class="btn ghost sm" data-act="carne-undo" data-id="${p.id}">Desfazer</button>` : `<button class="btn soft sm" data-act="carne-reg" data-id="${p.id}">Registrar</button>`}${p.receiptIssued ? '' : `<button class="icon-btn" data-act="pay-receipt" data-id="${p.id}" title="Gerar recibo" aria-label="Gerar recibo">${UI.icon('receipt', 17)}</button>`}</div>` },
      ], filtered) : UI.empty({ icon: 'wallet', title: 'Nenhum pagamento neste filtro', text: 'Somente pagamentos com status “pago” aparecem aqui.' });
    };
    void rows;
    draw();
    UI.bindFilters(box, cf, draw);
    UI.delegate(box, async (act, id) => {
      const p = Pay.get(id); if (!p) return;
      if (act === 'carne-reg') carneForm(p);
      else if (act === 'carne-undo') { await Pay.save({ ...p, carneLeao: false, carneDate: '' }); UI.toast('Registro desfeito.'); CP.App.refresh(); }
      else if (act === 'pay-receipt') A.issueReceipt(id);
    });
  }

  /* ---------- Tela ---------- */
  function receiptsTab(box) {
    const list = U.sortBy(Rc.all(), (r) => r.issueDate + r.number, -1);
    const waiting = U.sortBy(Pay.awaitingReceipt(), (p) => p.date, -1);
    box.innerHTML = `${waiting.length ? `<section class="card"><h3>Pagamentos pagos sem recibo (${waiting.length})</h3>${waiting.slice(0, 8).map((p) => `<div class="list-row"><div><strong>${esc(nm(p.patientId, p.patientName))}</strong><small>${U.fmtDate(p.date)} · ${esc(UI.labelOf(Pay.REF, p.refType))}</small></div><div style="display:flex;gap:12px;align-items:center"><strong>${U.money(p.value)}</strong><button class="btn soft sm" data-act="pay-receipt" data-id="${p.id}">Gerar recibo</button></div></div>`).join('')}</section>` : ''}
      <section class="card section"><h3>Recibos emitidos</h3>${list.length ? UI.table([
        { label: 'Nº', render: (r) => `<strong>${esc(r.number)}</strong>` },
        { label: 'Emissão', render: (r) => U.fmtDate(r.issueDate) },
        { label: 'Paciente', render: (r) => esc(r.payerName) },
        { label: 'Descrição', render: (r) => esc(r.description) },
        { label: 'Valor', cls: 'num', render: (r) => U.money(r.value) },
        { label: '', cls: 'act', render: (r) => UI.actions([{ act: 'rc-view', id: r.id, icon: 'print', label: 'Ver / imprimir' }, { act: 'rc-del', id: r.id, icon: 'trash', label: 'Excluir', danger: true }]) },
      ], list) : UI.empty({ icon: 'receipt', title: 'Nenhum recibo emitido', text: 'Gere recibos a partir de pagamentos pagos ou crie um recibo avulso.', action: '<button class="btn soft" data-act="rc-new">+ Novo recibo</button>' })}</section>`;
    UI.delegate(box, async (act, id) => {
      if (act === 'pay-receipt') A.issueReceipt(id);
      else if (act === 'rc-view') A.viewReceipt(id);
      else if (act === 'rc-new') A.newReceipt();
      else if (act === 'rc-del') {
        const ok = await UI.confirm({ title: 'Excluir recibo', message: 'Excluir este recibo? O pagamento voltará a constar como “sem recibo”.', confirmText: 'Excluir', danger: true });
        if (!ok) return;
        await Rc.removeWithUnlink(id); UI.toast('Recibo excluído.'); CP.App.refresh();
      }
    });
  }

  CP.views.recibos = {
    tab: 'recibos',
    render(root) {
      const self = CP.views.recibos;
      root.innerHTML = UI.pageHead('Recibos', 'Emissão de recibos e controle do Carnê-Leão.', `<button class="btn primary" id="newRc">${UI.icon('plus', 18)} Novo recibo</button>`) +
        UI.tabs([['recibos', 'Recibos', Rc.all().length], ['carne', 'Carnê-Leão', Pay.awaitingCarne().length]], self.tab) + '<div id="box"></div>';
      const box = root.querySelector('#box');
      if (self.tab === 'carne') carneTab(box); else receiptsTab(box);
      UI.bindTabs(root, (t) => { self.tab = t; CP.views.recibos.render(root); });
      root.querySelector('#newRc').onclick = () => A.newReceipt();
    },
  };
  CP.receiptHtml = receiptHtml;
})();
