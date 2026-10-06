/* Produtos e vendas */
(function () {
  'use strict';
  const CP = window.CP, U = CP.U, UI = CP.UI, esc = U.esc, P = CP.products, S = CP.sales, A = CP.actions;
  let tab = 'prod';
  const sf = { month: '', product: '', status: '' };

  function productForm(p) {
    UI.form({
      title: p ? 'Editar produto' : 'Novo produto', submitText: p ? 'Salvar alterações' : 'Cadastrar produto', values: p || { status: 'ativo' },
      fields: [
        { key: 'name', label: 'Nome', type: 'text', required: true, full: true },
        { key: 'description', label: 'Descrição', type: 'textarea' },
        { key: 'price', label: 'Preço (R$)', type: 'money', required: true },
        { key: 'cost', label: 'Custo (R$)', type: 'money', hint: 'Custo por unidade vendida (opcional).' },
        { key: 'link', label: 'Link de venda', type: 'url', placeholder: 'https://', full: true },
        { key: 'status', label: 'Status', type: 'select', options: P.STATUS },
      ],
      extraButtons: p ? [{ label: 'Excluir', cls: 'danger', onClick: (m) => { m.close(); A.deleteProduct(p.id); } }] : [],
      onSubmit: async (v) => { await P.save({ ...(p || {}), ...v, price: Number(v.price) || 0, cost: Number(v.cost) || 0 }); UI.toast(p ? 'Produto atualizado.' : 'Produto cadastrado.'); CP.App.refresh(); },
    });
  }
  A.newProduct = () => productForm(null);
  A.editProduct = (id) => { const p = P.get(id); if (p) productForm(p); };
  A.deleteProduct = async (id) => {
    const ok = await UI.confirm({ title: 'Excluir produto', message: 'Excluir este produto? As vendas já registradas permanecem.', confirmText: 'Excluir', danger: true });
    if (!ok) return; await P.remove(id); UI.toast('Produto excluído.'); CP.App.refresh();
  };

  function saleForm(s, prefill) {
    if (!P.all().length) { UI.toast('Cadastre um produto antes de registrar uma venda.', 'err'); return A.newProduct(); }
    let auto = null;
    const vals = s || { date: U.today(), status: 'pago', method: 'pix', ...prefill };
    if (!s && vals.productId && vals.value == null) { const pr = P.get(vals.productId); if (pr) { vals.value = pr.price; auto = pr.price; } }
    UI.form({
      title: s ? 'Editar venda' : 'Registrar venda', submitText: s ? 'Salvar alterações' : 'Registrar venda', values: vals,
      fields: [
        { key: 'date', label: 'Data', type: 'date', required: true },
        { key: 'productId', label: 'Produto', type: 'select', required: true, options: [['', '— selecione —'], ...P.all().map((p) => [p.id, p.name])] },
        { key: 'client', label: 'Cliente', type: 'text' },
        { key: 'value', label: 'Valor (R$)', type: 'money', required: true },
        { key: 'method', label: 'Forma de pagamento', type: 'select', options: CP.payments.METHODS },
        { key: 'status', label: 'Status', type: 'select', options: S.STATUS },
      ],
      onChange: (k, v, set) => { if (k === 'productId') { const p = P.get(v.productId); if (p && (v.value == null || v.value === auto)) { set('value', p.price); auto = p.price; } } },
      extraButtons: s ? [{ label: 'Excluir', cls: 'danger', onClick: (m) => { m.close(); A.deleteSale(s.id); } }] : [],
      onSubmit: async (v) => { if (!(Number(v.value) > 0)) throw new Error('Informe um valor maior que zero.'); await S.save({ ...(s || {}), ...v, value: Number(v.value) }); UI.toast(s ? 'Venda atualizada.' : 'Venda registrada com sucesso.'); CP.App.refresh(); },
    });
  }
  A.newSale = (prefill) => saleForm(null, prefill || {});
  A.editSale = (id) => { const s = S.get(id); if (s) saleForm(s); };
  A.deleteSale = async (id) => {
    const ok = await UI.confirm({ title: 'Excluir venda', message: 'Excluir esta venda?', confirmText: 'Excluir', danger: true });
    if (!ok) return; await S.remove(id); UI.toast('Venda excluída.'); CP.App.refresh();
  };

  CP.views.produtos = {
    render(root) {
      const tot = P.stats(), mon = P.stats(null, U.thisMonth());
      root.innerHTML = UI.pageHead('Produtos', 'Ebooks e outros produtos digitais.', `<button class="btn soft" data-act="new-sale">${UI.icon('plus', 18)} Venda</button><button class="btn primary" data-act="new-prod">${UI.icon('plus', 18)} Produto</button>`) +
        `<div class="grid g-stats">${UI.stat({ label: 'Quantidade vendida', value: tot.qty, sub: `${mon.qty} no mês atual` })}${UI.stat({ label: 'Receita', value: U.money(tot.revenue), sub: `${U.money(mon.revenue)} no mês atual` })}${UI.stat({ label: 'Lucro', value: U.money(tot.profit), sub: 'Receita − custo das vendas pagas' })}</div>` +
        `<div class="section">${UI.tabs([['prod', 'Produtos', P.all().length], ['vend', 'Vendas', S.all().length]], tab)}<div id="box"></div></div>`;
      const box = root.querySelector('#box');
      if (tab === 'prod') {
        const list = U.sortBy(P.all(), (p) => U.norm(p.name));
        box.innerHTML = list.length ? `<section class="card">${UI.table([
          { label: 'Produto', render: (p) => `<strong>${esc(p.name)}</strong>${p.description ? `<br><small>${esc(p.description)}</small>` : ''}` },
          { label: 'Preço', cls: 'num', render: (p) => U.money(p.price) }, { label: 'Custo', cls: 'num', render: (p) => U.money(p.cost) },
          { label: 'Vendidos', cls: 'num', render: (p) => P.stats(p.id).qty }, { label: 'Receita', cls: 'num', render: (p) => U.money(P.stats(p.id).revenue) },
          { label: 'Lucro', cls: 'num', render: (p) => U.money(P.stats(p.id).profit) },
          { label: 'Link', render: (p) => (p.link ? `<a class="link-out" href="${esc(p.link)}" target="_blank" rel="noopener">${UI.icon('link', 15)} Abrir</a>` : '—') },
          { label: 'Status', render: (p) => UI.sb(p.status, UI.labelOf(P.STATUS, p.status)) },
          { label: '', cls: 'act', render: (p) => UI.actions([{ act: 'p-sale', id: p.id, icon: 'plus', label: 'Registrar venda' }, { act: 'p-edit', id: p.id, icon: 'edit', label: 'Editar' }, { act: 'p-del', id: p.id, icon: 'trash', label: 'Excluir', danger: true }]) },
        ], list)}</section>` : `<section class="card">${UI.empty({ icon: 'box', title: 'Nenhum produto cadastrado', text: 'Cadastre seu ebook com nome, preço e link de venda.', action: '<button class="btn soft" data-act="new-prod">+ Produto</button>' })}</section>`;
      } else {
        const draw = () => {
          const rows = U.sortBy(S.all().filter((s) => (!sf.month || U.monthKey(s.date) === sf.month) && (!sf.product || s.productId === sf.product) && (!sf.status || s.status === sf.status)), (s) => s.date, -1);
          box.querySelector('#slist').innerHTML = rows.length ? UI.table([
            { label: 'Data', render: (s) => U.fmtDate(s.date) }, { label: 'Produto', render: (s) => `<strong>${esc((P.get(s.productId) || {}).name || 'Produto removido')}</strong>` },
            { label: 'Cliente', render: (s) => esc(s.client || '—') }, { label: 'Valor', cls: 'num', render: (s) => U.money(s.value) },
            { label: 'Forma', render: (s) => esc(UI.labelOf(CP.payments.METHODS, s.method)) }, { label: 'Status', render: (s) => UI.sb(s.status, UI.labelOf(S.STATUS, s.status)) },
            { label: '', cls: 'act', render: (s) => UI.actions([{ act: 's-edit', id: s.id, icon: 'edit', label: 'Editar' }, { act: 's-del', id: s.id, icon: 'trash', label: 'Excluir', danger: true }]) },
          ], rows) : UI.empty({ icon: 'box', title: 'Nenhuma venda encontrada', text: 'Registre uma venda ou ajuste os filtros.' });
        };
        box.innerHTML = `<section class="card">${UI.filters([{ key: 'month', label: 'Mês', type: 'month' }, { key: 'product', label: 'Produto', options: UI.opts.list(P.all().map((p) => [p.id, p.name]), 'Todos') }, { key: 'status', label: 'Status', options: UI.opts.list(S.STATUS, 'Todos') }], sf)}<div id="slist"></div></section>`;
        draw(); UI.bindFilters(box, sf, draw);
      }
      UI.bindTabs(root, (t) => { tab = t; CP.views.produtos.render(root); });
      UI.delegate(root, (act, id) => {
        if (act === 'new-prod') A.newProduct(); else if (act === 'new-sale') A.newSale();
        else if (act === 'p-sale') A.newSale({ productId: id, value: (P.get(id) || {}).price });
        else if (act === 'p-edit') A.editProduct(id); else if (act === 'p-del') A.deleteProduct(id);
        else if (act === 's-edit') A.editSale(id); else if (act === 's-del') A.deleteSale(id);
      });
    },
  };
})();
