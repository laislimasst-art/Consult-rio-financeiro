/*
 * Regras financeiras (todas reais, nada inventado):
 *  - Receita recebida  = SOMENTE pagamentos com status "pago" (+ vendas pagas).
 *  - Receita prevista  = valores esperados das pacientes/pacotes no mês (+ produtos já lançados).
 *  - A receber         = prevista − recebida (nunca negativo).
 *  - Lucro             = recebida − despesas com status "pago".
 */
(function () {
  'use strict';
  const CP = window.CP, U = CP.U;
  const F = (CP.finance = {});

  /* Valor esperado de uma paciente no mês */
  F.expectedForPatient = (p, m) => {
    const live = ['ativa', 'nova'].includes(p.status) || (p.exitDate && U.monthKey(p.exitDate) >= m);
    if (!live) return 0;
    let exp = 0;
    const started = !p.startDate || U.monthKey(p.startDate) <= m;
    const exited = p.exitDate && U.monthKey(p.exitDate) < m;
    if (started && !exited) {
      if (p.paymentModel === 'pacote_mensal') exp += (Number(p.packageSize) || 0) * (Number(p.sessionValue) || 0);
      else {
        // semanal/quinzenal/por sessão: só conta sessões já agendadas/realizadas na agenda
        const n = CP.sessions.all().filter((s) => s.patientId === p.id && U.monthKey(s.date) === m && ['agendada', 'realizada'].includes(s.status)).length;
        exp += n * (Number(p.sessionValue) || 0);
      }
    }
    if (p.evaluationDate && U.monthKey(p.evaluationDate) === m) exp += Number(p.evaluationValue) || 0;
    return exp;
  };

  F.monthSummary = (m) => {
    const pays = CP.payments.all().filter((x) => U.monthKey(x.date) === m);
    const paid = pays.filter((x) => x.status === 'pago');
    const pend = pays.filter((x) => x.status === 'pendente' || x.status === 'parcial');
    const sales = CP.sales.all().filter((x) => U.monthKey(x.date) === m);
    const salesPaid = sales.filter((x) => x.status === 'pago');
    const salesPend = sales.filter((x) => x.status === 'pendente');
    const patPaid = paid.filter((x) => x.refType !== 'produto');
    const prodPaidPay = paid.filter((x) => x.refType === 'produto');
    const patientRevenue = U.sum(patPaid, (x) => x.value);
    const productRevenue = U.sum(salesPaid, (x) => x.value) + U.sum(prodPaidPay, (x) => x.value);
    const received = patientRevenue + productRevenue;

    // Previsto por paciente
    const perPatient = [];
    let expectedPatients = 0;
    CP.patients.all().forEach((p) => {
      const paidP = U.sum(patPaid.filter((x) => x.patientId === p.id), (x) => x.value);
      const pendP = U.sum(pend.filter((x) => x.patientId === p.id && x.refType !== 'produto'), (x) => x.value);
      const exp = Math.max(F.expectedForPatient(p, m), paidP + pendP);
      if (exp > 0 || paidP > 0) perPatient.push({ id: p.id, name: p.name, expected: exp, paid: paidP, pending: Math.max(0, exp - paidP) });
      expectedPatients += exp;
    });
    const knownIds = new Set(CP.patients.all().map((p) => p.id));
    const orphanPaid = U.sum(patPaid.filter((x) => !knownIds.has(x.patientId)), (x) => x.value);
    const orphanPend = U.sum(pend.filter((x) => !knownIds.has(x.patientId) && x.refType !== 'produto'), (x) => x.value);
    if (orphanPaid + orphanPend > 0) { perPatient.push({ id: '', name: 'Sem paciente cadastrada', expected: orphanPaid + orphanPend, paid: orphanPaid, pending: orphanPend }); expectedPatients += orphanPaid + orphanPend; }

    const productPending = U.sum(salesPend, (x) => x.value) + U.sum(pend.filter((x) => x.refType === 'produto'), (x) => x.value);
    const expected = expectedPatients + productRevenue + productPending;
    const toReceive = Math.max(0, expected - received);

    const exps = CP.expenses.all().filter((x) => U.monthKey(x.date) === m);
    const expensesPaid = U.sum(exps.filter((x) => x.status === 'pago'), (x) => x.value);
    const expensesPending = U.sum(exps.filter((x) => x.status === 'pendente'), (x) => x.value);

    const done = CP.sessions.all().filter((s) => s.status === 'realizada' && U.monthKey(s.date) === m);
    const served = new Set([...done.map((s) => s.patientId), ...patPaid.map((x) => x.patientId)].filter(Boolean));
    const payers = new Set(patPaid.map((x) => x.patientId).filter(Boolean));
    const payerRevenue = U.sum(patPaid.filter((x) => x.patientId), (x) => x.value);

    // Receita por produto
    const byProduct = {};
    salesPaid.forEach((s) => { const k = s.productId || '_'; byProduct[k] = byProduct[k] || { name: (CP.products.get(s.productId) || {}).name || 'Produto removido', qty: 0, revenue: 0 }; byProduct[k].qty++; byProduct[k].revenue += Number(s.value) || 0; });
    if (prodPaidPay.length) byProduct._pay = { name: 'Pagamentos “referente a produto”', qty: prodPaidPay.length, revenue: U.sum(prodPaidPay, (x) => x.value) };

    // Despesas por categoria
    const byCategory = {};
    exps.filter((x) => x.status === 'pago').forEach((x) => { byCategory[x.category || 'outros'] = (byCategory[x.category || 'outros'] || 0) + (Number(x.value) || 0); });

    return {
      month: m, received, patientRevenue, productRevenue, expected, toReceive,
      expensesPaid, expensesPending, profit: received - expensesPaid,
      sessionsDone: done.length, servedCount: served.size,
      ticket: payers.size ? payerRevenue / payers.size : null,
      perPatient: U.sortBy(perPatient, (x) => x.paid, -1),
      byProduct: Object.values(byProduct), byCategory,
      pendingPayments: pend, receiptsPending: paid.filter((x) => !x.receiptIssued), carnePending: paid.filter((x) => !x.carneLeao),
      newPatients: CP.patients.all().filter((p) => U.monthKey(p.startDate) === m).length,
      exits: CP.patients.all().filter((p) => U.monthKey(p.exitDate) === m).length,
      newLeads: CP.leads.all().filter((l) => (l.firstContact ? U.monthKey(l.firstContact) : U.monthKey(l.createdAt)) === m).length,
      hasData: received > 0 || expensesPaid > 0 || done.length > 0 || expected > 0,
    };
  };

  F.yearSummary = (year) => {
    const months = [];
    for (let i = 1; i <= 12; i++) months.push(F.monthSummary(`${year}-${U.pad(i)}`));
    const revenue = U.sum(months, (x) => x.received);
    const expenses = U.sum(months, (x) => x.expensesPaid);
    const active = months.filter((x) => x.received > 0 || x.expensesPaid > 0);
    const withRev = months.filter((x) => x.received > 0);
    const best = withRev.length ? withRev.reduce((a, b) => (b.received > a.received ? b : a)) : null;
    const worst = withRev.length > 1 ? withRev.reduce((a, b) => (b.received < a.received ? b : a)) : null;
    const served = new Set();
    CP.sessions.all().filter((s) => s.status === 'realizada' && U.yearOf(s.date) === year).forEach((s) => s.patientId && served.add(s.patientId));
    CP.payments.all().filter((p) => p.status === 'pago' && p.refType !== 'produto' && U.yearOf(p.date) === year).forEach((p) => p.patientId && served.add(p.patientId));
    const salesPaid = CP.sales.all().filter((s) => s.status === 'pago' && U.yearOf(s.date) === year);
    return {
      year, months, revenue, expenses, profit: revenue - expenses,
      avg: active.length ? revenue / active.length : null, activeMonths: active.length, best, worst,
      served: served.size,
      sessions: U.sum(months, (x) => x.sessionsDone),
      evaluations: CP.patients.all().filter((p) => U.yearOf(p.evaluationDate) === year).length,
      salesCount: salesPaid.length, salesRevenue: U.sum(salesPaid, (s) => s.value),
    };
  };
})();
