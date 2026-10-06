/* Pagamentos, recibos e controle do Carnê-Leão */
(function () {
  'use strict';
  const CP = window.CP, U = CP.U;
  const Pay = (CP.payments = CP.makeService('payments'));

  Pay.REF = [['sessao', 'Sessão'], ['pacote', 'Pacote'], ['avaliacao', 'Avaliação'], ['produto', 'Produto'], ['outro', 'Outro']];
  Pay.METHODS = [['pix', 'Pix'], ['cartao', 'Cartão'], ['dinheiro', 'Dinheiro'], ['transferencia', 'Transferência'], ['outro', 'Outro']];
  Pay.STATUS = [['pago', 'Pago'], ['pendente', 'Pendente'], ['parcial', 'Parcial'], ['estornado', 'Estornado']];

  Pay.forPatient = (id) => Pay.all().filter((p) => p.patientId === id);
  Pay.totals = (patientId, month, year) => {
    const list = Pay.forPatient(patientId);
    const paid = list.filter((p) => p.status === 'pago');
    const pend = list.filter((p) => p.status === 'pendente' || p.status === 'parcial');
    return {
      month: U.sum(paid.filter((p) => U.monthKey(p.date) === month), (p) => p.value),
      year: U.sum(paid.filter((p) => U.yearOf(p.date) === year), (p) => p.value),
      count: paid.length,
      countMonth: paid.filter((p) => U.monthKey(p.date) === month).length,
      pendingValue: U.sum(pend, (p) => p.value),
      pendingCount: pend.length,
    };
  };
  Pay.awaitingReceipt = () => Pay.all().filter((p) => p.status === 'pago' && !p.receiptIssued);
  Pay.awaitingCarne = () => Pay.all().filter((p) => p.status === 'pago' && !p.carneLeao);
  Pay.pkgPaid = (patientId, month) => Pay.all().some((p) => p.patientId === patientId && p.refType === 'pacote' && p.status === 'pago' && (p.refMonth || U.monthKey(p.date)) === month);
  Pay.defaultValue = (patientId, refType) => {
    const p = patientId && CP.patients.get(patientId);
    if (!p) return null;
    if (refType === 'sessao') return p.sessionValue || null;
    if (refType === 'pacote') return (p.packageSize || 4) * (p.sessionValue || 0) || null;
    if (refType === 'avaliacao') return p.evaluationValue || null;
    return null;
  };

  /* ---------- Recibos ---------- */
  const Rc = (CP.receipts = CP.makeService('receipts'));
  Rc.nextNumber = () => {
    const y = new Date().getFullYear();
    const max = Rc.all().filter((r) => String(r.number).endsWith('/' + y)).reduce((m, r) => Math.max(m, parseInt(r.number, 10) || 0), 0);
    return String(max + 1).padStart(4, '0') + '/' + y;
  };
  Rc.defaultDescription = (pay) => {
    if (!pay) return 'Serviços de psicologia';
    if (pay.refType === 'pacote') return `Pacote mensal de sessões de psicoterapia (${U.monthLabel(pay.refMonth || U.monthKey(pay.date))})`;
    if (pay.refType === 'avaliacao') return 'Avaliação psicológica';
    if (pay.refType === 'sessao') return 'Sessão de psicoterapia';
    return 'Serviços de psicologia';
  };
  Rc.issue = async (data) => {
    const rec = await Rc.save({ ...data, number: data.number || Rc.nextNumber(), issueDate: data.issueDate || U.today() });
    if (rec.paymentId) {
      const p = Pay.get(rec.paymentId);
      if (p) await Pay.save({ ...p, receiptIssued: true, receiptDate: rec.issueDate });
    }
    return rec;
  };
  Rc.removeWithUnlink = async (id) => {
    const r = Rc.get(id);
    await Rc.remove(id);
    if (r && r.paymentId) {
      const p = Pay.get(r.paymentId);
      if (p && !Rc.all().some((x) => x.paymentId === p.id)) await Pay.save({ ...p, receiptIssued: false, receiptDate: '' });
    }
  };
})();
