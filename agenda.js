/* Agenda: calendário mensal + pacotes mensais */
(function () {
  'use strict';
  const CP = window.CP, U = CP.U, UI = CP.UI, esc = U.esc, A = CP.actions, E = CP.events;
  let tab = 'cal', month = U.thisMonth(), sel = U.today(), pkgPatient = '';

  /* ---------- Eventos ---------- */
  function eventForm(ev, date) {
    const vals = ev ? { ...ev } : { type: 'sessao', date: date || U.today() };
    UI.form({
      title: ev ? 'Editar evento' : 'Adicionar evento', values: vals, submitText: ev ? 'Salvar alterações' : 'Adicionar',
      fields: [
        { key: 'type', label: 'Tipo', type: 'select', options: ev ? E.TYPES.filter((t) => t[0] !== 'sessao') : E.TYPES, hint: ev ? '' : 'Eventos do tipo “Sessão” entram no controle de sessões da paciente.' },
        { key: 'date', label: 'Data', type: 'date', required: true },
        { key: 'time', label: 'Horário', type: 'time' },
        { key: 'patientId', label: 'Paciente', type: 'select', options: UI.opts.patients('— nenhuma —') },
        { key: 'title', label: 'Título', type: 'text', placeholder: 'Opcional', full: true },
        { key: 'note', label: 'Observação administrativa', type: 'textarea' },
      ],
      extraButtons: ev ? [{ label: 'Excluir', cls: 'danger', onClick: async (m) => { const ok = await UI.confirm({ title: 'Excluir evento', message: 'Excluir este evento da agenda?', confirmText: 'Excluir', danger: true }); if (!ok) return; await E.remove(ev.id); m.close(); UI.toast('Evento excluído.'); CP.App.refresh(); } }] : [],
      onSubmit: async (v) => {
        if (!ev && v.type === 'sessao') {
          if (!v.patientId) throw new Error('Selecione a paciente para registrar uma sessão.');
          const pat = CP.patients.get(v.patientId);
          await CP.sessions.save({ patientId: v.patientId, patientName: pat ? pat.name : '', date: v.date, time: v.time, status: 'agendada', note: v.note, slot: '', month: '' });
          UI.toast('Sessão agendada.');
        } else {
          await E.save({ ...(ev || {}), ...v });
          UI.toast(ev ? 'Evento atualizado.' : 'Evento adicionado.');
        }
        CP.App.refresh();
      },
    });
  }
  A.newEvent = (date) => eventForm(null, date);
  A.editEvent = (id) => { const e = E.get(id); if (e) eventForm(e); };

  function openItem(it) {
    switch (it.src) {
      case 'session': return A.editSession(it.id);
      case 'event': return A.editEvent(it.id);
      case 'payment': return A.editPayment(it.id);
      case 'patient': return CP.App.go('pacientes', it.id);
      case 'expense': return A.editExpense(it.id);
      case 'followup': return A.editFollowup(it.id);
      case 'lead': return A.editLead(it.id);
      default: return null;
    }
  }

  /* ---------- Calendário ---------- */
  function calendar(box) {
    if (U.monthKey(sel) !== month) sel = U.monthKey(U.today()) === month ? U.today() : month + '-01';
    const lead = new Date(+month.slice(0, 4), +month.slice(5, 7) - 1, 1).getDay();
    const map = CP.agenda.monthMap(month);
    const today = U.today();
    let cells = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => `<div class="wd">${d}</div>`).join('');
    for (let i = 0; i < lead; i++) cells += '<div class="day empty"></div>';
    Object.keys(map).forEach((date) => {
      const items = map[date];
      cells += `<button class="day ${date === today ? 'today' : ''} ${date === sel ? 'sel' : ''}" data-date="${date}" aria-label="${U.fmtDate(date)}, ${items.length} item(ns)"><span class="n">${+date.slice(8)}</span>
        <span class="chips">${items.slice(0, 2).map((it) => `<span class="chip" style="--c:${CP.agenda.COLORS[it.type]}">${esc(it.title)}</span>`).join('')}${items.length > 2 ? `<em>+${items.length - 2}</em>` : ''}</span>
        <span class="dots">${items.slice(0, 4).map((it) => `<i class="dot" style="--c:${CP.agenda.COLORS[it.type]}"></i>`).join('')}</span></button>`;
    });
    const items = map[sel] || [];
    box.innerHTML = `<div class="head-actions" style="justify-content:space-between;margin-bottom:14px">${UI.monthNav(month)}<button class="btn soft sm" data-today>Hoje</button></div>
      <div class="cal">${cells}</div>
      <div class="legend">${E.TYPES.map(([k, l]) => `<span><i class="dot" style="--c:${CP.agenda.COLORS[k]}"></i>${l}</span>`).join('')}</div>
      <section class="card section"><div class="card-head"><h3>${U.fmtDate(sel)}</h3><button class="btn primary sm" data-add>${UI.icon('plus', 16)} Adicionar evento</button></div>
      ${items.length ? items.map((it, i) => `<button class="agenda-item ${it.status === 'cancelada' ? 'cancelled' : ''}" data-i="${i}"><i class="dot" style="--c:${CP.agenda.COLORS[it.type]}"></i><div><strong>${esc(it.title)}</strong><small>${esc(UI.labelOf(E.TYPES, it.type))}${it.time ? ' · ' + esc(it.time) : ''}${it.status ? ' · ' + esc(UI.labelOf(CP.sessions.STATUS, it.status)) : ''}</small></div></button>`).join('')
        : UI.empty({ icon: 'calendar', title: 'Nada neste dia', text: 'Use “Adicionar evento” para agendar uma sessão, avaliação ou lembrete.' })}</section>`;
    box.onclick = (e) => {
      const nav = e.target.closest('[data-nav]'); if (nav) { month = U.addMonths(month, Number(nav.dataset.nav)); return calendar(box); }
      if (e.target.closest('[data-today]')) { month = U.thisMonth(); sel = U.today(); return calendar(box); }
      const d = e.target.closest('[data-date]'); if (d) { sel = d.dataset.date; return calendar(box); }
      if (e.target.closest('[data-add]')) return A.newEvent(sel);
      const it = e.target.closest('[data-i]'); if (it) openItem(items[Number(it.dataset.i)]);
    };
  }

  /* ---------- Pacotes mensais ---------- */
  function packages(box) {
    const pk = U.sortBy(CP.patients.all().filter((p) => p.paymentModel === 'pacote_mensal'), (p) => U.norm(p.name));
    if (!pk.length) { box.innerHTML = UI.empty({ icon: 'calendar', title: 'Nenhuma paciente com pacote mensal', text: 'Defina a modalidade “Pacote mensal” no cadastro da paciente.' }); return; }
    if (!pk.some((p) => p.id === pkgPatient)) pkgPatient = pk[0].id;
    const m = CP.pkgUI.month;
    box.innerHTML = `<div class="filters"><label class="f"><span>Paciente</span><select id="pkSel">${pk.map((p) => `<option value="${p.id}" ${p.id === pkgPatient ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label></div>
      <section class="card" id="pkgBox"></section>
      <section class="card section"><h3>Visão geral — ${esc(U.monthLabel(m))}</h3>${UI.table([
        { label: 'Paciente', render: (p) => `<strong>${esc(p.name)}</strong>` },
        { label: 'Sessões', render: (p) => { const k = CP.sessions.pkg(p.id, m); return `${k.done} de ${k.size} realizadas`; } },
        { label: 'Pagamento', render: (p) => { const ok = CP.sessions.pkg(p.id, m).paid; return UI.sb(ok ? 'pago' : 'pendente', ok ? 'Pago' : 'Pendente'); } },
      ], pk)}</section>`;
    CP.pkgUI.mount(box.querySelector('#pkgBox'), pkgPatient);
    box.querySelector('#pkSel').onchange = (e) => { pkgPatient = e.target.value; packages(box); };
    // ao trocar o mês dentro do painel, atualiza também a visão geral
    box.querySelector('#pkgBox').addEventListener('click', (e) => { if (e.target.closest('[data-nav]')) setTimeout(() => packages(box), 0); });
  }

  CP.views.agenda = {
    render(root) {
      root.innerHTML = UI.pageHead('Agenda', 'Sessões, pagamentos, avaliações, vencimentos e follow-ups.', `<button class="btn primary" id="addEv">${UI.icon('plus', 18)} Adicionar evento</button>`) +
        UI.tabs([['cal', 'Calendário'], ['pkg', 'Pacotes mensais']], tab) + '<div id="box"></div>';
      const box = root.querySelector('#box');
      if (tab === 'cal') calendar(box); else packages(box);
      UI.bindTabs(root, (t) => { tab = t; CP.views.agenda.render(root); });
      root.querySelector('#addEv').onclick = () => A.newEvent(tab === 'cal' ? sel : U.today());
    },
  };
})();
