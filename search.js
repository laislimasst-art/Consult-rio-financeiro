/* Busca global: paciente, pagamento, despesa, produto, lead, data */
(function () {
  'use strict';
  const CP = window.CP, U = CP.U, esc = U.esc;
  const A = CP.actions;

  function run(q) {
    const nq = U.norm(q.trim());
    if (nq.length < 2) return [];
    const dq = U.parseDateQuery(q);
    const dateHit = (d) => !!dq && !!d && (dq.type === 'day' ? d.slice(0, 10) === dq.value : U.monthKey(d) === dq.value);
    const has = (...vals) => vals.some((v) => U.norm(v).includes(nq));
    const nm = CP.patients.name;
    const g = [];
    const add = (title, items) => { if (items.length) g.push({ title, items: items.slice(0, 6) }); };

    add('Pacientes', CP.patients.all().filter((p) => has(p.name, p.phone, p.email, p.notes) || dateHit(p.evaluationDate) || dateHit(p.startDate))
      .map((p) => ({ label: p.name, sub: UI_label(CP.patients.STATUS, p.status), go: () => CP.App.go('pacientes', p.id) })));
    add('Pagamentos', CP.payments.all().filter((p) => has(nm(p.patientId, p.patientName), p.note, String(p.value), CP.payments.METHODS.find((m) => m[0] === p.method)?.[1]) || dateHit(p.date))
      .map((p) => ({ label: `${nm(p.patientId, p.patientName)} — ${U.money(p.value)}`, sub: `${U.fmtDate(p.date)} · ${UI_label(CP.payments.STATUS, p.status)}`, go: () => A.editPayment(p.id) })));
    add('Sessões', CP.sessions.all().filter((s) => has(nm(s.patientId, s.patientName), s.note) || dateHit(s.date))
      .map((s) => ({ label: `Sessão — ${nm(s.patientId, s.patientName)}`, sub: `${U.fmtDate(s.date)} · ${UI_label(CP.sessions.STATUS, s.status)}`, go: () => A.editSession(s.id) })));
    add('Despesas', CP.expenses.all().filter((x) => has(x.name, x.category, x.note) || dateHit(x.date))
      .map((x) => ({ label: `${x.name} — ${U.money(x.value)}`, sub: U.fmtDate(x.date), go: () => A.editExpense(x.id) })));
    add('Produtos e vendas', [
      ...CP.products.all().filter((p) => has(p.name, p.description)).map((p) => ({ label: p.name, sub: 'Produto', go: () => A.editProduct(p.id) })),
      ...CP.sales.all().filter((s) => has(s.client) || dateHit(s.date)).map((s) => ({ label: `Venda — ${s.client || 'cliente'} (${U.money(s.value)})`, sub: U.fmtDate(s.date), go: () => A.editSale(s.id) })),
    ]);
    add('Leads', CP.leads.all().filter((l) => has(l.name, l.interest, l.note) || dateHit(l.firstContact) || dateHit(l.nextContact))
      .map((l) => ({ label: l.name, sub: UI_label(CP.leads.STATUS, l.status), go: () => A.editLead(l.id) })));
    add('Follow-up', CP.followups.all().filter((f) => has(f.name, f.note) || dateHit(f.nextContact) || dateHit(f.lastContact))
      .map((f) => ({ label: f.name, sub: `Próximo: ${U.fmtDate(f.nextContact)}`, go: () => A.editFollowup(f.id) })));
    return g;
  }
  function UI_label(list, v) { const f = list.find((x) => x[0] === v); return f ? f[1] : v || ''; }

  CP.search = {
    run,
    init(input, box) {
      let results = [];
      const draw = () => {
        const q = input.value;
        if (U.norm(q.trim()).length < 2) { box.hidden = true; return; }
        results = run(q);
        let n = 0;
        box.innerHTML = results.length
          ? results.map((gr) => `<h5>${esc(gr.title)}</h5>${gr.items.map((it) => `<button data-i="${n++}">${esc(it.label)}<small>${esc(it.sub || '')}</small></button>`).join('')}`).join('')
          : '<p style="padding:12px;margin:0">Nenhum resultado encontrado.</p>';
        box.hidden = false;
      };
      input.addEventListener('input', U.debounce(draw, 150));
      input.addEventListener('focus', draw);
      box.addEventListener('click', (e) => {
        const b = e.target.closest('[data-i]'); if (!b) return;
        const flat = results.flatMap((gr) => gr.items);
        const it = flat[Number(b.dataset.i)];
        box.hidden = true; input.value = '';
        document.getElementById('topbar').classList.remove('search-open');
        if (it) it.go();
      });
      document.addEventListener('click', (e) => { if (!box.contains(e.target) && e.target !== input) box.hidden = true; });
      input.addEventListener('keydown', (e) => { if (e.key === 'Escape') { box.hidden = true; input.blur(); } });
    },
  };
})();
