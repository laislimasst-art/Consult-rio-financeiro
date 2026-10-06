/*
 * CAMADA DE DADOS (única que conhece IndexedDB/localStorage).
 * A interface NUNCA acessa o navegador diretamente: UI → Services → Storage.
 *
 * FASE 2: para migrar ao Supabase, reescreva os métodos deste arquivo
 * (getPatients, savePatient, deletePatient, getPayments, ...) mantendo
 * os mesmos nomes e retornos (Promises). Veja o README.
 */
(function () {
  'use strict';
  const CP = (window.CP = window.CP || {});

  // store → [nome plural, nome singular] usados nos métodos getX / saveX / deleteX
  const ENTITIES = {
    patients: ['Patients', 'Patient'],
    payments: ['Payments', 'Payment'],
    sessions: ['Sessions', 'Session'],
    expenses: ['Expenses', 'Expense'],
    fixedExpenses: ['FixedExpenses', 'FixedExpense'],
    products: ['Products', 'Product'],
    sales: ['Sales', 'Sale'],
    leads: ['Leads', 'Lead'],
    followups: ['Followups', 'Followup'],
    goals: ['Goals', 'Goal'],
    achievements: ['Achievements', 'Achievement'],
    events: ['Events', 'Event'],
    receipts: ['Receipts', 'Receipt'],
  };
  const STORES = Object.keys(ENTITIES);
  const DB_NAME = 'consultorio-psi';
  const DB_VERSION = 1;
  const FALLBACK_KEY = 'cp_fallback_data';
  const SETTINGS_KEY = 'cp_settings';

  let db = null;
  let mode = 'indexeddb';
  let mem = {};

  /* ---------- Driver IndexedDB ---------- */
  const idb = {
    open() {
      return new Promise((res, rej) => {
        if (!window.indexedDB) return rej(new Error('IndexedDB indisponível'));
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          STORES.forEach((s) => { if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s, { keyPath: 'id' }); });
        };
        req.onsuccess = () => res(req.result);
        req.onerror = () => rej(req.error);
        req.onblocked = () => rej(new Error('IndexedDB bloqueado'));
      });
    },
    getAll: (s) => new Promise((res, rej) => { const r = db.transaction(s).objectStore(s).getAll(); r.onsuccess = () => res(r.result || []); r.onerror = () => rej(r.error); }),
    put: (s, rec) => new Promise((res, rej) => { const t = db.transaction(s, 'readwrite'); t.objectStore(s).put(rec); t.oncomplete = () => res(rec); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); }),
    remove: (s, id) => new Promise((res, rej) => { const t = db.transaction(s, 'readwrite'); t.objectStore(s).delete(id); t.oncomplete = () => res(); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); }),
    replaceAll: (data) => new Promise((res, rej) => {
      const t = db.transaction(STORES, 'readwrite');
      STORES.forEach((s) => { const os = t.objectStore(s); os.clear(); (data[s] || []).forEach((r) => os.put(r)); });
      t.oncomplete = () => res(); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
    }),
  };

  /* ---------- Driver localStorage (plano B se IndexedDB falhar) ---------- */
  const ls = {
    load() { try { mem = JSON.parse(localStorage.getItem(FALLBACK_KEY)) || {}; } catch (e) { mem = {}; } STORES.forEach((s) => { mem[s] = mem[s] || []; }); },
    persist() { localStorage.setItem(FALLBACK_KEY, JSON.stringify(mem)); },
    async getAll(s) { return mem[s].slice(); },
    async put(s, rec) { const i = mem[s].findIndex((x) => x.id === rec.id); if (i >= 0) mem[s][i] = rec; else mem[s].push(rec); ls.persist(); return rec; },
    async remove(s, id) { mem[s] = mem[s].filter((x) => x.id !== id); ls.persist(); },
    async replaceAll(data) { STORES.forEach((s) => { mem[s] = (data[s] || []).slice(); }); ls.persist(); },
  };
  const driver = () => (mode === 'indexeddb' ? idb : ls);

  const storage = (CP.storage = {
    STORES, ENTITIES,
    async init() {
      try { db = await idb.open(); mode = 'indexeddb'; }
      catch (e) { console.warn('IndexedDB indisponível, usando localStorage.', e); mode = 'localStorage'; ls.load(); }
      return mode;
    },
    get mode() { return mode; },
    getAll: (s) => driver().getAll(s),
    put: (s, rec) => driver().put(s, rec),
    remove: (s, id) => driver().remove(s, id),
    replaceAll: (data) => driver().replaceAll(data),
    clearAll() { const empty = {}; STORES.forEach((s) => { empty[s] = []; }); return driver().replaceAll(empty); },
    async exportAll() { const data = {}; for (const s of STORES) data[s] = await driver().getAll(s); return data; },

    /* Configurações simples ficam no localStorage */
    getSettings() { try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; } catch (e) { return {}; } },
    saveSettings(obj) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(obj)); },
  });

  // Métodos nomeados (formato pedido): getPatients / savePatient / deletePatient, getPayments ...
  Object.entries(ENTITIES).forEach(([store, [plural, singular]]) => {
    storage['get' + plural] = () => storage.getAll(store);
    storage['save' + singular] = (rec) => storage.put(store, rec);
    storage['delete' + singular] = (id) => storage.remove(store, id);
  });
})();
