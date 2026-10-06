/* Metas e conquistas */
(function () {
  'use strict';
  const CP = window.CP;
  const G = (CP.goals = CP.makeService('goals'));
  const A = (CP.achievements = CP.makeService('achievements'));
  G.CAT = [['financeira', 'Financeira'], ['pacientes', 'Pacientes'], ['produtos', 'Produtos'], ['conteudo', 'Conteúdo'], ['pessoal', 'Pessoal'], ['outra', 'Outra']];
  G.STATUS = [['andamento', 'Em andamento'], ['concluida', 'Concluída'], ['pausada', 'Pausada']];
  G.UNIT = [['money', 'Valor em R$'], ['count', 'Quantidade']];
  G.pct = (g) => (Number(g.target) > 0 ? Math.min(100, Math.round((Number(g.current) || 0) / Number(g.target) * 100)) : 0);
  G.fmt = (g, v) => (g.unit === 'count' ? String(Number(v) || 0) : CP.U.money(v));
  void A;
})();
