/*
 * Cache em memória + fábrica de serviços.
 * Os serviços leem do cache (rápido, síncrono para a interface) e gravam
 * pela camada storage (assíncrona). Na Fase 2 o cache continua igual;
 * só o storage.js muda.
 */
(function () {
  'use strict';
  const CP = window.CP, S = CP.storage;
  const cache = {};
  S.STORES.forEach((s) => { cache[s] = []; });

  CP.db = {
    async load() { for (const s of S.STORES) cache[s] = await S.getAll(s); },
    reset(data) { S.STORES.forEach((s) => { cache[s] = (data && data[s]) || []; }); },
  };

  CP.makeService = function (store) {
    const singular = S.ENTITIES[store][1];
    return {
      store,
      all: () => cache[store],
      get: (id) => cache[store].find((x) => x.id === id),
      async save(rec) {
        const now = new Date().toISOString();
        const out = { ...rec };
        if (!out.id) { out.id = CP.U.uid(); out.createdAt = now; }
        out.updatedAt = now;
        await S['save' + singular](out);
        const i = cache[store].findIndex((x) => x.id === out.id);
        if (i >= 0) cache[store][i] = out; else cache[store].push(out);
        return out;
      },
      async remove(id) {
        await S['delete' + singular](id);
        cache[store] = cache[store].filter((x) => x.id !== id);
      },
    };
  };

  /* Configurações (localStorage) */
  CP.settings = {
    DEFAULTS: {
      name: 'Laís Rodrigues', profession: 'Psicóloga', crp: '05/63116',
      phone: '', email: '', pix: '', cpf: '', address: '', receiptNote: '', logo: '',
      monthlyGoal: 0, lastBackup: '', seeded: false,
      expenseCategories: ['plataformas', 'internet', 'energia', 'marketing', 'cursos', 'supervisão', 'materiais', 'hospedagem', 'domínio', 'outros'],
    },
    data: {},
    load() { this.data = { ...this.DEFAULTS, ...S.getSettings() }; },
    get(k) { return this.data[k]; },
    save(partial) { const next = { ...this.data, ...partial }; S.saveSettings(next); this.data = next; },
    replace(obj) { const next = { ...this.DEFAULTS, ...obj }; S.saveSettings(next); this.data = next; },
  };
})();
