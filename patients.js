/* Serviço de pacientes (somente dados administrativos — nunca clínicos) */
(function () {
  'use strict';
  const CP = window.CP, U = CP.U;
  const P = (CP.patients = CP.makeService('patients'));

  P.NOTICE = 'Este sistema é exclusivamente administrativo e financeiro. Não armazene informações clínicas ou dados sensíveis de pacientes.';
  P.STATUS = [['ativa', 'Ativa'], ['nova', 'Nova'], ['inativa', 'Inativa'], ['antiga', 'Antiga']];
  P.MODEL = [['semanal', 'Semanal'], ['quinzenal', 'Quinzenal'], ['por_sessao', 'Por sessão'], ['pacote_mensal', 'Pacote mensal']];
  P.FREQ = [['semanal', 'Semanal'], ['quinzenal', 'Quinzenal'], ['mensal', 'Mensal'], ['outra', 'Outra']];

  P.name = (id, snapshot) => { const p = id && P.get(id); return p ? p.name : snapshot || '—'; };

  P.fields = () => [
    { key: 'name', label: 'Nome', type: 'text', required: true, full: true },
    { key: 'status', label: 'Status', type: 'select', options: P.STATUS },
    { key: 'phone', label: 'Telefone', type: 'tel' },
    { key: 'email', label: 'E-mail', type: 'email' },
    { type: 'section', label: 'Avaliação e início' },
    { key: 'evaluationDate', label: 'Data da avaliação', type: 'date' },
    { key: 'evaluationValue', label: 'Valor da avaliação (R$)', type: 'money' },
    { key: 'startDate', label: 'Data de início', type: 'date' },
    { key: 'exitDate', label: 'Data de saída', type: 'date', hint: 'Preencha somente se o acompanhamento foi encerrado.' },
    { type: 'section', label: 'Cobrança e atendimento' },
    { key: 'paymentModel', label: 'Modalidade de cobrança', type: 'select', options: [['', '—'], ...P.MODEL] },
    { key: 'sessionValue', label: 'Valor da sessão (R$)', type: 'money' },
    { key: 'packageSize', label: 'Nº de sessões do pacote', type: 'number', min: 1, max: 8, showIf: (v) => v.paymentModel === 'pacote_mensal' },
    { key: 'paymentMethod', label: 'Forma de pagamento', type: 'select', options: [['', '—'], ...CP.payments.METHODS] },
    { key: 'frequency', label: 'Frequência', type: 'select', options: [['', '—'], ...P.FREQ] },
    { key: 'sessionDay', label: 'Dia da sessão', type: 'select', options: [['', '—'], ...U.WEEKDAYS] },
    { key: 'sessionTime', label: 'Horário', type: 'time' },
    { key: 'nextPaymentDate', label: 'Próximo pagamento (previsto)', type: 'date' },
    { type: 'section', label: 'Observações' },
    { key: 'notes', label: 'Observações administrativas', type: 'textarea', hint: 'Apenas informações administrativas. Sem diagnóstico, conteúdo de sessão ou dados clínicos.' },
  ];

  /* Indicadores derivados (nada é inventado: só o que foi registrado) */
  P.stats = (id, month) => {
    month = month || U.thisMonth();
    const today = U.today();
    const pays = CP.payments.all().filter((x) => x.patientId === id);
    const paid = pays.filter((x) => x.status === 'pago');
    const pend = pays.filter((x) => x.status === 'pendente' || x.status === 'parcial');
    const sess = CP.sessions.all().filter((x) => x.patientId === id);
    const done = sess.filter((s) => s.status === 'realizada').map((s) => s.date).sort();
    const fut = sess.filter((s) => s.status === 'agendada' && s.date >= today).map((s) => s.date).sort();
    const lastPay = paid.map((x) => x.date).sort().pop() || '';
    const pendDates = pend.map((x) => x.date).filter(Boolean).sort();
    const p = P.get(id) || {};
    return {
      lastSession: done.pop() || '',
      nextSession: fut[0] || '',
      lastPayment: lastPay,
      nextPayment: pendDates[0] || p.nextPaymentDate || '',
      receivedMonth: U.sum(paid.filter((x) => U.monthKey(x.date) === month), (x) => x.value),
      pendingValue: U.sum(pend, (x) => x.value),
      pendingCount: pend.length,
    };
  };

  /* Pacientes iniciais — SOMENTE os dados informados. Horários, dias e pagamentos ficam vazios. */
  P.seedData = () => [
    { name: 'Larissa', status: 'ativa', startDate: '2026-02-27', paymentModel: 'semanal', sessionValue: 50 },
    { name: 'Andreza', status: 'ativa', evaluationDate: '2026-05-28', evaluationValue: 120, startDate: '2026-06-11', paymentModel: 'pacote_mensal', packageSize: 4, sessionValue: 120 },
    { name: 'Ádila', status: 'ativa', evaluationDate: '2026-08-10', evaluationValue: 170, startDate: '2026-08-17', paymentModel: 'pacote_mensal', packageSize: 4, sessionValue: 150 },
    { name: 'Caroline', status: 'ativa', evaluationDate: '2026-08-17', evaluationValue: 150, startDate: '2026-08-24', paymentModel: 'pacote_mensal', packageSize: 4, sessionValue: 130 },
  ];
  P.seed = async () => { for (const d of P.seedData()) await P.save(d); };
})();
