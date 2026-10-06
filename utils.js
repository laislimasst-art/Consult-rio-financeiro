/* Utilidades gerais (sem dependência de interface ou de armazenamento) */
(function () {
  'use strict';
  const CP = (window.CP = window.CP || {});
  CP.views = CP.views || {};
  CP.actions = CP.actions || {};
  const U = (CP.U = {});
  const pad = (n) => String(n).padStart(2, '0');

  U.MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  U.WEEKDAYS = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];

  U.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  U.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  U.money = (n) => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  U.norm = (s) => String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  U.today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  U.thisMonth = () => U.today().slice(0, 7);
  U.monthKey = (d) => (d ? String(d).slice(0, 7) : '');
  U.yearOf = (d) => (d ? String(d).slice(0, 4) : '');
  U.fmtDate = (d) => (d && /^\d{4}-\d{2}-\d{2}/.test(d) ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : '—');
  U.monthLabel = (k) => (k ? `${U.MONTHS[parseInt(k.slice(5, 7), 10) - 1]} de ${k.slice(0, 4)}` : '');
  U.monthShort = (k) => U.MONTHS[parseInt(k.slice(5, 7), 10) - 1].slice(0, 3);
  U.addMonths = (k, n) => {
    let y = +k.slice(0, 4), m = +k.slice(5, 7) - 1 + n;
    y += Math.floor(m / 12); m = ((m % 12) + 12) % 12;
    return `${y}-${pad(m + 1)}`;
  };
  U.daysInMonth = (k) => new Date(+k.slice(0, 4), +k.slice(5, 7), 0).getDate();
  U.sum = (arr, fn) => arr.reduce((s, x) => s + (Number(fn ? fn(x) : x) || 0), 0);
  U.sortBy = (arr, fn, dir = 1) => arr.slice().sort((a, b) => { const x = fn(a), y = fn(b); return x < y ? -dir : x > y ? dir : 0; });
  U.debounce = (fn, ms = 150) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  U.pad = pad;

  U.download = (name, text, mime = 'application/json') => {
    const blob = new Blob([text], { type: mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
  U.readText = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsText(file); });
  U.resizeImage = (file, max = 900, type = 'image/jpeg', quality = 0.82) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onerror = () => rej(r.error);
    r.onload = () => {
      const img = new Image();
      img.onerror = () => rej(new Error('Não foi possível ler esta imagem.'));
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL(type, quality));
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  });

  /* Interpreta buscas por data: 17/08/2026, 2026-08-17, 08/2026 */
  U.parseDateQuery = (q) => {
    q = String(q || '').trim();
    let m;
    if ((m = q.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) return { type: 'day', value: `${m[3]}-${pad(m[2])}-${pad(m[1])}` };
    if ((m = q.match(/^(\d{4})-(\d{2})-(\d{2})$/))) return { type: 'day', value: q };
    if ((m = q.match(/^(\d{1,2})\/(\d{4})$/))) return { type: 'month', value: `${m[2]}-${pad(m[1])}` };
    if ((m = q.match(/^(\d{4})-(\d{2})$/))) return { type: 'month', value: q };
    return null;
  };

  /* Valor por extenso (R$) */
  const UN = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const DZ = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const CT = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
  const ate999 = (n) => {
    if (n === 0) return '';
    if (n === 100) return 'cem';
    const c = Math.floor(n / 100), r = n % 100, parts = [];
    if (c) parts.push(CT[c]);
    if (r) { if (r < 20) parts.push(UN[r]); else { const d = Math.floor(r / 10), u = r % 10; parts.push(DZ[d] + (u ? ' e ' + UN[u] : '')); } }
    return parts.join(' e ');
  };
  const inteiro = (n) => {
    if (n === 0) return 'zero';
    const mil = Math.floor(n / 1000), resto = n % 1000;
    let out = '';
    if (mil) out += mil === 1 ? 'mil' : ate999(mil) + ' mil';
    if (resto) out += (mil ? (resto < 100 || resto % 100 === 0 ? ' e ' : ' ') : '') + ate999(resto);
    return out;
  };
  U.extenso = (valor) => {
    const v = Math.round((Number(valor) || 0) * 100);
    const reais = Math.floor(v / 100), cent = v % 100;
    if (reais >= 1000000) return '';
    const parts = [];
    if (reais > 0 || cent === 0) parts.push(inteiro(reais) + (reais === 1 ? ' real' : ' reais'));
    if (cent > 0) parts.push(inteiro(cent) + (cent === 1 ? ' centavo' : ' centavos'));
    return parts.join(' e ');
  };
})();
