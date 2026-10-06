/* Metas, Conquistas e Evolução (gráficos) */
(function () {
  'use strict';
  const CP = window.CP, U = CP.U, UI = CP.UI, esc = U.esc, G = CP.goals, Ac = CP.achievements, A = CP.actions, F = CP.finance;

  /* ---------- Metas ---------- */
  function goalForm(g) {
    UI.form({
      title: g ? 'Editar meta' : 'Nova meta', submitText: g ? 'Salvar alterações' : 'Criar meta',
      values: g || { category: 'financeira', unit: 'money', status: 'andamento', current: 0 },
      fields: [
        { key: 'name', label: 'Nome', type: 'text', required: true, full: true, placeholder: 'Ex.: Faturar R$ 5.000/mês' },
        { key: 'category', label: 'Categoria', type: 'select', options: G.CAT },
        { key: 'unit', label: 'Tipo de valor', type: 'select', options: G.UNIT },
        { key: 'current', label: 'Valor atual', type: 'number', step: '0.01' },
        { key: 'target', label: 'Valor objetivo', type: 'number', step: '0.01', required: true },
        { key: 'deadline', label: 'Prazo', type: 'date' },
        { key: 'status', label: 'Status', type: 'select', options: G.STATUS },
      ],
      extraButtons: g ? [{ label: 'Excluir', cls: 'danger', onClick: (m) => { m.close(); A.deleteGoal(g.id); } }] : [],
      onSubmit: async (v) => {
        if (!(Number(v.target) > 0)) throw new Error('O valor objetivo precisa ser maior que zero.');
        await G.save({ ...(g || {}), ...v, current: Number(v.current) || 0, target: Number(v.target) });
        UI.toast(g ? 'Meta atualizada.' : 'Meta criada.'); CP.App.refresh();
      },
    });
  }
  A.newGoal = () => goalForm(null);
  A.editGoal = (id) => { const g = G.get(id); if (g) goalForm(g); };
  A.deleteGoal = async (id) => {
    const ok = await UI.confirm({ title: 'Excluir meta', message: 'Excluir esta meta?', confirmText: 'Excluir', danger: true });
    if (!ok) return; await G.remove(id); UI.toast('Meta excluída.'); CP.App.refresh();
  };

  CP.views.metas = {
    render(root) {
      const list = U.sortBy(G.all(), (g) => (g.status === 'concluida' ? 1 : 0) + (g.deadline || '9999'));
      const monthly = Number(CP.settings.get('monthlyGoal')) || 0;
      const rec = F.monthSummary(U.thisMonth()).received;
      root.innerHTML = UI.pageHead('Metas', 'Acompanhe o que você quer alcançar.', `<button class="btn primary" id="newG">${UI.icon('plus', 18)} Meta</button>`) +
        (monthly > 0 ? `<section class="card"><div class="prog-line"><strong style="color:var(--wine)">Meta financeira do mês (Configurações)</strong><span>${U.money(rec)} de ${U.money(monthly)}</span></div>${UI.progress(Math.round(rec / monthly * 100))}</section>` : '') +
        `<div class="grid g-3 section">${list.map((g) => `<article class="card goal"><div class="card-head"><h4>${esc(g.name)}</h4>${UI.sb(g.status, UI.labelOf(G.STATUS, g.status))}</div>
          <div class="prog-line"><span>${esc(G.fmt(g, g.current))} de ${esc(G.fmt(g, g.target))}</span><strong>${G.pct(g)}%</strong></div>${UI.progress(G.pct(g))}
          <p style="margin:10px 0 0;font-size:.84rem">${esc(UI.labelOf(G.CAT, g.category))}${g.deadline ? ' · prazo ' + U.fmtDate(g.deadline) : ''}</p>
          <div class="row-actions" style="margin-top:8px">${UI.actions([{ act: 'g-upd', id: g.id, icon: 'refresh', label: 'Atualizar valor atual' }, { act: 'g-edit', id: g.id, icon: 'edit', label: 'Editar' }, { act: 'g-del', id: g.id, icon: 'trash', label: 'Excluir', danger: true }])}</div></article>`).join('')}</div>` +
        (list.length ? '' : `<section class="card section">${UI.empty({ icon: 'flag', title: 'Nenhuma meta criada', text: 'Exemplo: “Faturar R$ 5.000/mês”. Defina o valor objetivo e atualize o valor atual quando quiser.', action: '<button class="btn soft" data-act="g-new">+ Meta</button>' })}</section>`);
      root.querySelector('#newG').onclick = () => A.newGoal();
      UI.delegate(root, (act, id) => {
        if (act === 'g-new') A.newGoal(); else if (act === 'g-edit') A.editGoal(id); else if (act === 'g-del') A.deleteGoal(id);
        else if (act === 'g-upd') {
          const g = G.get(id);
          UI.form({ title: 'Atualizar valor atual', submitText: 'Salvar', values: { current: g.current }, fields: [{ key: 'current', label: `Valor atual — ${g.name}`, type: 'number', step: '0.01', required: true }],
            onSubmit: async (v) => { const cur = Number(v.current) || 0; await G.save({ ...g, current: cur, status: cur >= g.target ? 'concluida' : g.status }); UI.toast(cur >= g.target ? 'Meta concluída! 🌷' : 'Meta atualizada.'); CP.App.refresh(); } });
        }
      });
    },
  };

  /* ---------- Conquistas ---------- */
  function achForm(a) {
    UI.form({
      title: a ? 'Editar conquista' : 'Nova conquista', submitText: a ? 'Salvar alterações' : 'Registrar conquista', values: a || { date: U.today() },
      fields: [
        { key: 'title', label: 'Título', type: 'text', required: true, full: true },
        { key: 'date', label: 'Data', type: 'date', required: true },
        { key: 'value', label: 'Valor (opcional, R$)', type: 'money' },
        { key: 'description', label: 'Descrição', type: 'textarea' },
        { key: 'image', label: 'Imagem (opcional)', type: 'image' },
      ],
      extraButtons: a ? [{ label: 'Excluir', cls: 'danger', onClick: (m) => { m.close(); A.deleteAchievement(a.id); } }] : [],
      onSubmit: async (v) => { await Ac.save({ ...(a || {}), ...v }); UI.toast(a ? 'Conquista atualizada.' : 'Conquista registrada.'); CP.App.refresh(); },
    });
  }
  A.newAchievement = () => achForm(null);
  A.editAchievement = (id) => { const a = Ac.get(id); if (a) achForm(a); };
  A.deleteAchievement = async (id) => {
    const ok = await UI.confirm({ title: 'Excluir conquista', message: 'Excluir esta conquista?', confirmText: 'Excluir', danger: true });
    if (!ok) return; await Ac.remove(id); UI.toast('Conquista excluída.'); CP.App.refresh();
  };

  CP.views.conquistas = {
    render(root) {
      const list = U.sortBy(Ac.all(), (a) => a.date, -1);
      root.innerHTML = UI.pageHead('Minhas conquistas', 'Registre cada passo da sua trajetória.', `<button class="btn primary" id="newA">${UI.icon('plus', 18)} Conquista</button>`) +
        (list.length ? `<div class="timeline">${list.map((a) => `<div class="t-item"><div class="card"><div class="t-date">${U.fmtDate(a.date)}</div><div class="card-head" style="margin-bottom:6px"><h3 style="margin:0">${esc(a.title)}</h3>${UI.actions([{ act: 'a-edit', id: a.id, icon: 'edit', label: 'Editar' }, { act: 'a-del', id: a.id, icon: 'trash', label: 'Excluir', danger: true }])}</div>
          ${a.value ? `<p style="margin:0 0 6px"><strong>${U.money(a.value)}</strong></p>` : ''}${a.description ? `<p style="margin:0">${esc(a.description)}</p>` : ''}${a.image ? `<img src="${esc(a.image)}" alt="Imagem da conquista ${esc(a.title)}">` : ''}</div></div>`).join('')}</div>`
          : `<section class="card">${UI.empty({ icon: 'award', title: 'Sua linha do tempo começa aqui', text: 'Registre a primeira paciente, o primeiro ebook vendido, uma certificação…', action: '<button class="btn soft" data-act="a-new">+ Conquista</button>' })}</section>`);
      root.querySelector('#newA').onclick = () => A.newAchievement();
      UI.delegate(root, (act, id) => { if (act === 'a-new') A.newAchievement(); else if (act === 'a-edit') A.editAchievement(id); else if (act === 'a-del') A.deleteAchievement(id); });
    },
  };

  /* ---------- Evolução ---------- */
  let year = U.today().slice(0, 4), charts = [];
  CP.views.evolucao = {
    render(root) {
      charts.forEach((c) => c.destroy()); charts = [];
      const years = UI.opts.years(); if (!years.includes(year)) years.push(year);
      const s = F.yearSummary(year);
      const labels = s.months.map((m) => U.monthShort(m.month));
      root.innerHTML = UI.pageHead('Evolução', 'Seu consultório mês a mês.', `<label class="f" style="min-width:140px"><span>Ano</span><select id="yy">${years.sort().reverse().map((y) => `<option ${y === year ? 'selected' : ''}>${y}</option>`).join('')}</select></label>`) +
        `<div class="grid g-stats">${UI.stat({ label: 'Faturamento no ano', value: U.money(s.revenue) })}${UI.stat({ label: 'Despesas no ano', value: U.money(s.expenses) })}${UI.stat({ label: 'Lucro no ano', value: U.money(s.profit), tone: s.profit < 0 ? 'neg' : '' })}</div>
        <p id="chartWarn" class="notice section" hidden>Os gráficos precisam do Chart.js, carregado da internet. Conecte-se à internet e recarregue a página.</p>
        <div class="grid g-2 section" id="charts"></div>`;
      root.querySelector('#yy').onchange = (e) => { year = e.target.value; CP.views.evolucao.render(root); };
      if (typeof Chart === 'undefined') { root.querySelector('#chartWarn').hidden = false; return; }

      const C = { wine: '#6E3F45', burnt: '#B26D70', rose: '#C98F94', roseL: '#E8D2D2', gray: '#5D5555' };
      const box = root.querySelector('#charts');
      const add = (title, type, data, opts = {}) => {
        const id = 'ch' + charts.length;
        box.insertAdjacentHTML('beforeend', `<section class="card"><h3>${esc(title)}</h3><div class="chart-box"><canvas id="${id}" role="img" aria-label="${esc(title)}"></canvas></div></section>`);
        const money = opts.money;
        charts.push(new Chart(box.querySelector('#' + id), {
          type, data,
          options: { responsive: true, maintainAspectRatio: false, indexAxis: opts.horizontal ? 'y' : 'x',
            plugins: { legend: { display: data.datasets.length > 1, labels: { color: C.gray, boxWidth: 12 } }, tooltip: { callbacks: { label: (c) => ` ${c.dataset.label ? c.dataset.label + ': ' : ''}${money ? U.money(c.parsed[opts.horizontal ? 'x' : 'y']) : c.parsed[opts.horizontal ? 'x' : 'y']}` } } },
            scales: { x: { ticks: { color: C.gray }, grid: { display: false } }, y: { beginAtZero: true, ticks: { color: C.gray, precision: 0 }, grid: { color: '#EFE5E3' } } } },
        }));
      };
      const ds = (label, arr, color, extra = {}) => ({ label, data: arr, backgroundColor: color, borderColor: color, borderRadius: 6, tension: .3, ...extra });
      const M = s.months;
      add('Faturamento mensal', 'bar', { labels, datasets: [ds('Faturamento', M.map((m) => m.received), C.burnt)] }, { money: true });
      add('Despesas, faturamento e lucro', 'line', { labels, datasets: [ds('Faturamento', M.map((m) => m.received), C.burnt), ds('Despesas', M.map((m) => m.expensesPaid), C.gray), ds('Lucro', M.map((m) => m.profit), C.wine)] }, { money: true });
      add('Pacientes atendidas e sessões', 'bar', { labels, datasets: [ds('Pacientes', M.map((m) => m.servedCount), C.rose), ds('Sessões', M.map((m) => m.sessionsDone), C.wine)] });
      add('Ticket médio', 'line', { labels, datasets: [ds('Ticket médio', M.map((m) => (m.ticket == null ? null : m.ticket)), C.wine, { spanGaps: true })] }, { money: true });
      const byP = {};
      CP.payments.all().filter((p) => p.status === 'pago' && p.refType !== 'produto' && U.yearOf(p.date) === year).forEach((p) => { const k = CP.patients.name(p.patientId, p.patientName); byP[k] = (byP[k] || 0) + (Number(p.value) || 0); });
      const pe = Object.entries(byP).sort((a, b) => b[1] - a[1]);
      add('Receita por paciente (ano)', 'bar', { labels: pe.map((x) => x[0]), datasets: [ds('Receita', pe.map((x) => x[1]), C.rose)] }, { money: true, horizontal: true });
      const byPr = {};
      CP.sales.all().filter((x) => x.status === 'pago' && U.yearOf(x.date) === year).forEach((x) => { const k = (CP.products.get(x.productId) || {}).name || 'Produto removido'; byPr[k] = (byPr[k] || 0) + (Number(x.value) || 0); });
      CP.payments.all().filter((p) => p.status === 'pago' && p.refType === 'produto' && U.yearOf(p.date) === year).forEach((p) => { byPr['Outros produtos'] = (byPr['Outros produtos'] || 0) + (Number(p.value) || 0); });
      const pr = Object.entries(byPr);
      add('Receita por produto (ano)', 'bar', { labels: pr.map((x) => x[0]), datasets: [ds('Receita', pr.map((x) => x[1]), C.burnt)] }, { money: true });
      add('Novos leads', 'bar', { labels, datasets: [ds('Novos leads', M.map((m) => m.newLeads), C.roseL, { borderColor: C.rose, borderWidth: 1 })] });
      add('Novas pacientes e saídas', 'bar', { labels, datasets: [ds('Novas pacientes', M.map((m) => m.newPatients), C.wine), ds('Pacientes que saíram', M.map((m) => m.exits), C.rose)] });
    },
  };
})();
