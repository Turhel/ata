# Plano de Otimização Global — ATA Production

> Última atualização: 2026-02-15  
> Regras (fonte de verdade): `docs/README-regras.md`  
> Estado/histórico (handoff): `docs/README-HANDOFF.md`

Este documento existe para **planejar e guiar** a otimização do portal como um todo:

- menos **GET** (menos XHR/Fetch por tela)
- menos **egress** do Supabase (HOT)
- menos risco de **deploy/roteamento** (Vercel)
- manter **headroom** no limite de **Vercel Functions (Hobby = 12)**

---

## ✅ Definição de pronto (DoD)

Consideramos a otimização “completa” quando:

1. Nenhuma tela dispara “loops” de GET (tempestade de requests).
2. As telas principais respeitam um **budget** de requests por interação (abaixo).
3. A maioria das leituras está coberta por **cache** (React Query + persistência) e não faz refetch desnecessário.
4. O backend oferece **endpoints agregados** onde hoje o client precisa paginar/varrer listas.
5. Total de Vercel Functions fica em **≤ 10** (mantendo **≥ 2 slots livres**).
6. Legacy pode ser desligado com segurança (`DISABLE_API_LEGACY=1`) após validar uso real via logs.

---

## 📏 Como medir (antes/depois)

### 1) Browser (o que mais importa)

- DevTools → Network:
  - contar quantos requests acontecem ao **abrir a tela**
  - contar requests ao **trocar filtro**
  - confirmar que não há repetição contínua sem ação do usuário

### 2) Vercel (produção)

- Exportar logs CSV por deployment e agrupar por:
  - `path` (quais endpoints são mais chamados)
  - `status` (4xx/5xx)
  - `x-vercel-error` (especialmente `NOT_FOUND/static 404`)

### 3) Budget de Functions

- `docs/vercel-functions-inventory.md` é a referência prática do total de functions.
- Regra de segurança: manter o inventário sempre atualizado quando mexer em `/api`.

---

## 🧮 Budgets (guardrails)

### Vercel Functions

- **Meta:** `<= 10` functions totais.
- **Hard limit:** 12 (Hobby).
- **Regra prática:** manter **≥ 2 slots livres** para correções emergenciais.
- **Não criar “1 function por endpoint”.**
  - Se precisar de roteamento extra por bug da Vercel (static 404), usar **catch-all por namespace** e justificar no HANDOFF.

### GET por tela (budget de rede)

- **Carregamento inicial de uma tela:** ideal `<= 3` requests (sem contar assets).
- **Trocar filtro/aba:** ideal `<= 1–2` requests.
- **Listas grandes:** 1 request por página (cursor) e **nunca** “varrer tudo” no client para calcular um número.

### Polling

- Padrão do app: **5 min** (visível) / **30 min** (hidden).
- Se uma tela realmente precisar de algo mais próximo de real-time: **60–180s** (com justificativa).
- Se existir escolha entre “mais requests” e “mais cache” → **escolher mais cache**.

---

## 🧱 Estratégia (o que fazemos / o que evitamos)

### Frontend

- Padrão: **React Query** para leitura + cache.
- Persistência (atual): React Query persist em **localStorage** (ver `src/lib/reactQueryPersist.ts`).
  - (Opcional futuro) migrar persistência para IndexedDB, se/onde fizer sentido.
- Evitar `useEffect` com `fetch()` direto em páginas/componentes.
- Evitar duplicação de camada de cache (ex.: localStorage manual + React Query) quando não for necessário.

### Backend

- Preferir endpoints agregados/estatísticos (ex.: `GET /api/orders/stats`) para evitar paginação no client.
- Queries enxutas:
  - sem `select *`
  - sem N+1
  - limitar colunas e payload
- Cache HTTP público não é objetivo (respostas são autenticadas).

### Vercel / roteamento

- Roteamento via catch-all + imports dinâmicos.
- Remover functions redundantes quando o namespace já é roteado por um catch-all maior.
- Antes de remover um catch-all “de estabilidade”, validar em produção (evitar `static 404`).

---

## 🗺 Plano por fases (checklist)

