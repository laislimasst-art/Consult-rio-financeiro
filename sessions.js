/* Sessões (controle administrativo de presença/pacote) e agenda */
(function () {
  'use strict';
  const CP = window.CP, U = CP.U;
  const S = (CP.sessions = CP.makeService('sessions'));
  S.STATUS = [['agendada', 'Agendada'], ['realizada', 'Realizada'], ['cancelada', 'Cancelada'], ['remarcada', 'Remarcada']];
  S.forPatient = (id) => S.all().filter((s) => s.patientId === id);

  /* Pacote mensal de um paciente num mês: slots 1..N */
  S.pkg = (patientId, month) => {
    const p = CP.patients.get(patientId);
    const size = Number(p && p.packageSize) || 4;
    const list = S.all().filter((s) => s.patientId === patientId && s.slot && (s.month || U.monthKey(s.date)) === month);
    const slots = [];
    for (let i = 1; i <= size; i++) slots.push({ n: i, session: list.find((s) => Number(s.slot) === i) || null });
    return { size, slots, done: list.filter((s) => s.status === 'realizada').length, paid: CP.payments.pkgPaid(patientId, month) };
  };

  /* ---------- Eventos manuais e agregação da agenda ---------- */
  const E = (CP.events = CP.makeService('events'));
  E.TYPES = [['sessao', 'Sessão'], ['pagamento', 'Pagamento'], ['avaliacao', 'Avaliação'], ['vencimento', 'Vencimento'], ['followup', 'Follow-up']];
  const A = (CP.agenda = {});
  A.COLORS = { sessao: '#6E3F45', pagamento: '#B26D70', avaliacao: '#C98F94', vencimento: '#5D5555', followup: '#9C7A7E' };

  A.items = (date) => {
    const items = [];
    const nm = CP.patients.name;
    S.all().filter((s) => s.date === date).forEach((s) => items.push({ src: 'session', id: s.id, type: 'sessao', title: `Sessão — ${nm(s.patientId, s.patientName)}`, time: s.time || '', status: s.status }));
    E.all().filter((e) => e.date === date).forEach((e) => items.push({ src: 'event', id: e.id, type: e.type, title: e.title || U_label(e.type), time: e.time || '' }));
    CP.payments.all().filter((p) => p.date === date && (p.status === 'pendente' || p.status === 'parcial')).forEach((p) => items.push({ src: 'payment', id: p.id, type: 'pagamento', title: `A receber — ${nm(p.patientId, p.patientName)} (${U.money(p.value)})`, time: '' }));
    CP.patients.all().filter((p) => p.evaluationDate === date).forEach((p) => items.push({ src: 'patient', id: p.id, type: 'avaliacao', title: `Avaliação — ${p.name}`, time: '' }));
    CP.expenses.all().filter((x) => x.date === date && x.status === 'pendente').forEach((x) => items.push({ src: 'expense', id: x.id, type: 'vencimento', title: `Vence: ${x.name} (${U.money(x.value)})`, time: '' }));
    CP.followups.all().filter((f) => f.nextContact === date && f.status === 'pendente').forEach((f) => items.push({ src: 'followup', id: f.id, type: 'followup', title: `Follow-up — ${f.name}`, time: '' }));
    CP.leads.all().filter((l) => l.nextContact === date && CP.leads.OPEN.includes(l.status)).forEach((l) => items.push({ src: 'lead', id: l.id, type: 'followup', title: `Lead — ${l.name}`, time: '' }));
    return items.sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
  };
  function U_label(t) { return (E.TYPES.find((x) => x[0] === t) || [, 'Evento'])[1]; }
  A.monthMap = (month) => {
    const map = {};
    for (let d = 1; d <= U.daysInMonth(month); d++) { const date = `${month}-${U.pad(d)}`; map[date] = A.items(date); }
    return map;
  };
})();
