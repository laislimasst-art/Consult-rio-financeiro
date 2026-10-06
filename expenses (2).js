/* Despesas e despesas fixas */
(function () {
  'use strict';
  const CP = window.CP, U = CP.U, UI = CP.UI, esc = U.esc, E = CP.expenses, Fx = CP.fixed, A = CP.actions;
  let tab = 'lanc';
  const f = { month: U.thisMonth(), year: '', category: '', status: '' };

  function expenseForm(x, prefill) {
    UI.form({
      title: x ? 'Editar despesa' : 'Registrar despesa', submitText: x ? 'Salvar alterações' : 'Registrar despesa',
      values: x || { date: U.today(), status: 'pago', periodicity: 'unica', category: 'outros', ...prefill },
      fields: [
        { key: 'name', label: 'Nome', type: 'text', required: true, full: true },
        { key: 'category', label: 'Categoria', type: 'select', options: E.catOptions() },
        { key: 'value', label: 'Valor (R$)', type: 'money', required: true },
        { key: 'date', label: 'Data', type: 'date', required: true },
        { key: 'periodicity', label: 'Periodicidade', type: 'select', options: E.PERIOD },
        { key: 'status', label: 'Status', type: 'select', options: E.STATUS, hint: 'Só despesas “pagas” entram no cálculo do lucro.' },
        { key: 'note', label: 'Observação', type: 'textarea' },
      ],
      extraButtons: x ? [{ label: 'Excluir', cls: 'danger', onClick: (m) => { m.close(); A.deleteExpense(x.id); } }] : [],
      onSubmit: async (v) => {
        if (!(Number(v.value) > 0)) throw new Error('Informe um valor maior que zero.');
        await E.save({ ...(x || {}), ...v, value: Number(v.value) });
        UI.toast(x ? 'Despesa atualizada.' : 'Despesa registrada.'); CP.App.refresh();
      },
    });
  }
  A.newExpense = (prefill) => expenseForm(null, prefill || {});
  A.editExpense = (id) => { const x = E.get(id); if (x) expenseForm(x); };
  A.deleteExpense = async (id) => {
    const ok = await UI.confirm({ title: 'Excluir despesa', message: 'Excluir esta despesa?', confirmText: 'Excluir', danger: true });
    if (!ok) return; await E.remove(id); UI.toast('Despesa excluída.'); CP.App.refresh();
  };

  function fixedForm(x, prefill) {
    UI.form({
      title: x ? 'Editar despesa fixa' : 'Nova despesa fixa', submitText: x ? 'Salvar alterações' : 'Cadastrar',
      values: x || { periodicity: 'mensal', status: 'ativa', category: 'plataformas', ...prefill },
      fields: [
        { key: 'name', label: 'Nome', type: 'text', required: true, full: true, hint: 'Ex.: Claude, Canva, Internet, Hospedagem, Domínio.' },
        { key: 'category', label: 'Categoria', type: 'select', options: E.catOptions() },
        { key: 'value', label: 'Valor (R$)', type: 'money', required: true },
        { key: 'dueDay', label: 'Dia do vencimento', type: 'number', min: 1, max: 31 },
        { key: 'periodicity', label: 'Periodicidade', type: 'select', options: Fx.PERIOD },
        { key: 'dueMonth', label: 'Mês do vencimento (anuais)', type: 'select', options: [['', '—'], ...U.MONTHS.map((m, i) => [i + 1, m])], showIf: (v) => v.periodicity === 'anual' },
        { key: 'status', label: 'Status', type: 'select', options: Fx.STATUS },
      ],
      extraButtons: x ? [{ label: 'Excluir', cls: 'danger', onClick: (m) => { m.close(); A.deleteFixed(x.id); } }] : [],
      onSubmit: async (v) => {
        if (!(Number(v.value) > 0)) throw new Error('Informe um valor maior que zero.');
        if (v.periodicity === 'anual' && !v.dueMonth) throw new Error('Informe o mês de vencimento da despesa anual.');
        await Fx.save({ ...(x || {}), ...v, value: Number(v.value) });
        UI.toast(x ? 'Despesa fixa atualizada.' : 'Despesa fixa cadastrada.'); CP.App.refresh();
      },
    });
  }
  A.newFixed = (prefill) => fixedForm(null, prefill || {});
  A.editFixed = (id) => { const x = Fx.get(id); if (x) fixedForm(x); };
  A.deleteFixed = async (id) => {
    const ok = await UI.confirm({ title: 'Excluir despesa fixa', message: 'Excluir esta despesa fixa? Lançamentos já gerados permanecem.', confirmText: 'Excluir', danger: true });
    if (!ok) return; await Fx.remove(id); UI.toast('Despesa fixa excluída.'); CP.App.refresh();
  };

  function launchTab(root, box) {
    const draw = () => {
      const rows = U.sortBy(E.all().filter((x) => {
        if (f.month && U.monthKey(x.date) !== f.month) return false;
        if (!f.month && f.year && U.yearOf(x.date) !== f.year) return false;
        if (f.category && x.category !== f.category) return false;
        if (f.status && x.status !== f.status) return false;
        return true;
      }), (x) => x.date, -1);
      const paid = U.sum(rows.filter((x) => x.status === 'pago'), (x) => x.value), pend = U.sum(rows.filter((x) => x.status === 'pendente'), (x) => x.value);
      box.querySelector('#elist').innerHTML = rows.length ? `<div class="sum-strip"><span>Pagas: <b>${U.money(paid)}</b></span><span>Pendentes: <b>${U.money(pend)}</b></span><span>${rows.length} lançamento(s)</span></div>` + UI.table([
        { label: 'Data', render: (x) => U.fmtDate(x.date) },
        { label: 'Nome', render: (x) => `<strong>${esc(x.name)}</strong>` },
        { label: 'Categoria', render: (x) => esc(E.cap(x.category)) },
        { label: 'Periodicidade', render: (x) => esc(UI.labelOf(E.PERIOD, x.periodicity)) },
        { label: 'Valor', cls: 'num', render: (x) => U.money(x.value) },
        { label: 'Status', render: (x) => UI.sb(x.status, UI.labelOf(E.STATUS, x.status)) },
        { label: '', cls: 'act', render: (x) => UI.actions([
          ...(x.status === 'pendente' ? [{ act: 'ex-pay', id: x.id, icon: 'check', label: 'Marcar como paga' }] : []),
          { act: 'ex-dup', id: x.id, icon: 'copy', label: 'Duplicar para o próximo mês' },
          { act: 'ex-edit', id: x.id, icon: 'edit', label: 'Editar' }, { act: 'ex-del', id: x.id, icon: 'trash', label: 'Excluir', danger: true }]) },
      ], rows) : UI.empty({ icon: 'tag', title: 'Nenhuma despesa neste filtro', text: 'Registre uma despesa ou lance as despesas fixas do mês.', action: '<button class="btn soft" data-act="ex-new">+ Despesa</button>' });
    };
    box.innerHTML = `${UI.filters([
      { key: 'month', label: 'Mês', type: 'month' }, { key: 'year', label: 'Ano', options: UI.opts.list(UI.opts.years().map((y) => [y, y]), 'Todos') },
      { key: 'category', label: 'Categoria', options: UI.opts.list(E.catOptions(), 'Todas') }, { key: 'status', label: 'Status', options: UI.opts.list(E.STATUS, 'Todos') },
    ], f)}<div id="elist"></div>`;
    draw();
    UI.bindFilters(box, f, draw);
    UI.delegate(box, async (act, id) => {
      const x = E.get(id);
      if (act === 'ex-new') A.newExpense();
      else if (act === 'ex-edit') A.editExpense(id);
      else if (act === 'ex-del') A.deleteExpense(id);
      else if (act === 'ex-pay' && x) { await E.save({ ...x, status: 'pago' }); UI.toast('Despesa marcada como paga.'); CP.App.refresh(); }
      else if (act === 'ex-dup' && x) { const d = U.addMonths(U.monthKey(x.date), 1); const day = Math.min(+x.date.slice(8, 10), U.daysInMonth(d)); await E.save({ ...x, id: undefined, createdAt: undefined, date: `${d}-${U.pad(day)}`, status: 'pendente' }); UI.toast('Despesa duplicada para o próximo mês.'); CP.App.refresh(); }
    });
  }

  function fixedTab(box) {
    const list = U.sortBy(Fx.all(), (x) => U.norm(x.name));
    const m = f.month || U.thisMonth();
    const monthly = U.sum(list.filter((x) => x.status === 'ativa' && x.periodicity === 'mensal'), (x) => x.value);
    const have = Fx.PRESETS.map((n) => n);
    box.innerHTML = `<section class="card"><div class="card-head"><h3>Despesas fixas</h3><div class="head-actions"><button class="btn soft sm" data-act="fx-gen">Lançar fixas de ${esc(U.monthLabel(m))}</button><button class="btn primary sm" data-act="fx-new">${UI.icon('plus', 16)} Despesa fixa</button></div></div>
      <div class="sum-strip"><span>Total mensal das fixas ativas: <b>${U.money(monthly)}</b></span></div>
      <p style="margin:0 0 12px">Cadastro rápido: ${have.map((n) => `<button class="btn ghost sm" data-act="fx-preset" data-id="${esc(n)}">${esc(n)}</button>`).join(' ')}</p>
      ${list.length ? UI.table([
        { label: 'Nome', render: (x) => `<strong>${esc(x.name)}</strong>` }, { label: 'Categoria', render: (x) => esc(E.cap(x.category)) },
        { label: 'Valor', cls: 'num', render: (x) => U.money(x.value) },
        { label: 'Vencimento', render: (x) => (x.dueDay ? `Dia ${x.dueDay}${x.periodicity === 'anual' && x.dueMonth ? ' de ' + U.MONTHS[x.dueMonth - 1] : ''}` : '—') },
        { label: 'Periodicidade', render: (x) => esc(UI.labelOf(Fx.PERIOD, x.periodicity)) },
        { label: 'Status', render: (x) => UI.sb(x.status === 'ativa' ? 'ativa' : 'inativa', UI.labelOf(Fx.STATUS, x.status)) },
        { label: '', cls: 'act', render: (x) => UI.actions([{ act: 'fx-edit', id: x.id, icon: 'edit', label: 'Editar' }, { act: 'fx-del', id: x.id, icon: 'trash', label: 'Excluir', danger: true }]) },
      ], list) : UI.empty({ icon: 'tag', title: 'Nenhuma despesa fixa cadastrada', text: 'Cadastre assinaturas e contas recorrentes. Depois lance-as no mês com um clique.' })}</section>`;
    UI.delegate(box, async (act, id) => {
      if (act === 'fx-new') A.newFixed();
      else if (act === 'fx-preset') A.newFixed({ name: id });
      else if (act === 'fx-edit') A.editFixed(id);
      else if (act === 'fx-del') A.deleteFixed(id);
      else if (act === 'fx-gen') { const n = await Fx.generate(m); UI.toast(n ? `${n} despesa(s) lançada(s) como pendente(s).` : 'Nenhuma despesa nova para lançar neste mês.'); CP.App.refresh(); }
    });
  }

  CP.views.despesas = {
    render(root) {
      root.innerHTML = UI.pageHead('Despesas', 'Controle de gastos do consultório.', `<button class="btn primary" id="newEx">${UI.icon('plus', 18)} Despesa</button>`) +
        UI.tabs([['lanc', 'Lançamentos', E.all().length], ['fixas', 'Despesas fixas', Fx.all().length]], tab) + '<div id="box"></div>';
      const box = root.querySelector('#box');
      if (tab === 'lanc') launchTab(root, box); else fixedTab(box);
      UI.bindTabs(root, (t) => { tab = t; CP.views.despesas.render(root); });
      root.querySelector('#newEx').onclick = () => (tab === 'fixas' ? A.newFixed() : A.newExpense());
    },
  };
})();
