/* Componentes de interface reutilizáveis: modal, formulário, toast, tabela... */
(function () {
  'use strict';
  const CP = window.CP, U = CP.U, esc = U.esc;
  const UI = (CP.UI = {});

  const ICONS = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M17 14c2.5 0 4 2 4 5"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/>',
    wallet: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H19v14H6.5A2.5 2.5 0 0 1 4 16.5z"/><path d="M19 9h-4a2 2 0 0 0 0 4h4"/>',
    receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    chart: '<path d="M4 20V4"/><path d="M4 20h16"/><path d="M8 16v-4M12 16V8M16 16v-6"/>',
    tag: '<path d="M3 12V4h8l9 9-8 8z"/><circle cx="7.5" cy="8.5" r="1.2"/>',
    box: '<path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>',
    userplus: '<circle cx="9.5" cy="8" r="3.3"/><path d="M3 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6"/><path d="M19 8v6M16 11h6"/>',
    bell: '<path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 21h4"/>',
    flag: '<path d="M5 21V4"/><path d="M5 4h12l-2 4 2 4H5"/>',
    award: '<circle cx="12" cy="9" r="5.5"/><path d="M8.5 14 7 21l5-3 5 3-1.5-7"/>',
    trend: '<path d="M3 17l6-6 4 4 8-9"/><path d="M15 6h6v6"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    download: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14"/>',
    upload: '<path d="M12 16V5M7.5 9.5 12 5l4.5 4.5M5 20h14"/>',
    print: '<path d="M7 9V3h10v6M7 17H4.5v-7h15v7H17M7 14h10v7H7z"/>',
    more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
    chevL: '<path d="m15 5-7 7 7 7"/>',
    chevR: '<path d="m9 5 7 7-7 7"/>',
    alert: '<path d="M12 4 2.8 20h18.4z"/><path d="M12 10v5M12 17.5v.5"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14-4M4 5v4h4M4 13a8 8 0 0 0 14 4M20 19v-4h-4"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  };
  UI.icon = (n, size = 20) => `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;

  /* ---------- Toast ---------- */
  UI.toast = (msg, type = 'ok') => {
    const root = document.getElementById('toastRoot');
    if (!root) return;
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.setAttribute('role', 'status');
    el.innerHTML = `${UI.icon(type === 'err' ? 'alert' : 'check', 18)}<span>${esc(msg)}</span>`;
    root.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, type === 'err' ? 4600 : 3000);
  };

  /* ---------- Modal ---------- */
  const stack = [];
  UI.modal = ({ title, body, footer, wide, onClose }) => {
    const root = document.getElementById('modalRoot');
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="modal-head"><h3>${esc(title)}</h3><button class="icon-btn" data-close aria-label="Fechar">${UI.icon('x')}</button></div>
      <div class="modal-body"></div>${footer ? '<div class="modal-foot"></div>' : ''}</div>`;
    const bodyEl = wrap.querySelector('.modal-body');
    if (typeof body === 'string') bodyEl.innerHTML = body; else if (body) bodyEl.appendChild(body);
    let closed = false;
    const api = {
      el: wrap, body: bodyEl, foot: wrap.querySelector('.modal-foot'),
      close() {
        if (closed) return; closed = true;
        const i = stack.indexOf(api); if (i >= 0) stack.splice(i, 1);
        wrap.classList.remove('show');
        setTimeout(() => wrap.remove(), 160);
        if (onClose) onClose();
      },
    };
    wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) api.close(); });
    wrap.querySelector('[data-close]').addEventListener('click', api.close);
    root.appendChild(wrap);
    stack.push(api);
    requestAnimationFrame(() => wrap.classList.add('show'));
    return api;
  };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && stack.length) stack[stack.length - 1].close(); });

  UI.confirm = ({ title = 'Confirmar', message, confirmText = 'Confirmar', cancelText = 'Cancelar', danger = false }) =>
    new Promise((res) => {
      const m = UI.modal({ title, body: `<p class="confirm-msg">${message}</p>`, footer: true, onClose: () => res(false) });
      m.foot.innerHTML = `<button class="btn ghost" data-no>${esc(cancelText)}</button><button class="btn ${danger ? 'danger-solid' : 'primary'}" data-yes>${esc(confirmText)}</button>`;
      m.foot.querySelector('[data-no]').onclick = () => m.close();
      m.foot.querySelector('[data-yes]').onclick = () => { res(true); m.close(); };
    });

  /* ---------- Formulário a partir de um esquema ---------- */
  function fieldHtml(f, v) {
    if (f.type === 'section') return `<h4 class="form-section span2">${esc(f.label)}</h4>`;
    const id = 'f_' + f.key;
    const span = f.full || f.type === 'textarea' || f.type === 'image' ? 'span2' : '';
    const req = f.required ? ' <span class="req" aria-hidden="true">*</span>' : '';
    let input = '';
    switch (f.type) {
      case 'select':
        input = `<select name="${f.key}" id="${id}">${(f.options || []).map((o) => { const [val, lab] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}" ${String(v == null ? '' : v) === String(val) ? 'selected' : ''}>${esc(lab)}</option>`; }).join('')}</select>`;
        break;
      case 'textarea':
        input = `<textarea name="${f.key}" id="${id}" rows="${f.rows || 3}" placeholder="${esc(f.placeholder || '')}">${esc(v == null ? '' : v)}</textarea>`;
        break;
      case 'checkbox':
        return `<div class="field span2" data-key="${f.key}"><label class="check"><input type="checkbox" name="${f.key}" id="${id}" ${v ? 'checked' : ''}><span>${esc(f.label)}</span></label></div>`;
      case 'image':
        input = `<div class="img-field"><img class="img-prev" alt="" ${v ? `src="${esc(v)}"` : 'hidden'}><div class="img-actions"><input type="file" accept="image/*" data-img="${f.key}" id="${id}"><button type="button" class="btn ghost sm" data-img-clear="${f.key}">Remover imagem</button></div></div>`;
        break;
      case 'money':
      case 'number':
        input = `<input type="number" inputmode="decimal" step="${f.type === 'money' ? '0.01' : f.step || '1'}" min="${f.min != null ? f.min : 0}" ${f.max != null ? `max="${f.max}"` : ''} name="${f.key}" id="${id}" value="${v == null ? '' : esc(v)}" placeholder="${esc(f.placeholder || (f.type === 'money' ? '0,00' : ''))}">`;
        break;
      default:
        input = `<input type="${f.type || 'text'}" name="${f.key}" id="${id}" value="${esc(v == null ? '' : v)}" placeholder="${esc(f.placeholder || '')}" ${f.readonly ? 'readonly' : ''} autocomplete="off">`;
    }
    return `<div class="field ${span}" data-key="${f.key}"><label for="${id}">${esc(f.label)}${req}</label>${input}${f.hint ? `<small>${esc(f.hint)}</small>` : ''}</div>`;
  }

  UI.form = ({ title, fields, values = {}, submitText = 'Salvar', notice, wide, onSubmit, onChange, extraButtons = [] }) => {
    const images = {};
    fields.forEach((f) => { if (f.type === 'image') images[f.key] = values[f.key] || ''; });
    const m = UI.modal({
      title, wide, footer: true,
      body: `<form class="form-grid" novalidate>${notice ? `<div class="notice span2">${notice}</div>` : ''}${fields.map((f) => fieldHtml(f, values[f.key])).join('')}<div class="form-error span2" role="alert" hidden></div></form>`,
    });
    m.foot.innerHTML = `${extraButtons.map((b, i) => `<button type="button" class="btn ${b.cls || 'ghost'}" data-extra="${i}">${esc(b.label)}</button>`).join('')}<span class="spacer"></span><button type="button" class="btn ghost" data-cancel>Cancelar</button><button type="button" class="btn primary" data-save>${esc(submitText)}</button>`;
    const form = m.body.querySelector('form');
    const errBox = form.querySelector('.form-error');
    const el = (k) => form.querySelector(`[name="${k}"]`);
    const read = () => {
      const out = {};
      fields.forEach((f) => {
        if (f.type === 'section') return;
        if (f.type === 'image') { out[f.key] = images[f.key] || ''; return; }
        const e = el(f.key); if (!e) return;
        if (f.type === 'checkbox') out[f.key] = e.checked;
        else if (f.type === 'number' || f.type === 'money') out[f.key] = e.value === '' ? null : Number(e.value);
        else out[f.key] = typeof e.value === 'string' ? e.value.trim() : e.value;
      });
      return out;
    };
    const set = (k, v) => { const e = el(k); if (!e) return; if (e.type === 'checkbox') e.checked = !!v; else e.value = v == null ? '' : v; };
    const updateVis = () => {
      const vals = read();
      fields.forEach((f) => { if (f.showIf) { const w = form.querySelector(`[data-key="${f.key}"]`); if (w) w.hidden = !f.showIf(vals); } });
    };
    const handle = (ev) => { const k = ev.target && ev.target.name; if (onChange && k) onChange(k, read(), set); updateVis(); };
    form.addEventListener('input', handle);
    form.addEventListener('change', handle);
    updateVis();

    form.addEventListener('change', async (ev) => {
      const t = ev.target;
      if (t.dataset && t.dataset.img) {
        const k = t.dataset.img;
        if (!t.files || !t.files[0]) return;
        try { images[k] = await U.resizeImage(t.files[0], 1000); const p = t.closest('.img-field').querySelector('.img-prev'); p.src = images[k]; p.hidden = false; }
        catch (e) { UI.toast(e.message, 'err'); }
      }
    });
    form.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-img-clear]');
      if (!b) return;
      images[b.dataset.imgClear] = '';
      const w = b.closest('.img-field'); w.querySelector('.img-prev').hidden = true; w.querySelector('input[type=file]').value = '';
    });

    const showErr = (msg) => { errBox.textContent = msg; errBox.hidden = false; };
    let busy = false;
    const submit = async () => {
      if (busy) return;
      errBox.hidden = true;
      const vals = read();
      for (const f of fields) {
        if (!f.required || f.type === 'section') continue;
        const w = form.querySelector(`[data-key="${f.key}"]`);
        if (w && w.hidden) continue;
        const v = vals[f.key];
        if (v === '' || v == null) { showErr(`Preencha o campo “${f.label}”.`); const e = el(f.key); if (e && e.focus) e.focus(); return; }
      }
      busy = true;
      const btn = m.foot.querySelector('[data-save]'); btn.disabled = true;
      try { await onSubmit(vals); m.close(); }
      catch (err) { console.warn(err); showErr(err && err.message ? err.message : 'Não foi possível salvar. Tente novamente.'); }
      finally { busy = false; btn.disabled = false; }
    };
    form.addEventListener('submit', (e) => { e.preventDefault(); submit(); });
    m.foot.querySelector('[data-save]').onclick = submit;
    m.foot.querySelector('[data-cancel]').onclick = () => m.close();
    m.foot.querySelectorAll('[data-extra]').forEach((b) => { b.onclick = () => extraButtons[Number(b.dataset.extra)].onClick(m); });
    m.form = form; m.read = read; m.set = set;
    const first = form.querySelector('input:not([type=file]):not([type=checkbox]), select, textarea');
    if (first && window.innerWidth > 900) setTimeout(() => first.focus(), 60);
    return m;
  };

  /* ---------- Blocos visuais ---------- */
  UI.badge = (text, kind = 'neutral') => `<span class="badge ${kind}">${esc(text)}</span>`;
  const KINDS = {
    pago: 'ok', pendente: 'warn', parcial: 'warn', estornado: 'bad', realizada: 'ok', agendada: 'rose', cancelada: 'bad', remarcada: 'warn',
    ativa: 'ok', nova: 'rose', inativa: 'neutral', antiga: 'neutral', ativo: 'ok', inativo: 'neutral', concluida: 'ok', andamento: 'rose', pausada: 'neutral',
    contatado: 'ok', encerrado: 'neutral', reembolsado: 'bad', novo: 'rose', conversando: 'rose', agendou: 'rose', realizou: 'ok', fechou: 'ok',
    semresposta: 'neutral', nao_fechou: 'bad', depois: 'warn', sim: 'ok', nao: 'warn',
  };
  UI.sb = (val, label) => UI.badge(label || val || '—', KINDS[val] || 'neutral');
  UI.labelOf = (list, v) => { const f = list.find((x) => x[0] === v); return f ? f[1] : v || '—'; };

  UI.empty = ({ icon = 'heart', title, text, action }) =>
    `<div class="empty"><div class="empty-ic">${UI.icon(icon, 28)}</div><h4>${esc(title)}</h4>${text ? `<p>${esc(text)}</p>` : ''}${action || ''}</div>`;

  UI.table = (cols, rows) => `<div class="table-wrap"><table class="tbl"><thead><tr>${cols.map((c) => `<th class="${c.cls || ''}">${esc(c.label)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${cols.map((c) => `<td data-label="${esc(c.label)}" class="${c.cls || ''}">${c.render(r)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;

  UI.actions = (list) => `<div class="row-actions">${list.map((a) => `<button class="icon-btn ${a.danger ? 'danger' : ''}" data-act="${a.act}" data-id="${esc(a.id)}" title="${esc(a.label)}" aria-label="${esc(a.label)}">${UI.icon(a.icon, 17)}</button>`).join('')}</div>`;

  UI.delegate = (root, handler) => root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (b && root.contains(b)) handler(b.dataset.act, b.dataset.id, b, e);
  });

  UI.pageHead = (title, sub, actions) => `<div class="page-head"><div><h1>${esc(title)}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div><div class="head-actions">${actions || ''}</div></div>`;
  UI.tabs = (items, active) => `<div class="tabs" role="tablist">${items.map(([k, l, c]) => `<button class="tab ${k === active ? 'on' : ''}" role="tab" data-tab="${k}">${esc(l)}${c != null ? ` <em>${c}</em>` : ''}</button>`).join('')}</div>`;
  UI.bindTabs = (root, cb) => root.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => cb(b.dataset.tab)));
  UI.stat = ({ label, value, sub, extra, tone }) => `<div class="stat ${tone || ''}"><span class="stat-l">${esc(label)}</span><strong class="stat-v">${value}</strong>${sub ? `<span class="stat-s">${sub}</span>` : ''}${extra || ''}</div>`;
  UI.progress = (pct) => `<div class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${Math.max(0, Math.min(100, pct))}%"></span></div>`;
  UI.monthNav = (month, id = '') => `<div class="month-nav" ${id ? `id="${id}"` : ''}><button class="icon-btn" data-nav="-1" aria-label="Mês anterior">${UI.icon('chevL')}</button><strong>${esc(U.monthLabel(month))}</strong><button class="icon-btn" data-nav="1" aria-label="Próximo mês">${UI.icon('chevR')}</button></div>`;

  UI.filters = (defs, state) => `<div class="filters">${defs.map((d) => {
    const v = state[d.key] == null ? '' : state[d.key];
    if (d.type === 'search') return `<div class="f search">${UI.icon('search', 16)}<input type="search" data-f="${d.key}" placeholder="${esc(d.label)}" value="${esc(v)}"></div>`;
    if (d.type === 'month') return `<label class="f"><span>${esc(d.label)}</span><input type="month" data-f="${d.key}" value="${esc(v)}"></label>`;
    return `<label class="f"><span>${esc(d.label)}</span><select data-f="${d.key}">${d.options.map(([val, lab]) => `<option value="${esc(val)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(lab)}</option>`).join('')}</select></label>`;
  }).join('')}</div>`;
  UI.bindFilters = (root, state, cb) => root.querySelectorAll('[data-f]').forEach((el) => {
    el.addEventListener(el.type === 'search' ? 'input' : 'change', () => { state[el.dataset.f] = el.value; cb(); });
  });

  UI.opts = {
    patients: (blank) => [['', blank || '— selecione —'], ...U.sortBy(CP.patients.all(), (p) => U.norm(p.name)).map((p) => [p.id, p.name])],
    years: () => {
      const ys = new Set([U.today().slice(0, 4)]);
      ['payments', 'expenses', 'sales', 'sessions'].forEach((k) => CP[k].all().forEach((r) => { if (r.date) ys.add(U.yearOf(r.date)); }));
      return [...ys].sort().reverse();
    },
    list: (list, blank) => (blank ? [['', blank], ...list] : list),
  };

  UI.print = (html) => {
    const pa = document.getElementById('printArea');
    pa.innerHTML = html;
    document.body.classList.add('printing');
    const done = () => { document.body.classList.remove('printing'); pa.innerHTML = ''; window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    setTimeout(() => { try { window.print(); } catch (e) { done(); } }, 60);
  };
})();
