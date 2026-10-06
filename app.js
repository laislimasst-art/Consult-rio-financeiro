/* Inicialização, rotas (hash) e estrutura da página */
(function () {
  'use strict';
  const CP = window.CP, U = CP.U, UI = CP.UI, esc = U.esc;

  const NAV = [
    ['dashboard', 'Dashboard', 'home'], ['pacientes', 'Pacientes', 'users'], ['agenda', 'Agenda', 'calendar'],
    ['pagamentos', 'Pagamentos', 'wallet'], ['recibos', 'Recibos', 'receipt'], ['financeiro', 'Financeiro', 'chart'],
    ['despesas', 'Despesas', 'tag'], ['produtos', 'Produtos', 'box'], ['leads', 'Leads', 'userplus'],
    ['followup', 'Follow-up', 'bell'], ['metas', 'Metas', 'flag'], ['conquistas', 'Conquistas', 'award'],
    ['evolucao', 'Evolução', 'trend'], ['configuracoes', 'Configurações', 'settings'],
  ];
  const BOTTOM = ['dashboard', 'pacientes', 'agenda', 'pagamentos'];
  const App = (CP.App = { current: { name: 'dashboard', param: null } });

  const parse = () => {
    const [name, param] = location.hash.replace(/^#\/?/, '').split('/');
    return { name: name || 'dashboard', param: param ? decodeURIComponent(param) : null };
  };
  App.go = (name, param) => {
    const target = '#/' + name + (param ? '/' + encodeURIComponent(param) : '');
    if (location.hash === target) App.refresh(); else location.hash = target;
  };
  App.refresh = () => render(true);

  function render(keepScroll) {
    const r = parse();
    App.current = r;
    const root = document.getElementById('view');
    const view = CP.views[r.name] || CP.views.dashboard;
    const sy = window.scrollY;
    try { root.innerHTML = ''; view.render(root, r.param); }
    catch (e) { console.error(e); root.innerHTML = `<div class="card"><h3>Não foi possível abrir esta tela</h3><p>${esc(e.message)}</p><a class="btn soft" href="#/dashboard">Voltar ao início</a></div>`; }
    markNav(r.name);
    window.scrollTo(0, keepScroll ? sy : 0);
  }

  function markNav(name) {
    const item = NAV.find((n) => n[0] === name) || NAV[0];
    document.getElementById('topTitle').textContent = item[1];
    document.title = item[1] + ' · Meu Consultório';
    document.querySelectorAll('.nav a, .bottomnav a').forEach((a) => a.classList.toggle('on', a.dataset.r === item[0]));
    const more = document.getElementById('moreBtn');
    if (more) more.classList.toggle('on', !BOTTOM.includes(item[0]));
  }

  function buildShell() {
    const s = CP.settings.data;
    const mark = s.logo ? `<img src="${esc(s.logo)}" alt="">` : '<span>L</span>';
    document.getElementById('sidebar').innerHTML = `
      <div class="brand"><div class="brand-mark">${mark}</div><div class="brand-name">Meu Consultório<small>${esc(s.name || '')}</small></div></div>
      <nav class="nav">${NAV.map(([k, l, i]) => `<a href="#/${k}" data-r="${k}">${UI.icon(i)}<span>${l}</span></a>`).join('')}</nav>
      <div class="side-foot">Sistema administrativo e financeiro.<br>Não armazene prontuários ou informações clínicas.</div>`;
    document.getElementById('topbar').innerHTML = `
      <div class="top-title" id="topTitle"></div>
      <div class="search-box">${UI.icon('search', 18)}<input id="globalSearch" type="search" placeholder="Buscar paciente, pagamento, despesa, data…" autocomplete="off" aria-label="Busca global"><div id="searchResults" class="search-results" hidden></div></div>
      <button class="icon-btn" id="searchToggle" aria-label="Buscar">${UI.icon('search')}</button>
      <button class="btn primary" id="topAdd">${UI.icon('plus', 18)} Novo</button>`;
    document.getElementById('bottomnav').innerHTML =
      BOTTOM.map((k) => { const n = NAV.find((x) => x[0] === k); return `<a href="#/${k}" data-r="${k}">${UI.icon(n[2], 22)}<span>${n[1]}</span></a>`; }).join('') +
      `<button id="moreBtn">${UI.icon('more', 22)}<span>Mais</span></button>`;

    document.getElementById('fab').onclick = CP.actions.quickAdd;
    document.getElementById('topAdd').onclick = CP.actions.quickAdd;
    document.getElementById('moreBtn').onclick = moreSheet;
    document.getElementById('searchToggle').onclick = () => {
      const tb = document.getElementById('topbar');
      tb.classList.toggle('search-open');
      if (tb.classList.contains('search-open')) document.getElementById('globalSearch').focus();
    };
    CP.search.init(document.getElementById('globalSearch'), document.getElementById('searchResults'));
  }

  function moreSheet() {
    const m = UI.modal({ title: 'Menu', body: `<div class="quick-grid">${NAV.filter((n) => !BOTTOM.includes(n[0])).map(([k, l, i]) => `<a class="quick" href="#/${k}" data-close-me>${UI.icon(i, 22)}<span>${l}</span></a>`).join('')}</div>` });
    m.body.addEventListener('click', (e) => { if (e.target.closest('[data-close-me]')) m.close(); });
  }

  CP.actions.quickAdd = () => {
    const items = [['Paciente', 'users', 'newPatient'], ['Pagamento', 'wallet', 'newPayment'], ['Sessão', 'calendar', 'newSession'], ['Despesa', 'tag', 'newExpense'], ['Venda', 'box', 'newSale'], ['Lead', 'userplus', 'newLead'], ['Follow-up', 'bell', 'newFollowup'], ['Meta', 'flag', 'newGoal'], ['Conquista', 'award', 'newAchievement']];
    const m = UI.modal({ title: 'Adicionar', body: `<div class="quick-grid">${items.map(([l, i, a]) => `<button class="quick" data-a="${a}">${UI.icon(i, 22)}<span>+ ${l}</span></button>`).join('')}</div>` });
    m.body.addEventListener('click', (e) => { const b = e.target.closest('[data-a]'); if (!b) return; m.close(); CP.actions[b.dataset.a](); });
  };

  /* Primeira execução: cadastra somente as 4 pacientes informadas */
  async function seedIfNeeded() {
    if (CP.settings.get('seeded')) return;
    if (CP.patients.all().length === 0) await CP.patients.seed();
    CP.settings.save({ seeded: true });
  }

  App.rebuildShell = () => { buildShell(); markNav(App.current.name); };

  async function boot() {
    if (App.booted) return; // evita inicialização dupla (e cadastro inicial duplicado)
    App.booted = true;
    try {
      CP.settings.load();
      await CP.storage.init();
      await CP.db.load();
      await seedIfNeeded();
      buildShell();
      window.addEventListener('hashchange', () => { document.getElementById('topbar').classList.remove('search-open'); render(false); });
      render(false);
    } catch (e) {
      console.error(e);
      document.getElementById('view').innerHTML = `<div class="card"><h3>Não foi possível iniciar o sistema</h3><p>${esc(e.message)}</p><p>Verifique se o navegador permite armazenamento local (não use aba anônima) e recarregue a página.</p></div>`;
    }
  }
  document.addEventListener('DOMContentLoaded', boot);
})();
