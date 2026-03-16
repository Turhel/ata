# Regras Técnicas e Arquiteturais do Projeto ATA

Este documento define regras obrigatórias para manter o projeto estável, barato e sustentável dentro das limitações atuais (Vercel Hobby, Supabase Free, Turso).

## 🎯 Regra-mãe (não negociável)
        
A prioridade do projeto é reduzir custo operacional e egress, mesmo que isso sacrifique tempo real, granularidade ou “pureza arquitetural”.

**Se existir conflito entre:**

- mais requisições

- mais cache

👉 sempre escolher mais cache.

## 🧱 Arquitetura de API (Vercel)

- ✅ Regra: API monolítica por necessidade

    1. Todo backend roda **preferencialmente** com um **número mínimo** de Serverless Functions, usando **catch-alls** (routers) em vez de “1 function por endpoint”:

        - `api/[...route].ts` (catch-all raiz)

    2. Isso é intencional para:

        - respeitar o limite do plano Hobby (12 functions),
        - reduzir cold starts,
        - centralizar autenticação, logs e controle de egress.

- ❌ Proibido

    - Criar arquivos em `/api/*` no formato “1 endpoint = 1 function”
    - Criar rotas “bonitinhas” que explodem o número de functions e quebram o limite do plano

- ⚠️ Exceções (quando necessário)
  - É permitido ter **alguns catch-alls dedicados por namespace** (ex.: `api/orders/[...route].ts`) quando isso for necessário para estabilizar deploy/roteamento em produção, desde que o total de functions permaneça baixo.
  - Se a Vercel não estiver roteando `/api/legacy/*` corretamente via catch-all raiz, é permitido manter um catch-all dedicado em `api/legacy/[...route].ts` para estabilizar o legacy.

- 📏 Budgets (guardrails)
  - **Vercel Functions:** meta `<= 10` (com `>= 2` slots livres). Limite hard: 12.
  - **GET por tela:** ideal `<= 3` no carregamento e `<= 1–2` por interação (troca de filtro/aba).
  - **Polling:** visível `>= 60s`; em background `>= 5min`.
  - Referência detalhada: `docs/README-otimizacao.md`.

- ✅ Padrão correto
    ```
    api/
        [...route].ts     # router + middleware
        legacy/
            [...route].ts # catch-all dedicado (legacy/compat), quando necessário
        orders/
            [...route].ts # catch-all dedicado (namespace), quando necessário
        payments/
            [...route].ts # catch-all dedicado (namespace), quando necessário
        inspectors/
            [...route].ts # catch-all dedicado (namespace), quando necessário

    server/
        _lib/             # db, auth, utils (server-only)
        api/              # endpoints novos (/api/*)
        legacy/           # endpoints legados (/api/legacy/*)
    ```

## 🔀 Roteamento interno

- O ```api/[...route].ts``` não contém lógica de negócio

- Ele apenas:

    - valida auth

    - identifica rota + método

    - delega para handlers

- Regra prática (estabilidade do deploy):
  - Evitar imports estáticos de muitos handlers no topo do arquivo de Function; um único erro de import/parse pode causar `FUNCTION_INVOCATION_FAILED` e derrubar a Function inteira.
  - Preferir `import()` dinâmico dentro do handler/branch de rota (e tratar erro), especialmente para módulos opcionais (ex.: COLD/Turso) ou rotas raras.
  - Importante: manter o `import("...")` com **string literal** (bundlable). Evitar `import(path)` com variável/genérico, pois pode gerar `ERR_MODULE_NOT_FOUND` em runtime se o arquivo não for empacotado.

**Exemplo mental:**
```
    routes["GET /orders"] → handlers.orders.list

    routes["POST /scopes"] → handlers.scopes.create
```

## 🔐 Autenticação e identidade
### Fonte da verdade

- Clerk é usado apenas para autenticação

- Supabase `users.id` é a identidade interna do sistema (**tratar como string**; em muitas instâncias é UUID, mas não assumir tipo)

### Regras obrigatórias

- Nunca salvar clerk_user_id como FK operacional

