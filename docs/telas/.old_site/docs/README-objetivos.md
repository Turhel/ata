# Objetivos do Projeto ATA (Status Atual)

> Última atualização: 2026-02-15  
> Fonte de verdade das regras: `docs/README-regras.md`  
> Estado técnico/decisões: `docs/README-HANDOFF.md`

Este documento lista os objetivos por fase, com status (✅ concluído / 🟡 em andamento / 🔴 pendente) e critérios claros de “pronto”.

---

## 🎯 Norte do projeto (não muda)

- **Reduzir ao máximo o egress do Supabase** (mesmo que sacrifique “tempo real”).
- **Sem Supabase no browser**: todo acesso ao banco passa por `/api/*` (Vercel Functions) com Clerk.
- **IDs internos**: FKs e auditoria usam `public.users.id` (ID interno — tratar como string; geralmente UUID). `clerk_user_id` é só auth/lookup.

---

## ✅ Concluído (base sólida)

### Arquitetura/Backend

- API própria em Vercel (`/api/*`) com roteamento centralizado:
  - `api/[...route].ts` (catch-all principal)
  - `api/legacy/[...route].ts` (catch-all dedicado do legacy, para estabilizar produção)
  - (quando necessário) catch-alls dedicados por namespace, mantendo poucas functions (ex.: `api/orders/[...route].ts`, `api/payments/[...route].ts`, `api/inspectors/[...route].ts`)
- Separação HOT/COLD:
  - Supabase (Postgres HOT) para dados operacionais
  - Turso (COLD) para histórico/métricas/arquivo (com init lazy para evitar crash em deploy)
- Auth e identidade:
  - Clerk JWT → resolve para `users.id` no backend (IDs internos como padrão)
  - Token inválido/expirado retorna **401** (evita 500 mascarado)
- RBAC hardening em endpoints legacy sensíveis (ex.: audit logs, notifications, order-history, payment-*).
- Proteção contra cache indevido em APIs autenticadas:
  - client usa `fetch(..., { cache: "no-store" })`
  - API responde com `Cache-Control: private, no-store` + `Vary: Authorization` (evita 304/ETag quebrando XHR)

### Frontend / Dados

- React Query + cache agressivo (persistência via localStorage hoje; IndexedDB opcional quando aplicável).
- Polling controlado (>= 60s, com comportamento melhor quando `document.hidden`).
- Hooks centralizam acesso a dados (componentes não fazem fetch “na unha”).

### Migração de dados (legado → IDs internos)

- Principais endpoints legacy já retornam/aceitam `users.id` e mantêm compat quando necessário.
- Requests consolidados em `public.requests` (subtipos em `payload.req` quando preciso).

---

## 🟡 Em andamento (estabilização + migração gradual)

### Migração do legado (telas e rotas)

- Migrar telas críticas do **Assistente** para a API nova (`/api/orders`), reduzindo dependência de `legacy/orders`.
- Reduzir divergência de “shapes” entre endpoints (evitar regras ad-hoc por tela).

**Critério de pronto**
- Assistente consegue trabalhar 100% do dia a dia sem depender de `legacy/orders`.
- `legacy/orders` vira fallback (somente leitura/compat), sem features novas.

### Escopos

- Finalizar UX do checklist (assistente) e consistência de estados (concluído → standby → arquivado).
- Dashboard “lookup” para inspetor por `external_id` (acesso autenticado, sem persistência de checks).

**Critério de pronto**
- Fluxo completo assistente → inspetor estável + baixo egress; sem “gambiarras” de polling.

---

## 🔴 Pendente (curto prazo — para “produção interna”)

### Padronização técnica

- Padronizar envelope de resposta quando fizer sentido (sem quebrar compat do legacy).
- Bundle: manter exports de PDF/XLSX em **lazy-load** (code-splitting) para reduzir o chunk inicial e melhorar UX.

### Otimização global (GET/egress/functions)

- Seguir o plano em `docs/README-otimizacao.md` (budgets, fases e checklist).
- Reduzir GET por tela (evitar loops, evitar varreduras no client, preferir endpoints agregados + cache).
- Manter Vercel Functions em **≤ 10** (com **≥ 2 slots livres** para emergências).

### Observabilidade e operação

- Checklist de “release” (env vars, Clerk keys prod, Turso/Supabase health check, smoke tests).
- Logs mínimos e rastreáveis para ações sensíveis (auditoria barata).

---

## 🧠 Estratégico (médio prazo)

### Custos e egress

- Monitorar egress mensal e definir budget/alerta operacional.
- Evitar refetches “full list”; sempre delta/cursor e merges no cache local.

### Dados / Performance

- Arquivamento automático (Turso) para histórico que não precisa ficar no HOT.
- Métricas consolidadas (diário/semanal) com payload pequeno.

---

## 🚫 Fora de escopo (por enquanto)

- Notificações em tempo real (push/realtime).
- App mobile nativo.
- “Microserviços” na cloud (a regra é manter simples e barato).

---

## 🧩 Próxima iniciativa (só depois do core estar 100%)

- **ATA Tools — Local Routing Engine** (`docs/README-tools-routing.md`): roteirização local (sem APIs pagas), rodando via localhost.
