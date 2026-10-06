/* Produtos digitais e vendas */
(function () {
  'use strict';
  const CP = window.CP, U = CP.U;
  const P = (CP.products = CP.makeService('products'));
  const S = (CP.sales = CP.makeService('sales'));
  P.STATUS = [['ativo', 'Ativo'], ['inativo', 'Inativo']];
  S.STATUS = [['pago', 'Pago'], ['pendente', 'Pendente'], ['reembolsado', 'Reembolsado']];

  /* Lucro = receita das vendas pagas − custo unitário × quantidade vendida */
  P.stats = (id, month) => {
    const list = S.all().filter((s) => s.status === 'pago' && (!id || s.productId === id) && (!month || U.monthKey(s.date) === month));
    const revenue = U.sum(list, (s) => s.value);
    const cost = U.sum(list, (s) => { const p = P.get(s.productId); return p ? p.cost : 0; });
    return { qty: list.length, revenue, profit: revenue - cost };
  };
})();
