/* Despesas e despesas fixas */
(function () {
  'use strict';
  const CP = window.CP, U = CP.U;
  const E = (CP.expenses = CP.makeService('expenses'));
  const Fx = (CP.fixed = CP.makeService('fixedExpenses'));

  E.PERIOD = [['unica', 'Única'], ['mensal', 'Mensal'], ['anual', 'Anual'], ['semanal', 'Semanal']];
  E.STATUS = [['pago', 'Pago'], ['pendente', 'Pendente']];
  E.categories = () => CP.settings.get('expenseCategories') || [];
  E.cap = (c) => (c ? c.charAt(0).toUpperCase() + c.slice(1) : '—');
  E.catOptions = () => E.categories().map((c) => [c, E.cap(c)]);

  Fx.PERIOD = [['mensal', 'Mensal'], ['anual', 'Anual']];
  Fx.STATUS = [['ativa', 'Ativa'], ['inativa', 'Inativa']];
  Fx.PRESETS = ['Claude', 'Canva', 'Internet', 'Hospedagem', 'Domínio'];

  /* Lança no mês as despesas fixas ativas que ainda não foram lançadas (status pendente) */
  Fx.generate = async (month) => {
    let n = 0;
    for (const f of Fx.all()) {
      if (f.status !== 'ativa') continue;
      if (f.periodicity === 'anual' && Number(f.dueMonth) !== Number(month.slice(5, 7))) continue;
      if (E.all().some((e) => e.fixedId === f.id && U.monthKey(e.date) === month)) continue;
      const day = Math.min(Math.max(1, Number(f.dueDay) || 1), U.daysInMonth(month));
      await E.save({ name: f.name, category: f.category || 'outros', value: f.value, date: `${month}-${U.pad(day)}`, periodicity: f.periodicity, status: 'pendente', fixedId: f.id, note: 'Lançada a partir das despesas fixas' });
      n++;
    }
    return n;
  };
})();
