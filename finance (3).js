/* Financeiro: relatório mensal e anual (com impressão) */
(function () {
  'use strict';
  const CP = window.CP, U = CP.U, UI = CP.UI, esc = U.esc, F = CP.finance;
  let tab = 'mensal', month = U.thisMonth(), year = U.today().slice(0, 4);
  const nm = CP.patients.name;

  function monthHtml(m) {
    const s = F.monthSummary(m);
    const stats = [
      ['Receita recebida', U.money(s.received)], ['Receita prevista', U.money(s.expected)], ['A receber', U.money(s.toReceive)],
      ['Despesas (pagas)', U.money(s.expensesPaid)], ['Lucro', U.money(s.profit)], ['Pacientes atendidas', s.servedCount],
      ['Sessões realizadas', s.sessionsDone], ['Ticket médio', s.ticket == null ? '—' : U.money(s.ticket)],
    ];
    const cats = Object.entries(s.byCategory).sort((a, b) => b[1] - a[1]);
    return `<div class="grid g-stats">${stats.map(([l, v]) => UI.stat({ label: l, value: v })).join('')}</div>
      <section class="card section"><h3>Receita por paciente</h3>${s.perPatient.length ? UI.table([
        { label: 'Paciente', render: (r) => `<strong>${esc(r.name)}</strong>` },
        { label: 'Recebido', cls: 'num', render: (r) => U.money(r.paid) },
        { label: 'Previsto', cls: 'num', render: (r) => U.money(r.expected) },
        { label: 'A receber', cls: 'num', render: (r) => U.money(r.pending) },
      ], s.perPatient) : '<p>Nenhuma receita ou valor previsto neste mês.</p>'}</section>
      <section class="card section"><h3>Receita por produto</h3>${s.byProduct.length ? UI.table([
        { label: 'Produto', render: (r) => `<strong>${esc(r.name)}</strong>` },
        { label: 'Vendas', cls: 'num', render: (r) => r.qty },
        { label: 'Receita', cls: 'num', render: (r) => U.money(r.revenue) },
      ], s.byProduct) : '<p>Nenhuma venda paga neste mês.</p>'}</section>
      <section class="card section"><h3>Despesas pagas por categoria</h3>${cats.length ? UI.table([
        { label: 'Categoria', render: (r) => esc(CP.expenses.cap(r[0])) }, { label: 'Valor', cls: 'num', render: (r) => U.money(r[1]) },
      ], cats) : '<p>Nenhuma despesa paga neste mês.</p>'}</section>
      <section class="card section"><h3>Pendências</h3>
        <p><strong>Pagamentos pendentes (${s.pendingPayments.length}):</strong> ${s.pendingPayments.length ? s.pendingPayments.map((p) => `${esc(nm(p.patientId, p.patientName))} ${U.money(p.value)} (${U.fmtDate(p.date)})`).join('; ') : 'nenhum'}</p>
        <p><strong>Recibos pendentes (${s.receiptsPending.length}):</strong> ${s.receiptsPending.length ? s.receiptsPending.map((p) => `${esc(nm(p.patientId, p.patientName))} ${U.money(p.value)}`).join('; ') : 'nenhum'}</p>
        <p><strong>Carnê-Leão pendente (${s.carnePending.length}):</strong> ${s.carnePending.length ? s.carnePending.map((p) => `${esc(nm(p.patientId, p.patientName))} ${U.money(p.value)}`).join('; ') : 'nenhum'}</p></section>`;
  }

  function yearHtml(y) {
    const s = F.yearSummary(y);
    const stats = [
      ['Faturamento anual', U.money(s.revenue)], ['Despesas anuais', U.money(s.expenses)], ['Lucro anual', U.money(s.profit)],
      ['Média mensal', s.avg == null ? '—' : U.money(s.avg), s.avg == null ? '' : `Sobre ${s.activeMonths} mês(es) com movimento`],
      ['Melhor mês', s.best ? U.money(s.best.received) : '—', s.best ? U.monthLabel(s.best.month) : ''],
      ['Pior mês', s.worst ? U.money(s.worst.received) : '—', s.worst ? U.monthLabel(s.worst.month) : 'Precisa de 2 meses com receita'],
      ['Pacientes atendidas', s.served], ['Sessões realizadas', s.sessions], ['Avaliações', s.evaluations],
      ['Vendas de produtos', s.salesCount, U.money(s.salesRevenue)],
    ];
    return `<div class="grid g-stats">${stats.map(([l, v, sub]) => UI.stat({ label: l, value: v, sub })).join('')}</div>
      <section class="card section"><h3>Mês a mês</h3>${UI.table([
        { label: 'Mês', render: (r) => `<strong>${esc(U.MONTHS[+r.month.slice(5) - 1])}</strong>` },
        { label: 'Recebido', cls: 'num', render: (r) => U.money(r.received) },
        { label: 'Despesas', cls: 'num', render: (r) => U.money(r.expensesPaid) },
        { label: 'Lucro', cls: 'num', render: (r) => U.money(r.profit) },
      ], s.months)}</section>`;
  }

  CP.views.financeiro = {
    render(root) {
      const years = UI.opts.years();
      if (!years.includes(year)) years.push(year);
      root.innerHTML = UI.pageHead('Relatório financeiro', 'Cálculos feitos somente com o que foi registrado.', `<button class="btn soft" id="prt">${UI.icon('print', 18)} Imprimir</button>`) +
        UI.tabs([['mensal', 'Relatório mensal'], ['anual', 'Relatório anual']], tab) +
        `<div style="margin-bottom:18px">${tab === 'mensal' ? UI.monthNav(month) : `<label class="f" style="max-width:180px"><span>Ano</span><select id="ySel">${years.sort().reverse().map((y) => `<option ${y === year ? 'selected' : ''}>${y}</option>`).join('')}</select></label>`}</div><div id="rep"></div>`;
      const rep = root.querySelector('#rep');
      const html = tab === 'mensal' ? monthHtml(month) : yearHtml(year);
      rep.innerHTML = html;
      UI.bindTabs(root, (t) => { tab = t; CP.views.financeiro.render(root); });
      const ys = root.querySelector('#ySel'); if (ys) ys.onchange = () => { year = ys.value; CP.views.financeiro.render(root); };
      root.querySelectorAll('[data-nav]').forEach((b) => b.addEventListener('click', () => { month = U.addMonths(month, Number(b.dataset.nav)); CP.views.financeiro.render(root); }));
      root.querySelector('#prt').onclick = () => {
        const title = tab === 'mensal' ? `Relatório financeiro — ${U.monthLabel(month)}` : `Relatório financeiro anual — ${year}`;
        UI.print(`<div class="report"><h1>${esc(title)}</h1><p>${esc(CP.settings.get('name'))} · ${esc(CP.settings.get('profession'))}${CP.settings.get('crp') ? ' · CRP ' + esc(CP.settings.get('crp')) : ''}</p>${html}<p style="font-size:.8rem;margin-top:18px">Gerado em ${U.fmtDate(U.today())}. Documento administrativo e financeiro.</p></div>`);
      };
    },
  };
})();