### Fase 0 — Baseline e guardrails (docs + operação)

- [ ] Definir uma lista de “telas críticas” e seus budgets (Assistente/Admin/Master).
- [x] Garantir que `docs/vercel-functions-inventory.md` esteja consistente com o repo.
- [ ] Padronizar onde registrar otimizações no HANDOFF (sempre linkar para este doc).
- [ ] Criar um mini-playbook de “como checar GET por tela” (Network tab + Vercel CSV).

### Fase 1 — Frontend (reduzir GET)

- [x] Unificar os clients (`src/lib/apiClient.ts` vs `src/lib/api.ts`) em um padrão único.
- [ ] Migrar hooks legados (state + `useEffect`) para React Query quando houver ROI:
  - work types / inspectors / manuals / invitations / notifications / team assignments
- [ ] Garantir `queryKey` estável e `staleTime` coerente por tipo de dado.
- [ ] Evitar múltiplas chamadas para o mesmo dado na mesma tela (preferir prefetch/compartilhar query).
- [ ] Revisar persistência do React Query para não estourar `localStorage` com queries grandes (ex.: infinite queries).

### Fase 2 — Backend (reduzir egress e requests)

- [x] Criar/estender endpoints agregados para telas que hoje “varrem listas”.
  - Ex.: métricas diárias/semanas, contagens por status, comparativos, etc.
- [x] Agregar “ordens pendentes” (due date + retornos) em `GET /api/orders/pending-summary` (1 request por intervalo).
- [x] Agregar performance em `GET /api/orders/performance` e migrar telas (remove loops de paginação no client).
  - [x] `/dashboard/performance` migrou (summary + export sob demanda).
  - [x] `/admin/performance` migrou via `GET /api/orders/team-performance` (endpoint agregado para team).
- [x] `/admin/team` migrou via `GET /api/orders/assistants-activity` (remove loops + GET de profiles).
- [x] `/admin/payments` migrou via `GET /api/payments/week-summary` (remove loops + GET de work-types).
- [x] `/admin/approvals` migrou via `GET /api/orders/team-approvals` (remove paginação + GETs auxiliares).
- [x] `useTeamPayments` migrou via `GET /api/orders/team-payments` (remove loop de 20 páginas).
- [ ] Adicionar filtros/aliases de compat em endpoints novos quando necessário (evitar refactors grandes no client).
- [ ] Revisar queries críticas e adicionar índices/migrações **apenas quando houver evidência** (opcional).

### Fase 3 — Vercel Functions (reduzir e estabilizar)

- [ ] Revisar quais catch-alls por namespace são realmente necessários (por histórico de `static 404`).
- [ ] Remover functions redundantes 1 a 1, sempre validando em produção:
  - deploy → navegar telas → exportar logs → confirmar zero `NOT_FOUND/static 404`
- [ ] Manter headroom (>=2 slots livres).

### Fase 4 — Legacy cleanup (desligar com segurança)

- [ ] Usar `LOG_API_LEGACY=1` para mapear uso real em produção.
- [ ] Migrar os pontos restantes (tela por tela) para endpoints novos.
- [ ] Testar `DISABLE_API_LEGACY=1` em preview/deploy controlado.
- [ ] Quando estiver zerado:
  - remover roteamento/handlers legacy
  - considerar remover `api/legacy/[...route].ts` se não for mais necessário

### (Opcional) Fase 5 — Bundle/perf

- [x] Code-splitting de libs grandes (ex.: `xlsx`, `jspdf`) nas telas que usam export (lazy-load via `import()` em actions de export).
- [ ] Reduzir o chunk principal (Vite/Rollup) quando houver impacto real.

---

## ✅ Checklist por PR (rápido)

- [ ] Não criou nova Vercel Function sem justificar.
- [ ] Não aumentou GET por tela sem justificar.
- [ ] Preferiu cache/aggregated endpoints ao invés de paginação no client.
- [ ] Atualizou `docs/README-HANDOFF.md` (obrigatório).
- [ ] Se mexeu em `/api`, atualizou `docs/vercel-functions-inventory.md`.
