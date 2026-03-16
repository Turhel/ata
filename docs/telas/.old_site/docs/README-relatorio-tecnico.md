# Relatório Técnico — ATA-Production (Revisado)

> Última atualização: 2026-02-15  
> Objetivo do documento: registrar achados reais do repositório e recomendações práticas (sem “citações” artificiais).

## Resumo executivo

O **ATA-Production** é um portal web (Vite + React + TypeScript) com backend em **Vercel Functions** (`/api/*`), autenticado via **Clerk**, e com dados em dois bancos:

- **HOT:** Supabase (Postgres) para operação diária
- **COLD:** Turso (SQLite) para histórico/métricas/arquivo

A regra de ouro do projeto é **reduzir egress/custo do Supabase**, mesmo que isso implique menos “tempo real”. Por isso, a estratégia de performance é **cache no client (React Query + persistência)** + **polling controlado** + **queries enxutas**, e **não** cache HTTP público de respostas autenticadas.

Plano de otimização global (GET/egress/functions): `docs/README-otimizacao.md`.

## Estado atual (o que já está resolvido)

- **Sem Supabase no browser:** o client Supabase está desabilitado em `src/integrations/supabase/client.ts`.
- **API monolítica por design:** roteamento concentrado em poucos catch-alls (ver inventário: `docs/vercel-functions-inventory.md`).
- **Auth/IDs internos:** Clerk é só autenticação; a identidade operacional usa `public.users.id` (ID interno — tratar como string; geralmente UUID) conforme `docs/README-regras.md` e `docs/README-HANDOFF.md`.
- **Proteção contra cache indevido/304:** chamadas autenticadas usam `cache: "no-store"` no client, e a API responde com `Cache-Control: private, no-store` + `Vary: Authorization` (evita `304`/ETag quebrando XHR e evita cache público de payload autenticado).
- **Pool de DB controlado:** `server/_lib/db.ts` usa `max: 1` para evitar explosão de conexões no Supabase (é uma escolha de custo/estabilidade).

## Achados prioritários (o que ainda é “dívida”)

### 1) DX/Operação

- **`.env.example` existe**, mas precisa ser mantido atualizado quando novas env vars forem adicionadas.
- **Não há CI** (ex.: GitHub Actions) para garantir `lint/typecheck/build` em PR.
- **Dev local em 2 processos** (Vite + `vercel dev`) sem script único.

### 2) Consistência de configuração (importante)

- **Chave Clerk no frontend:** o código lê `VITE_PUBLIC_CLERK_PUBLISHABLE_KEY` (ver `src/main.tsx`) e o `README.md` deve refletir esse nome (para evitar deploy “funcionando local” e quebrando no Vercel).

### 3) Qualidade/Manutenção

- ESLint desliga regras como `@typescript-eslint/no-explicit-any` e `@typescript-eslint/no-unused-vars` em `eslint.config.js`. Isso é aceitável como “pacto com o legado”, mas aumenta risco de runtime errors e torna refactor mais custoso.
- **Sem testes automatizados** hoje. O projeto conseguiu avançar sem testes, mas a base está ficando grande o suficiente para justificar ao menos smoke tests.

## Recomendações (ordem sugerida)

### A) Curto prazo (alto retorno, baixo risco)

1. **Revisar/atualizar `.env.example`** com as variáveis reais usadas pelo projeto.
2. **Padronizar a env do Clerk publishable key** para o nome que o código usa (`VITE_PUBLIC_CLERK_PUBLISHABLE_KEY`) e alinhar o `README.md`.
3. **Adicionar CI simples** (lint + typecheck + build) para impedir regressões triviais.
4. **Adicionar script `dev:all`** (ex.: `concurrently`) para subir front+api com um comando.

### B) Médio prazo (reduz bugs e custo de manutenção)

5. **Testes mínimos (smoke)**:
   - 2–3 testes para rotas críticas (`/api/health`, `/api/env-check`, `/api/me`, `/api/orders?limit=1`)
   - foco em “não quebrar deploy” (não precisa virar uma suíte completa agora)

## Não-objetivos (por enquanto)

- **Migrar para “tudo local” (Postgres local / Keycloak / etc.)**: pode ser explorado no futuro, mas hoje foge do objetivo principal (estabilizar com baixo egress e pouca complexidade).
- **Tool de roteamento local** (`docs/README-tools-routing.md`): é uma fase futura e só deve iniciar quando o core estiver 100% estável.

## Checklist de deploy (Vercel) — mínimo viável

### Frontend (build do Vite)

- `VITE_PUBLIC_CLERK_PUBLISHABLE_KEY`

### Backend (Vercel Functions)

- `CLERK_SECRET_KEY`
- `SUPABASE_DATABASE_URL`
- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`

## Observações sobre o relatório original

- O rascunho anterior tinha “citações” do tipo `` e um trecho final em outro idioma — isso não era rastreável no repo e foi removido.
- O arquivo `docs/deep-research-report.md` não existe atualmente no repositório; se ele existir fora do git, vale trazer para `docs/` ou remover a referência.
