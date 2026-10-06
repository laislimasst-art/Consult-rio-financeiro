/* Backup em JSON: exportar, validar, importar e limpar */
(function () {
  'use strict';
  const CP = window.CP;
  const B = (CP.backup = {});
  B.APP = 'consultorio-psi';
  B.VERSION = 1;

  B.export = async () => ({
    app: B.APP, version: B.VERSION, exportedAt: new Date().toISOString(),
    settings: CP.settings.data, data: await CP.storage.exportAll(),
  });

  B.validate = (obj) => {
    const errors = [];
    const counts = {};
    let total = 0;
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { ok: false, errors: ['O arquivo não tem o formato esperado.'], counts, total };
    if (obj.app !== B.APP) errors.push('Este arquivo não parece ser um backup deste sistema.');
    if (!obj.data || typeof obj.data !== 'object') errors.push('O backup não contém a seção de dados.');
    else {
      CP.storage.STORES.forEach((s) => {
        const arr = obj.data[s];
        if (arr === undefined) return;
        if (!Array.isArray(arr)) { errors.push(`A seção "${s}" deveria ser uma lista.`); return; }
        arr.forEach((r, i) => { if (!r || typeof r !== 'object' || typeof r.id !== 'string' || !r.id) errors.push(`Registro ${i + 1} de "${s}" sem identificador válido.`); });
        counts[s] = arr.length; total += arr.length;
      });
    }
    if (obj.settings !== undefined && (typeof obj.settings !== 'object' || obj.settings === null)) errors.push('As configurações do backup são inválidas.');
    return { ok: errors.length === 0, errors: errors.slice(0, 6), counts, total };
  };

  B.import = async (obj) => {
    const data = {};
    CP.storage.STORES.forEach((s) => { data[s] = obj.data[s] || []; });
    await CP.storage.replaceAll(data);
    CP.db.reset(data);
    if (obj.settings && typeof obj.settings === 'object') CP.settings.replace(obj.settings);
    CP.settings.save({ seeded: true });
  };

  B.clear = async () => {
    await CP.storage.clearAll();
    CP.db.reset();
    CP.settings.save({ seeded: true });
  };
})();
