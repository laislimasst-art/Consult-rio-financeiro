/* Dashboard "Meu Consultório" */
(function () {
  'use strict';
  const CP = window.CP, U = CP.U, UI = CP.UI, esc = U.esc, F = CP.finance;
  let month = U.thisMonth();

  /* Só compara com o mês anterior quando existe dado para comparar */
  const delta = (cur, prev, ok, goodUp = true) => {
    if (!ok || !prev) return '';
    const pct = ((cur - prev) / Math.abs(prev)) * 100;
    if (!isFinite(pct)) return '';
    const up = pct >= 0;
    return `<span class="delta ${up === goodUp ? 'good' : 'bad'}">${up ? '▲' : '▼'} ${Math.abs(pct).toFixed(0)}% vs mês anterior</span>`;
  };

  CP.views.dashboard = {
    render(root) {
      const cur = F.monthSummary(month), prev = F.monthSummary(U.addMonths(month, -1)), hp = prev.hasData;
      const first = (CP.settings.get('name') || '').split(' ')[0];
      const active = CP.patients.all().filter((p) => p.status === 'ativa').length;
      const goal = Number(CP.settings.get('monthlyGoal')) || 0;
      const due = CP.followups.dueToday();
      const today = U.today();
      const upcoming = U.sortBy(CP.sessions.all().filter((s) => s.status === 'agendada' && s.date >= today), (s) => s.date + (s.time || '')).slice(0, 5);
      const pend = U.sortBy(cur.pendingPayments, (p) => p.date).slice(0, 5);
      const noReceipt = CP.payments.awaitingReceipt().length, noCarne = CP.payments.awaitingCarne().length;
      const last = CP.settings.get('lastBackup');
      const hasData = CP.payments.all().length + CP.patients.all().length > 0;
      const oldBackup = hasData && (!last || (Date.now() - new Date(last).getTime()) / 864e5 > 14);

      const alerts = [];
      if (due.count) alerts.push(['bell', `Você possui ${due.count} contato${due.count > 1 ? 's' : ''} para acompanhar hoje.`, 'followup']);
      if (noReceipt) alerts.push(['receipt', `${noReceipt} pagamento${noReceipt > 1 ? 's' : ''} pago${noReceipt > 1 ? 's' : ''} sem recibo emitido.`, 'recibos']);
      if (noCarne) alerts.push(['wallet', `${noCarne} pagamento${noCarne > 1 ? 's' : ''} aguardando registro no Carnê-Leão.`, 'recibos:carne']);
      if (oldBackup) alerts.push(['download', last ? 'Faz mais de 14 dias desde o último backup. Exporte um novo backup.' : 'Você ainda não exportou nenhum backup. Seus dados ficam apenas neste navegador.', 'configuracoes']);

      root.innerHTML = `<div class="hero-head"><div><h1>Meu Consultório</h1><p class="hello">Olá${first ? ', ' + esc(first) : ''} 🌷</p></div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">${UI.monthNav(month)}${month !== U.thisMonth() ? '<button class="btn ghost sm" data-today>Mês atual</button>' : ''}</div></div>
        ${alerts.length ? `<div class="alerts">${alerts.map(([i, t, g]) => `<button class="alert" data-go="${g}">${UI.icon(i, 20)}<span>${esc(t)}</span></button>`).join('')}</div>` : ''}
        <div class="grid g-stats">
          ${UI.stat({ label: 'Receita recebida', value: U.money(cur.received), sub: 'Somente pagamentos pagos', extra: delta(cur.received, prev.received, hp), tone: 'hero' })}
          ${UI.stat({ label: 'Receita prevista', value: U.money(cur.expected), sub: 'Valores esperados do mês', extra: delta(cur.expected, prev.expected, hp) })}
          ${UI.stat({ label: 'A receber', value: U.money(cur.toReceive), sub: 'Previsto − recebido' })}
          ${UI.stat({ label: 'Despesas', value: U.money(cur.expensesPaid), sub: cur.expensesPending ? `${U.money(cur.expensesPending)} ainda pendentes` : 'Somente despesas pagas', extra: delta(cur.expensesPaid, prev.expensesPaid, hp, false) })}
          ${UI.stat({ label: 'Lucro', value: U.money(cur.profit), sub: 'Recebido − despesas pagas', extra: delta(cur.profit, prev.profit, hp), tone: cur.profit < 0 ? 'neg' : '' })}
          ${UI.stat({ label: 'Pacientes ativas', value: active })}
          ${UI.stat({ label: 'Sessões do mês', value: cur.sessionsDone, sub: 'Sessões marcadas como realizadas', extra: delta(cur.sessionsDone, prev.sessionsDone, hp) })}
          ${UI.stat({ label: 'Ticket médio', value: cur.ticket == null ? '—' : U.money(cur.ticket), sub: 'Por paciente que pagou no mês' })}
          ${UI.stat({ label: 'Receita de produtos', value: U.money(cur.productRevenue), extra: delta(cur.productRevenue, prev.productRevenue, hp) })}
        </div>
        ${goal > 0 ? `<section class="card section"><div class="prog-line"><strong style="color:var(--wine)">Meta financeira do mês</strong><span>${U.money(cur.received)} de ${U.money(goal)}</span></div>${UI.progress(Math.round(cur.received / goal * 100))}</section>` : ''}
        <div class="grid g-2 section">
          <section class="card"><h3>Próximas sessões</h3>${upcoming.length ? upcoming.map((s) => `<div class="list-row"><div><strong>${esc(CP.patients.name(s.patientId, s.patientName))}</strong><small>${U.fmtDate(s.date)}${s.time ? ' às ' + esc(s.time) : ''}</small></div></div>`).join('') : UI.empty({ icon: 'calendar', title: 'Nenhuma sessão agendada', text: 'Agende sessões na Agenda ou na ficha da paciente.' })}</section>
          <section class="card"><h3>Pagamentos pendentes do mês</h3>${pend.length ? pend.map((p) => `<div class="list-row"><div><strong>${esc(CP.patients.name(p.patientId, p.patientName))}</strong><small>${U.fmtDate(p.date)} · ${esc(UI.labelOf(CP.payments.STATUS, p.status))}</small></div><strong>${U.money(p.value)}</strong></div>`).join('') : UI.empty({ icon: 'check', title: 'Nada pendente', text: 'Nenhum pagamento pendente registrado neste mês.' })}</section>
        </div>
        <section class="card section"><h3>Atalhos</h3><div class="head-actions">
          <button class="btn soft" data-q="newPayment">+ Pagamento</button><button class="btn soft" data-q="newSession">+ Sessão</button><button class="btn soft" data-q="newPatient">+ Paciente</button><button class="btn soft" data-q="newExpense">+ Despesa</button><button class="btn soft" data-q="newLead">+ Lead</button></div></section>
        <div class="notice big">Este sistema é administrativo e financeiro. Não utilize este espaço para armazenar prontuários ou informações clínicas.</div>`;

      root.onclick = (e) => {
        const nav = e.target.closest('[data-nav]'); if (nav) { month = U.addMonths(month, Number(nav.dataset.nav)); return CP.App.refresh(); }
        if (e.target.closest('[data-today]')) { month = U.thisMonth(); return CP.App.refresh(); }
        const g = e.target.closest('[data-go]');
        if (g) { const [r, t] = g.dataset.go.split(':'); if (t) CP.views.recibos.tab = t; return CP.App.go(r); }
        const q = e.target.closest('[data-q]'); if (q) CP.actions[q.dataset.q]();
      };
    },
  };
})();
