# Meu Consultório — Fase 1

Sistema web administrativo e financeiro para consultório de psicologia online.
**HTML + CSS + JavaScript puro**, sem backend, sem build, sem Node. Funciona no **GitHub Pages**.

> **Aviso:** este sistema é exclusivamente administrativo e financeiro. **Não armazene prontuários, diagnósticos, conteúdo de sessão, anamnese ou qualquer dado clínico.**

---

## 1. Como baixar o projeto

- **Pelo ZIP:** baixe `consultorio.zip` e extraia a pasta `consultorio`.
- **Pelo GitHub (depois de publicar):** botão verde **Code → Download ZIP**.

## 2. Como abrir localmente

1. Extraia a pasta.
2. Dê dois cliques em `index.html` (abre no navegador).
3. Opcional, mais estável: dentro da pasta, rode `python3 -m http.server 8000` e acesse `http://localhost:8000`.

Observações:
- Os **gráficos** (tela Evolução) e as **fontes** usam a internet (CDN). Sem internet, o sistema funciona normalmente; só os gráficos e a tipografia ficam simplificados.
- Os dados ficam no navegador **e no endereço** em que você abriu. Abrir por `file://` e depois pelo GitHub Pages são “lugares” diferentes: **os dados não são compartilhados**. Para mover dados, use o backup (seção 6).

## 3. Como publicar no GitHub

1. Crie uma conta em github.com e clique em **New repository**.
2. Nome sugerido: `consultorio`. Marque **Public** (GitHub Pages grátis exige repositório público, salvo planos pagos).
3. Clique em **uploading an existing file** e envie **todo o conteúdo** da pasta (`index.html`, `css/`, `js/`, `assets/`, `README.md`).
4. Clique em **Commit changes**.

> **Privacidade:** o *código* fica público, mas **seus dados não vão para o GitHub**. Eles ficam apenas no armazenamento do seu navegador. **Nunca suba arquivos de backup (.json) para o repositório.**

## 4. Como ativar o GitHub Pages

1. No repositório: **Settings → Pages**.
2. Em **Build and deployment → Source**, escolha **Deploy from a branch**.
3. Branch: `main`, pasta `/ (root)` → **Save**.
4. Aguarde 1–2 minutos. O endereço será `https://SEU-USUARIO.github.io/consultorio/`.

Todos os caminhos são relativos, então funciona em subpastas como essa.

## 5. Como acessar pelo celular

1. Abra o endereço do GitHub Pages no navegador do celular.
2. **Adicionar à tela inicial:** iPhone (Safari) → Compartilhar → *Adicionar à Tela de Início*. Android (Chrome) → ⋮ → *Adicionar à tela inicial*.
3. **Importante:** na Fase 1 o celular e o computador **não sincronizam**. Cada aparelho tem seus próprios dados. Escolha **um aparelho principal** ou transfira dados por backup. A sincronização chega na Fase 2.

## 6. Backup (essencial na Fase 1)

Os dados ficam no navegador e **podem ser perdidos** se você limpar dados do site, trocar de aparelho ou usar aba anônima.

- **Configurações → Exportar backup:** baixa `backup-consultorio-AAAA-MM-DD.json` com tudo.
- **Configurações → Importar backup:** o arquivo é validado antes; depois aparece “Isso substituirá os dados atuais. Deseja continuar?”.
- **Limpar todos os dados:** confirmação em duas etapas (inclui digitar APAGAR).
- O painel avisa se o último backup tem mais de 14 dias. **Sugestão: exporte toda semana e guarde em local seguro (não público).**

---

## Arquitetura

```
UI (js/views)  →  Services (js/services)  →  Storage (js/core/storage.js)
```

```
consultorio/
├── index.html
├── README.md
├── assets/favicon.svg
├── css/  style.css · responsive.css
└── js/
    ├── app.js                  rotas, menu, botão "+", inicialização
    ├── core/
    │   ├── utils.js            datas, moeda, valor por extenso
    │   ├── storage.js          ÚNICO arquivo que toca IndexedDB/localStorage
    │   ├── store.js            cache em memória + fábrica de serviços + configurações
    │   └── ui.js               modal, formulário, toast, tabela, filtros
    ├── services/               regras de negócio (sem HTML)
    │   ├── patients.js · payments.js (+recibos, Carnê-Leão) · sessions.js (+agenda)
    │   ├── expenses.js · products.js · crm.js (leads, follow-up) · growth.js (metas, conquistas)
    │   ├── finance.js          TODOS os cálculos financeiros
    │   └── backup.js
    └── views/                  telas (HTML + eventos)
        └── dashboard · patients · payments · sessions · agenda · receipts · finance
            expenses · products · crm · growth (metas, conquistas, evolução) · settings · search
```

- **IndexedDB** é o armazenamento principal (um *object store* por entidade). Se o navegador bloquear, o sistema usa **localStorage** automaticamente.
- **localStorage** guarda apenas as configurações simples.
- Telas e serviços leem de um cache em memória (rápido) e gravam por `storage.js`.

## Regras financeiras (todas reais, nada inventado)

