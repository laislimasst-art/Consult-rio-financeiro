/* Configurações e backup */
(function () {
  'use strict';
  const CP = window.CP, U = CP.U, UI = CP.UI, esc = U.esc, B = CP.backup;

  function fileName() { return `backup-consultorio-${U.today()}.json`; }

  async function exportBackup() {
    const payload = await B.export();
    U.download(fileName(), JSON.stringify(payload, null, 2));
    CP.settings.save({ lastBackup: new Date().toISOString() });
    UI.toast('Backup exportado.');
    CP.App.refresh();
  }

  async function importBackup(file) {
    if (!file) return;
    let obj;
    try { obj = JSON.parse(await U.readText(file)); }
    catch (e) { UI.toast('Este arquivo não é um JSON válido.', 'err'); return; }
    const v = B.validate(obj);
    if (!v.ok) {
      UI.modal({ title: 'Backup inválido', body: `<p class="confirm-msg">O arquivo não foi importado e seus dados atuais continuam intactos.</p><ul>${v.errors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>` });
      return;
    }
    const ok = await UI.confirm({
      title: 'Importar backup', confirmText: 'Substituir dados', danger: true,
      message: `O arquivo é válido e contém <strong>${v.total} registro(s)</strong>.<br><br>Isso substituirá os dados atuais. Deseja continuar?`,
    });
    if (!ok) return;
    try { await B.import(obj); UI.toast('Backup importado com sucesso.'); CP.App.rebuildShell(); CP.App.go('dashboard'); }
    catch (e) { console.error(e); UI.toast('Não foi possível importar o backup.', 'err'); }
  }

  async function clearAll() {
    const first = await UI.confirm({ title: 'Limpar todos os dados', confirmText: 'Continuar', danger: true, message: 'Todos os pacientes, pagamentos, despesas e demais registros serão apagados deste navegador. <strong>Recomendamos exportar um backup antes.</strong>' });
    if (!first) return;
    const m = UI.modal({ title: 'Confirmação final', footer: true, body: '<p class="confirm-msg">Para confirmar, digite <strong>APAGAR</strong> abaixo. Esta ação não pode ser desfeita.</p><div class="field"><input id="cfm" type="text" autocomplete="off" aria-label="Digite APAGAR"></div>' });
    m.foot.innerHTML = '<button class="btn ghost" data-n>Cancelar</button><button class="btn danger-solid" data-y disabled>Apagar tudo</button>';
    const inp = m.body.querySelector('#cfm');
    inp.addEventListener('input', () => { m.foot.querySelector('[data-y]').disabled = inp.value.trim().toUpperCase() !== 'APAGAR'; });
    m.foot.querySelector('[data-n]').onclick = () => m.close();
    m.foot.querySelector('[data-y]').onclick = async () => { await B.clear(); m.close(); UI.toast('Todos os dados foram apagados.'); CP.App.go('dashboard'); };
  }

  CP.views.configuracoes = {
    render(root) {
      const s = CP.settings.data;
      const last = s.lastBackup ? new Date(s.lastBackup).toLocaleString('pt-BR') : 'nunca';
      root.innerHTML = UI.pageHead('Configurações', 'Dados profissionais, recibos e backup.') +
        `<section class="card"><h3>Dados profissionais e do recibo</h3><form id="sf" class="form-grid" novalidate>
          <div class="field"><label>Nome profissional</label><input name="name" value="${esc(s.name)}"></div>
          <div class="field"><label>Profissão</label><input name="profession" value="${esc(s.profession)}"></div>
          <div class="field"><label>CRP</label><input name="crp" value="${esc(s.crp)}"></div>
          <div class="field"><label>Telefone</label><input name="phone" type="tel" value="${esc(s.phone)}"></div>
          <div class="field"><label>E-mail</label><input name="email" type="email" value="${esc(s.email)}"></div>
          <div class="field"><label>Chave Pix</label><input name="pix" value="${esc(s.pix)}"></div>
          <div class="field"><label>CPF/CNPJ no recibo (opcional)</label><input name="cpf" value="${esc(s.cpf)}"></div>
          <div class="field"><label>Endereço/cidade no recibo (opcional)</label><input name="address" value="${esc(s.address)}"></div>
          <div class="field span2"><label>Texto adicional do recibo (opcional)</label><textarea name="receiptNote" rows="2">${esc(s.receiptNote)}</textarea><small>Aparece no rodapé. Nenhuma informação fiscal é adicionada automaticamente.</small></div>
          <div class="field"><label>Meta financeira mensal (R$)</label><input name="monthlyGoal" type="number" step="0.01" min="0" inputmode="decimal" value="${s.monthlyGoal || ''}"></div>
          <div class="field"><label>Logo</label><div class="img-field"><img class="img-prev" id="logoPrev" alt="" ${s.logo ? `src="${esc(s.logo)}"` : 'hidden'}><div class="img-actions"><input type="file" id="logoIn" accept="image/*"><button type="button" class="btn ghost sm" id="logoRm">Remover logo</button></div></div></div>
          <div class="field span2"><label>Categorias de despesas (uma por linha)</label><textarea name="categories" rows="6">${esc((s.expenseCategories || []).join('\n'))}</textarea></div>
          <div class="form-error span2" id="sErr" hidden></div>
          <div class="span2"><button class="btn primary" type="submit">Salvar configurações</button></div></form></section>
        <section class="card section"><h3>Backup dos dados</h3>
          <p>Na Fase 1, seus dados ficam apenas neste navegador e podem ser perdidos se o armazenamento do navegador for apagado. Exporte um backup com frequência.</p>
          <p>Último backup: <strong>${esc(last)}</strong> · Armazenamento: <strong>${CP.storage.mode === 'indexeddb' ? 'IndexedDB' : 'localStorage (plano B)'}</strong></p>
          <div class="head-actions"><button class="btn primary" id="bkExp">${UI.icon('download', 18)} Exportar backup</button>
          <button class="btn soft" id="bkImp">${UI.icon('upload', 18)} Importar backup</button><input type="file" id="bkFile" accept="application/json,.json" hidden>
          <button class="btn danger" id="bkClr">${UI.icon('trash', 18)} Limpar todos os dados</button></div></section>
        <div class="notice big">Este sistema é administrativo e financeiro. Não utilize este espaço para armazenar prontuários ou informações clínicas.</div>`;

      let logo = s.logo || '';
      root.querySelector('#logoIn').addEventListener('change', async (e) => {
        const f = e.target.files[0]; if (!f) return;
        try { logo = await U.resizeImage(f, 400, 'image/png'); const p = root.querySelector('#logoPrev'); p.src = logo; p.hidden = false; } catch (err) { UI.toast(err.message, 'err'); }
      });
      root.querySelector('#logoRm').onclick = () => { logo = ''; root.querySelector('#logoPrev').hidden = true; root.querySelector('#logoIn').value = ''; };
      root.querySelector('#sf').addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const cats = String(fd.get('categories')).split('\n').map((c) => c.trim().toLowerCase()).filter(Boolean);
        try {
          CP.settings.save({
            name: String(fd.get('name')).trim(), profession: String(fd.get('profession')).trim(), crp: String(fd.get('crp')).trim(),
            phone: String(fd.get('phone')).trim(), email: String(fd.get('email')).trim(), pix: String(fd.get('pix')).trim(),
            cpf: String(fd.get('cpf')).trim(), address: String(fd.get('address')).trim(), receiptNote: String(fd.get('receiptNote')).trim(),
            monthlyGoal: Number(fd.get('monthlyGoal')) || 0, logo, expenseCategories: cats.length ? [...new Set(cats)] : CP.settings.DEFAULTS.expenseCategories,
          });
          UI.toast('Configurações salvas.');
          CP.App.rebuildShell(); CP.App.refresh();
        } catch (err) { const b = root.querySelector('#sErr'); b.textContent = 'Não foi possível salvar (o logo pode ser grande demais). Tente uma imagem menor.'; b.hidden = false; }
      });
      root.querySelector('#bkExp').onclick = exportBackup;
      root.querySelector('#bkImp').onclick = () => root.querySelector('#bkFile').click();
      root.querySelector('#bkFile').onchange = (e) => { importBackup(e.target.files[0]); e.target.value = ''; };
      root.querySelector('#bkClr').onclick = clearAll;
    },
  };
})();
