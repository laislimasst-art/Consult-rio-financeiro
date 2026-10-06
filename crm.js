/* Leads (CRM simples) e Follow-up */
(function () {
  'use strict';
  const CP = window.CP, U = CP.U;
  const L = (CP.leads = CP.makeService('leads'));
  const Fu = (CP.followups = CP.makeService('followups'));

  L.ORIGIN = [['instagram', 'Instagram'], ['indicacao', 'Indicação'], ['google', 'Google'], ['whatsapp', 'WhatsApp'], ['outro', 'Outro']];
  L.STATUS = [['novo', 'Novo'], ['conversando', 'Conversando'], ['agendou', 'Agendou avaliação'], ['realizou', 'Realizou avaliação'], ['fechou', 'Fechou terapia'], ['semresposta', 'Não respondeu'], ['nao_fechou', 'Não fechou'], ['depois', 'Acompanhar depois']];
  L.OPEN = ['novo', 'conversando', 'agendou', 'realizou', 'depois'];

  Fu.TYPE = [['antiga', 'Paciente antiga'], ['pausou', 'Paciente que pausou'], ['alta', 'Paciente que recebeu alta'], ['avaliacao', 'Fez avaliação'], ['interesse', 'Demonstrou interesse e não fechou']];
  Fu.STATUS = [['pendente', 'Pendente'], ['contatado', 'Contatado'], ['encerrado', 'Encerrado']];

  /* Contatos para acompanhar hoje (inclui atrasados) */
  Fu.dueToday = () => {
    const t = U.today();
    const followups = Fu.all().filter((x) => x.status === 'pendente' && x.nextContact && x.nextContact <= t);
    const leads = L.all().filter((x) => L.OPEN.includes(x.status) && x.nextContact && x.nextContact <= t);
    return { followups, leads, count: followups.length + leads.length };
  };
})();