| Indicador | Regra |
|---|---|
| Receita recebida | Somente pagamentos com status **pago** + vendas pagas |
| Receita prevista | Pacote mensal = nº de sessões × valor da sessão (a partir do mês de início) + avaliação no mês da avaliação. Pagamento semanal/por sessão = valor × sessões **já agendadas** na Agenda (sem sessões agendadas, previsto = 0). Nunca é somada ao recebido |
| A receber | Previsto − recebido (nunca negativo) |
| Despesas | Somente despesas com status **pago** entram no lucro. Pendentes aparecem à parte |
| Lucro | Recebida − despesas pagas |
| Ticket médio | Receita de atendimento ÷ pacientes que pagaram no mês |
| Comparação com o mês anterior | Só aparece quando o mês anterior tem dados |

Pagamentos **parcial**, **pendente** e **estornado** não entram na receita recebida.
Cuidado para não lançar a mesma venda de produto como **venda** e como **pagamento “referente a produto”** (contaria duas vezes).
Despesas fixas: use **“Lançar fixas do mês”**; elas entram como *pendentes* até você marcá-las como pagas.

## Limitações da Fase 1

- Dados ficam em **um navegador/aparelho** (sem sincronização, sem login).
- Quem usar o mesmo navegador tem acesso aos dados (não há senha).
- Sem lembretes por push/e-mail; os alertas aparecem ao abrir o sistema.
- Gráficos e fontes dependem de CDN (internet).
- Imagens (logo, conquistas) são reduzidas e guardadas no navegador; muitas imagens grandes ocupam espaço.
- Recibos não contêm informações fiscais além das que você configurar. Consulte seu contador para exigências do Carnê-Leão/Receita Saúde.

---

## FASE 2 — Migração para Supabase

Nada de Supabase foi implementado agora. A arquitetura já isola o armazenamento: **telas e serviços não precisam mudar**.

### Arquivos que serão modificados

| Arquivo | O que muda |
|---|---|
| `js/core/storage.js` | **Principal.** Reescrever `init`, `getAll`, `put`, `remove`, `replaceAll`, `clearAll` e `exportAll` (e, por consequência, `getPatients`, `savePatient`, `deletePatient`, `getPayments`, `savePayment`… que já são gerados em cima deles) para chamar o cliente Supabase. Manter nomes e retornos (Promises). Mapear `camelCase` ↔ `snake_case` aqui, se normalizar as tabelas |
| `js/core/store.js` | `CP.settings` passa a ler/gravar uma tabela `profiles` (hoje usa localStorage). `CP.db.load()` continua igual |
| `js/app.js` | No `boot()`, antes de carregar os dados: exigir sessão (`supabase.auth.getSession()`); sem sessão, mostrar tela de login |
| `index.html` | Incluir o script do `@supabase/supabase-js` (CDN) e um arquivo `js/core/supabase-config.js` com URL e *anon key* |
| `js/services/backup.js` | `import` passa a gravar no Supabase (`upsert` em lote); `export` lê de lá |
| `js/core/utils.js` | `uid()` deve gerar UUID (`crypto.randomUUID()`) |

### Passo a passo sugerido

1. Criar projeto no Supabase (região **São Paulo**, se disponível) e ativar **Auth por e-mail** (idealmente com 2FA).
2. Criar as tabelas. Caminho mais simples, preservando o formato atual dos registros: uma tabela por entidade (`patients`, `payments`, `sessions`, `expenses`, `fixed_expenses`, `products`, `sales`, `leads`, `followups`, `goals`, `achievements`, `events`, `receipts`) com `id uuid`, `user_id uuid default auth.uid()`, `data jsonb`, `created_at`, `updated_at`. Depois, se quiser, normalize colunas.

```sql
create table public.patients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  data jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.patients enable row level security;
create policy "dona acessa seus dados" on public.patients
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
-- repita para as demais tabelas
```

3. Reescrever `storage.js` (ex.: `getAll(store)` → `select('*')` e devolver `rows.map(r => ({...r.data, id: r.id}))`; `put` → `upsert`).
4. Adicionar a tela de login e o botão “Sair”.
5. **Migrar os dados existentes:** em cada aparelho, exportar o backup JSON da Fase 1 e importar na Fase 2 (o `import` fará o upsert).
6. Testar com a mesma bateria da Fase 1 (cadastro, pagamento, recibo, relatórios, backup).
7. Opcional: *Realtime* para sincronizar celular e computador instantaneamente; manter o backup JSON como cópia extra.

### Cuidados (LGPD)
Nome, telefone e e-mail de pacientes são dados pessoais. Na Fase 2: ative RLS em **todas** as tabelas, nunca exponha a *service role key* no front-end, use senha forte + 2FA e continue sem armazenar dados clínicos.

---

## Testes realizados

Teste automatizado em ambiente simulado (jsdom): inicialização, 14 telas, cadastro/edição/exclusão de paciente, pagamento (com preenchimento automático de valor), pagamento semanal e totais, sessões e pacote (inclui bloqueio de sessão duplicada), recibo (numeração e valor por extenso), Carnê-Leão, despesas e fixas (lançamento idempotente), produto/venda/lucro, lead, follow-up (alerta do dia), meta, conquista, busca (nome, despesa e data), cálculos (recebido ≠ previsto, pendente não conta, lucro), relatório anual, exportar/validar/importar/limpar backup e persistência após recarregar. **0 erros de JavaScript.**
**Ainda não verificado:** aparência em navegador real (desktop e celular) e impressão/PDF. Ao abrir pela primeira vez, confira esses pontos e me diga o que ajustar.