- Sempre resolver:

    ```Clerk → clerk_user_id → users.id```

### Isso vale para:

- ```orders.assistant_id```

- ```scopes.created_by```

- ```scope_items.done_by_user_id```

- ```team_assignments.*```

## 🗃️ Banco de dados

### ♨️ Supabase (HOT)

- Usado para:

    - dados operacionais

    - telas ativas

    - frequente

### 🧊 Turso (COLD)

- Usado para:

    - métricas agregadas

    - histórico

    - dados que não mudam

    - livro-caixa de pagamentos (snapshot): `payment_batches`, `payment_batch_items` e `payments` (evento de pagamento)
      - No Turso (SQLite), timestamps/datas são armazenados como `TEXT` (ISO string)

❌ Nunca fazer JOIN entre Supabase e Turso
❌ Nunca usar Turso para telas operacionais

## 📦 Queries e egress (Supabase)
### ❌ Proibido

- select *

- polling < 60s

- Calcular “saldo aberto” no client paginando `/api/orders` (ex.: varrer `closed` e subtrair batch-items)

- refetch automático em:

    - focus

    - reconnect

    - visibility change

### ✅ Obrigatório

- Paginação (limit + cursor)

- Buscar somente colunas necessárias

- Cache agressivo no client

- ```staleTime``` alto

- Atualizar cache local após mutations (não refetch geral)

- Para **saldo aberto** (Assistente), usar endpoint dedicado (`GET /api/payments/open-balance`) e manter o HOT com ponteiros (`orders.last_payment_batch_id/last_batched_at`) quando o loteamento for feito no COLD.
  - Compat: `GET /api/open-balance` permanece como alias para clientes antigos.

## 🔁 Polling e Realtime

- Polling (padrão): **5 min** quando visível; **30 min** quando em background (document.hidden).
- Se uma tela realmente precisar de algo mais próximo de real-time, permitir **60–180s** (com justificativa de custo/egress).

- Se document.hidden === true:

    - pausar polling ou

    - usar ≥ 30 minutos

- Freeze por inatividade (economia):
  - Se o usuário ficar **~10s sem interação**, o app “congela” atualizações automáticas (requests GET ficam em espera).
  - Ao voltar a interagir, as queries ativas são invalidadas e atualizam (uma vez).
  - Ao perder foco (trocar de aba ou janela/programa), o app congela automaticamente (reduz egress).
  - Exceção (usar com parcimônia): fluxos longos iniciados pelo usuário (ex.: importações) podem passar `bypassFreeze: true` no wrapper de fetch para não “pausar” no meio do processamento.
  - Exceção (ainda mais rara): se o fluxo **precisa continuar mesmo com a aba/janela em background**, usar `allowWhenHidden: true` junto com `bypassFreeze: true`.
  - Preferir sempre cache no browser (React Query persist + localStorage com TTL) para telas de histórico/listas e invalidar o cache após mutations, ao invés de polling/refetch geral.

- Realtime só quando:

    - evento realmente importa

    - atualização pontual (1 item)

## 🧠 Frontend

### Estado e dados

- React Query é obrigatório

- Hooks concentram:

    - fetch

    - cache

    - polling (quando existir)

### Componentes

- Nunca fazem fetch direto

- Apenas consomem hooks

## 🧾 Escopos (scopes)

### Assistente:

- cria

- edita

- finaliza

### Inspetor:

- faz login normal (Clerk) e escolhe persona em `/welcome`
- só acessa o dashboard quando tiver um **código atribuído** (slot) pelo Master
- **não** deve carregar listagens completas de escopos no celular (evitar egress/payload)
  - preferir endpoint de busca pontual (ex.: `/api/scopes/lookup?external_id=WORDER`)
- visualiza o escopo e itens
- checklist no mobile é **somente leitura** por enquanto (sem persistência)

### Quando todos os itens estão concluídos:

- escopo entra em standby por 3 dias

- depois pode ser arquivado

## 🧨 Regra de sobrevivência

Se algo “fica mais simples” mas aumenta custo, egress ou risco de deploy → não faça.
