# Repository Audit — ATA Portal

Audit date: 2026-03-15 (local)

Repo HEAD (local): `dffa77690cc08442e3f54a1a387a5da97ddcc25b`  
Evidence (command output): `git rev-parse HEAD; git log -1 --oneline`
```
dffa77690cc08442e3f54a1a387a5da97ddcc25b
dffa776 feat: add routing M1, team ops, and xlsx tooling
```

Working tree status: **DIRTY** (3 modified files).  
Evidence (command output): `git status --porcelain=v1 -b`
```
## main...origin/main
 M apps/api/src/modules/routes/create-route-source-batch.ts
 M apps/api/src/modules/routes/create-route.ts
 M apps/api/src/routes/routes.ts
```

> Scope: this report analyzes the repository **as it exists today**. It does not implement fixes.

---

## PASS EXECUTION

### PASS 1 — Repository map & baseline
- Enumerated tracked files and core structure.
  - Evidence (command output): `git ls-files` (excerpt)
    ```
    apps/api/src/app.ts
    apps/api/src/server.ts
    apps/api/src/db/schema.ts
    apps/web/src/App.tsx
    packages/contracts/src/index.ts
    infra/docker/docker-compose.dev.yml
    docs/checklist.md
    ```

### PASS 2 — Backend/API (routes + modules)
- Enumerated endpoints from `apps/api/src/routes/*`.
  - Evidence (command output): `rg -n "app\\.(get|post|patch|delete)\\(" apps/api/src/routes -S` (excerpt)
    ```
    apps/api/src/routes\\health.ts:6:  app.get("/health", async () => {
    apps/api/src/routes\\orders.ts:61:  app.get("/orders", async (request, reply) => {
    apps/api/src/routes\\pool-import.ts:89:  app.post("/pool-import/xlsx", async (request, reply) => {
    apps/api/src/routes\\routes.ts:78:  app.post("/routes", async (request, reply) => {
    ```

### PASS 3 — Database/migrations/auth separation
- Audited operational schema (Drizzle) and auth schema (Better Auth CLI).
  - Evidence: `apps/api/drizzle.config.ts:~1-11`
    ```ts
    export default defineConfig({
      dialect: "postgresql",
      schema: "./src/db/schema.ts",
      out: "./drizzle"
    });
    ```
  - Evidence: `apps/api/src/lib/auth.ts:~14-25`
    ```ts
    authPool = new Pool({
      connectionString: env.databaseUrl,
      options: "-c search_path=auth"
    });
    ```

### PASS 4 — Security/error handling
- Reviewed CORS, auth bridge, permission helpers, and error patterns.

### PASS 5 — Code quality/testing/performance
- Ran typecheck/build/tests and scanned for TODO/FIXME.
  - Evidence (command output): `pnpm -r typecheck` (excerpt)
    ```
    apps/api typecheck: Done
    apps/web typecheck: Done
    ```
  - Evidence (command output): `pnpm test` (excerpt)
    ```
    # pass 6
    # skipped 2
    ```

### PASS 6 — Consolidation
- Consolidated findings into sections 1–17 below. Every claim includes evidence, or `Not found`.

---

## 1. Executive Summary

### Estado geral do repositório
- **Monorepo TypeScript funcional** com `apps/api` (Fastify + Drizzle + Better Auth) e `apps/web` (React + Vite).
  - Evidence: `pnpm-workspace.yaml:~1-3`
    ```yaml
    packages:
      - "apps/*"
      - "packages/*"
    ```
  - Evidence: `apps/api/src/app.ts:~12-46`
    ```ts
    export function buildApp(env: ApiEnv) {
      const app = fastify();
      registerHealthRoute(app, env);
      registerAuthRoutes(app, env);
      registerOrdersRoutes(app, env);
      return app;
    }
    ```
  - Evidence: `apps/web/package.json:~1-22`
    ```json
    {
      "name": "@ata-portal/web",
      "dependencies": {
        "@ata-portal/contracts": "workspace:*",
        "react": "^18.0.0",
        "react-dom": "^18.0.0"
      }
    }
    ```

### Maturidade do projeto
- **Núcleo operacional já existe** (orders workflow, pool import, payments batches, routes M1), mas com validação majoritariamente manual e padronização de erros parcial.
  - Evidence: `apps/api/src/routes/orders.ts:61`
    ```ts
    app.get("/orders", async (request, reply) => {
    ```
  - Evidence: `apps/api/src/routes/payment-batches.ts:28`
    ```ts
    app.get("/payment-batches", async (request, reply) => {
    ```
  - Evidence: `apps/api/src/routes/routes.ts:78`
    ```ts
    app.post("/routes", async (request, reply) => {
    ```

### Principais riscos (top 3)
1) **HIGH — Constraint conflict ao substituir rota do dia** (ordem de operações pode violar índice único parcial).
  - Evidence: `apps/api/src/db/schema.ts:619-624`
    ```ts
    uniqueIndex("routes_one_active_per_day_account_idx")
      .on(t.routeDate, t.inspectorAccountId)
      .where(sql`${t.status} in ('draft','published')`),
    ```
  - Evidence: `apps/api/src/modules/routes/create-route.ts:~162-226`
    ```ts
    await tx.insert(routes).values({ status: "draft", /* ... */ });
    if (existingActive[0]) {
      await tx.update(routes).set({ status: "superseded", supersededByRouteId: routeId }).where(eq(routes.id, existingActive[0].id));
    }
    ```

2) **MEDIUM — Deriva documental** (docs afirmam stack/estrutura que não existem no código atual).
  - Evidence: `docs/ARQUITETURA.md:~63-79`
    ```md
    * React Router
    * TanStack Query
    * Tailwind
    * shadcn/ui
    ```
  - Evidence: `apps/web/package.json:~1-22` (ausência dessas deps)
    ```json
    "dependencies": {
      "@ata-portal/contracts": "workspace:*",
      "react": "^18.0.0",
      "react-dom": "^18.0.0"
    }
    ```
  - Evidence: `docs/ESTRUTURA_INICIAL.md:205` (markup HTML indevido)
    ```html
    <pre class="overflow-visible! px-0!" data-start="3046" data-end="3349">...
    ```

3) **MEDIUM — Import pool com transação por item** (pode degradar performance em batches grandes).
  - Evidence: `apps/api/src/modules/orders/import-pool-json.ts:~492-530`
    ```ts
    for (const item of params.payload.items) {
      const result = await db.transaction(async (tx) => processPoolImportItem({ tx, /* ... */ }));
    }
    ```

### Principais pontos fortes
- Separação clara “auth (Better Auth) vs perfil operacional (public.users)” já implementada.
  - Evidence: `apps/api/src/lib/auth.ts:~14-36`
    ```ts
    authInstance = betterAuth({
      secret: env.betterAuthSecret,
      baseURL: env.betterAuthUrl,
      trustedOrigins: [env.appWebUrl],
      database: authPool
    });
    ```
  - Evidence: `apps/api/src/routes/me.ts:~7-45`
    ```ts
    const authSession = await requireAuthenticated(env, request);
    const profile = await getUserByAuthUserId(env.databaseUrl, authSession.user.id);
    return { ok: true, auth, profile, profileStatus: profile ? "linked" : "missing" };
    ```

---

## 2. Repository Map

### Root
- Root scripts do monorepo.
  - Evidence: `package.json:~1-22`
    ```json
    {
      "packageManager": "pnpm@10.15.1",
      "scripts": {
        "dev": "pnpm -r --parallel dev",
        "build": "pnpm -r build",
        "typecheck": "pnpm -r typecheck",
        "test": "pnpm -C apps/api test"
      }
    }
    ```
- `.gitignore` ignora artefatos locais essenciais.
  - Evidence: `.gitignore:~1-10`
    ```gitignore
    node_modules/
    .env
    .env.*
    !.env.example
    dist/
    ```

### apps/
- `apps/api` — API Fastify.
  - Evidence: `apps/api/src/server.ts:~1-7`
    ```ts
    const env = getEnv();
    const app = buildApp(env);
    await app.listen({ port: env.port, host: env.host });
    ```
- `apps/web` — frontend React/Vite (UI dev).
  - Evidence: `apps/web/src/App.tsx:~1-10`
    ```ts
    import { useEffect, useMemo, useState } from "react";
    import { fetchHealth, fetchMe, fetchOrders } from "./lib/api";
    ```

### packages/
- `packages/contracts` — tipos/contratos compartilhados.
  - Evidence: `apps/web/src/lib/api.ts:~1-20`
    ```ts
    import type { HealthResponse, MeResponse, OrdersListResponse } from "@ata-portal/contracts";
    ```
- `packages/shared` — helpers puros (atual: minimal).
  - Evidence: `packages/shared/src/index.ts:~1-3`
    ```ts
    export function assertUnreachable(value: never): never {
    ```

### infra/
- `infra/docker` — PostgreSQL local via Docker Compose.
  - Evidence: `infra/docker/docker-compose.dev.yml:~1-20`
    ```yml
    services:
      postgres:
        image: postgres:16-alpine
        ports:
          - "5432:5432"
    ```
- `infra/caddy` — placeholder (somente `.gitkeep` versionado).
  - Evidence: `Not found` — `infra/caddy/Caddyfile` (apenas `infra/caddy/.gitkeep` existe em `git ls-files`)

### docs/
- Documentação principal + telas + checklist + amostras de arquivos “reais”.
  - Evidence (tracked excerpt): `git ls-files`
    ```
    docs/ARQUITETURA.md
    docs/BANCO_DE_DADOS.md
    docs/FLUXO_OPERACIONAL.md
    docs/checklist.md
    docs/arquivos/InspectionsFull.xlsx
    ```

---

## 3. Architecture Analysis

### Componentes reais
- Web → API via `fetch` com cookies (`credentials: "include"`), com proxy no Vite dev.
  - Evidence: `apps/web/src/lib/api.ts:~20-35`
    ```ts
    const response = await fetch(url, {
      credentials: "include",
      ...init
    });
    ```
  - Evidence: `apps/web/vite.config.ts:~6-20`
    ```ts
    server: {
      proxy: {
        "/api": { target: "http://localhost:3001", changeOrigin: true }
      }
    }
    ```
- API usa Drizzle (operacional) e Better Auth (auth).
  - Evidence: `apps/api/src/lib/db.ts:~1-15`
    ```ts
    let pool: Pool | undefined;
    let db: ReturnType<typeof drizzle> | undefined;
    export function getDb(databaseUrl: string) {
      if (!pool) pool = new Pool({ connectionString: databaseUrl });
      if (!db) db = drizzle(pool);
      return { pool, db };
    }
    ```
  - Evidence: `apps/api/src/lib/auth.ts:~14-36` (auth pool separado + `search_path=auth`)
    ```ts
    authPool = new Pool({ connectionString: env.databaseUrl, options: "-c search_path=auth" });
    authInstance = betterAuth({ database: authPool, emailAndPassword: { enabled: true } });
    ```

### Fronteiras e acoplamento
- `packages/contracts` é consumido diretamente pelo web (bom), mas o backend não “compila contra” contracts (tipagem é por convenção).
  - Evidence: `apps/web/src/lib/api.ts:~1-20`
    ```ts
    import type { OrdersListResponse } from "@ata-portal/contracts";
    ```
  - Evidence: `apps/api/src/routes/orders.ts:114-118`
    ```ts
    return { ok: true, orders: result.orders, meta: buildListMeta(...) };
    ```

---

## 4. API Analysis

### Registro de rotas
- A API registra módulos de rotas de forma explícita e central.
  - Evidence: `apps/api/src/app.ts:~33-45`
    ```ts
    registerUsersRoutes(app, env);
    registerCatalogRoutes(app, env);
    registerPoolImportRoutes(app, env);
    registerOrdersRoutes(app, env);
    registerPaymentBatchRoutes(app, env);
    registerDashboardRoutes(app, env);
    registerRoutesRoutes(app, env);
    ```

### Lista de endpoints (fonte: código)
- Evidence (command output): `rg -n "app\\.(get|post|patch|delete)\\(" apps/api/src/routes -S` (excerpt)
  ```
  apps/api/src/routes/orders.ts:61:  app.get("/orders", async (request, reply) => {
  apps/api/src/routes/orders.ts:199:  app.get("/orders/:id/events", async (request, reply) => {
  apps/api/src/routes/orders.ts:533:  app.patch("/orders/:id", async (request, reply) => {
  apps/api/src/routes/pool-import.ts:89:  app.post("/pool-import/xlsx", async (request, reply) => {
  apps/api/src/routes/payment-batches.ts:194:  app.post("/payment-batches/:id/pay", async (request, reply) => {
  apps/api/src/routes/routes.ts:24:  app.post("/routes/source-batches/xlsx", async (request, reply) => {
  ```

---

## 5. Database & Data Model

### Schema operacional (Drizzle / `public.*`)
- Fonte de verdade: `apps/api/src/db/schema.ts`.
  - Evidence: `apps/api/src/db/schema.ts:~1-34`
    ```ts
    export const sourceOrderStatusEnum = pgEnum("source_order_status", [
      "Assigned",
      "Received",
      "Canceled"
    ]);
    export const orderStatusEnum = pgEnum("order_status", [
      "available","in_progress","submitted","follow_up","rejected",
      "approved","batched","paid","cancelled","archived"
    ]);
    ```

### Migrations operacionais (Drizzle)
- Migrations versionadas em `apps/api/drizzle/*.sql` + journal.
  - Evidence: `apps/api/drizzle/meta/_journal.json:~1-45`
    ```json
    {
      "entries": [
        { "tag": "0000_init" },
        { "tag": "0001_orders_m1" },
        { "tag": "0006_routes_m1" }
      ]
    }
    ```

### Separação auth.* vs public.*
- Drizzle config aponta apenas para `./src/db/schema.ts`.
  - Evidence: `apps/api/drizzle.config.ts:~1-11`
    ```ts
    schema: "./src/db/schema.ts",
    out: "./drizzle",
    ```
- Better Auth usa `pg.Pool` com `search_path=auth`.
  - Evidence: `apps/api/src/lib/auth.ts:~14-23`
    ```ts
    authPool = new Pool({
      connectionString: env.databaseUrl,
      options: "-c search_path=auth"
    });
    ```
- Migrations Drizzle não criam schema `auth` e não criam tabelas `auth.*`.
  - Evidence: `Not found` — `CREATE SCHEMA auth` em `apps/api/drizzle/*.sql`
  - Evidence: `Not found` — `auth.` em `apps/api/drizzle/*.sql`

### Orders + eventos + notas
- Tabelas e enums essenciais:
  - Evidence: `apps/api/drizzle/0001_orders_m1.sql:~1-20`
    ```sql
    CREATE TYPE "public"."order_event_type" AS ENUM('created','claimed','updated','submitted','follow_up_requested','resubmitted','rejected','approved','returned_to_pool','batched','paid','cancelled_from_source','archived');
    CREATE TABLE "order_events" ( "order_id" uuid NOT NULL, "event_type" "order_event_type" NOT NULL, ... );
    ```
  - Evidence: `apps/api/drizzle/0004_order_notes.sql:~1-15`
    ```sql
    CREATE TABLE "order_notes" (
      "order_id" uuid NOT NULL,
      "author_user_id" uuid NOT NULL,
      "note_type" varchar(30) NOT NULL,
      "content" text NOT NULL
    );
    ```

### Roteirização (routes M1)
- Índice único parcial “1 rota ativa por conta/dia” existe na migration.
  - Evidence: `apps/api/drizzle/0006_routes_m1.sql:~90-98`
    ```sql
    CREATE UNIQUE INDEX "routes_one_active_per_day_account_idx"
      ON "routes" USING btree ("route_date","inspector_account_id")
      WHERE "status" IN ('draft','published');
    ```
- Enum de categoria inclui valores ainda não usados na lógica de criação (exterior/interior/fint).
  - Evidence: `apps/api/src/db/schema.ts:~92-101`
    ```ts
    export const routeStopCategoryEnum = pgEnum("route_stop_category", [
      "regular","exterior","interior","fint","overdue"
    ]);
    ```

### Artefatos “reais” (docs/arquivos)
- Existem arquivos grandes versionados em `docs/arquivos` (xlsx/eml/gpx). Isso impacta tamanho do repo e diffs.
  - Evidence (command output): `git ls-files` (excerpt)
    ```
    docs/arquivos/InspectionsFull.xlsx
    docs/arquivos/Breno !.eml
    docs/arquivos/Martin Luther King Dr Main St MS57 N U.gpx
    ```

---

## 6. Business Logic Integrity

### Gates obrigatórios (sessão + perfil operacional + status + role)
- Helpers existem e definem o contrato de autenticação/autorizações.
  - Evidence: `apps/api/src/lib/permissions.ts:~33-112`
    ```ts
    export async function requireAuthenticated(...) { /* 401 */ }
    export async function requireOperationalUser(...) { /* 403 OPERATIONAL_PROFILE_MISSING */ }
    export function requireActiveUser(...) { /* 403 USER_NOT_ACTIVE */ }
    export async function requireRole(...) { /* 403 FORBIDDEN_ROLE */ }
    ```

### /orders list: comportamento por role (real)
- Admin/master: listagem ampla; assistant: scopes; inspector: explicitamente bloqueado (apesar de passar pelo `requireRole`).
  - Evidence: `apps/api/src/routes/orders.ts:61-149`
    ```ts
    const role = await requireRole({ allowed: ["admin","master","assistant","inspector"] });
    if (role === "admin" || role === "master") { /* listOrders */ }
    if (role !== "assistant") { reply.status(403); return { ok: false, error: "FORBIDDEN", message: "Role não permitida para listar orders" }; }
    ```
  - Finding: a presença de `"inspector"` em `allowed` + bloqueio posterior sugere que o “inspector view” ainda não foi desenhado, mas o role já aparece na API.

### Claim / submit / resubmit / review
- Claim com proteção de concorrência.
  - Evidence: `apps/api/src/modules/orders/claim-order.ts:~35-56`
    ```ts
    .where(and(eq(orders.id, params.orderId), eq(orders.status, "available"), isNull(orders.assistantUserId)))
    ```
- Submit bloqueia follow-up e exige campos mínimos antes de `submitted`.
  - Evidence: `apps/api/src/modules/orders/submit-order.ts:~47-88`
    ```ts
    if (row.status === "follow_up") return { ok: false, error: "INVALID_STATUS", message: "Order em follow-up deve ser reenviada via POST /orders/:id/resubmit" };
    if (!row.workTypeId) missingFields.push("work_type_id");
    ```
- Resubmit exige follow_up e registra evento `resubmitted`.
  - Evidence: `apps/api/src/modules/orders/resubmit-order.ts:~44-90`
    ```ts
    if (row.status !== "follow_up") return { ok: false, error: "INVALID_STATUS", ... };
    await tx.insert(orderEvents).values({ eventType: "resubmitted", fromStatus: "follow_up", toStatus: "submitted" });
    ```
- Follow-up/reject/approve: reason obrigatório onde aplicável.
  - Evidence: `apps/api/src/modules/orders/admin-review.ts:~19-33`
    ```ts
    if (!reason) return { ok: false, error: "ORDER_INCOMPLETE", message: "Motivo é obrigatório", details: { missingFields: ["reason"] } };
    ```

### PATCH /orders/:id (controle de campos)
- Se payload contiver campo proibido → `BAD_REQUEST` (não ignora).
  - Evidence: `apps/api/src/modules/orders/patch-order.ts:~74-97`
    ```ts
    if (forbiddenFields.length > 0) {
      return { ok: false, error: "BAD_REQUEST", message: `Payload contém campos não permitidos: ${forbiddenFields.join(", ")}` };
    }
    ```
- Assistant só edita a própria order e apenas em `in_progress`/`follow_up`.
  - Evidence: `apps/api/src/modules/orders/patch-order.ts:~200-214`
    ```ts
    if (row.assistantUserId !== params.actorUserId) return { ok: false, error: "FORBIDDEN", ... };
    if (row.status !== "in_progress" && row.status !== "follow_up") return { ok: false, error: "INVALID_STATUS", ... };
    ```

### Cancelamento vindo da origem (source_status)
- Política implementada: cancela status operacional se “aberto”; preserva se “financeiro/histórico”.
  - Evidence: `apps/api/src/modules/orders/import-pool-json.ts:~12-34`
    ```ts
    const openOperationalStatuses: OrderStatus[] = ["available","in_progress","submitted","follow_up","rejected"];
    const preservedLateCancellationStatuses: OrderStatus[] = ["approved","batched","paid","archived"];
    ```

---

## 7. Security Review

### CORS dev (cookies)
- CORS só é aplicado em `development`, restrito a `APP_WEB_URL`, com `credentials: true`.
  - Evidence: `apps/api/src/app.ts:~27-33`
    ```ts
    if (env.appEnv === "development") {
      void app.register(cors, { origin: env.appWebUrl, credentials: true });
    }
    ```

### Better Auth bridge (Fastify)
- Constrói `Request`, serializa body quando necessário, repassa cookies via `getSetCookie()` no objeto `Headers`.
  - Evidence: `apps/api/src/routes/auth.ts:~18-54`
    ```ts
    const body = request.body == null ? undefined : typeof request.body === "string" ? request.body : JSON.stringify(request.body);
    const response = await auth.handler(req);
    const cookies = maybeHeaders.getSetCookie();
    if (cookies.length > 0) reply.header("set-cookie", cookies);
    ```

### Rate limiting / brute force
- Not found (nenhuma evidência de rate limit, IP throttling, ou proteção específica contra brute force no código atual).
  - Evidence: `Not found` — `@fastify/rate-limit` em `apps/api/package.json`

### CSRF
- Not found (não há evidência de proteção CSRF no backend; cookies são usados e o fluxo assume origin confiável).
  - Evidence: `Not found` — referências a “csrf” em `apps/api/src/*`

---

## 8. Error Handling

### Padrão atual
- Cada rota tem `try/catch` próprio e mapeia `PermissionError` → 401/403 e demais → 500.
  - Evidence: `apps/api/src/routes/orders.ts:150-163`
    ```ts
    if (error instanceof PermissionError) { reply.status(error.statusCode); return { ok: false, error: ..., message: error.message }; }
    reply.status(500); return { ok: false, error: "INTERNAL_ERROR", message };
    ```

### Padronização incompleta de “codes”
- “Motivo obrigatório” é `ORDER_INCOMPLETE` (422) em admin-review, enquanto payload inválido é `BAD_REQUEST` (400) em outras rotas.
  - Evidence: `apps/api/src/modules/orders/admin-review.ts:~19-33`
    ```ts
    return { ok: false, error: "ORDER_INCOMPLETE", message: "Motivo é obrigatório" };
    ```
  - Evidence: `apps/api/src/routes/pool-import.ts:~34-55`
    ```ts
    return { ok: false, error: "BAD_REQUEST", message: "Body JSON inválido" };
    ```

---

## 9. Code Quality

### Tamanho/complexidade (indicadores)
- `apps/web/src/App.tsx` ≈ 938 linhas.
  - Evidence (command output): `(Get-Content apps/web/src/App.tsx | Measure-Object -Line).Lines`
    ```
    938
    ```
- `apps/api/src/routes/orders.ts` ≈ 678 linhas.
  - Evidence (command output): `(Get-Content apps/api/src/routes/orders.ts | Measure-Object -Line).Lines`
    ```
    678
    ```
- `packages/contracts/src/index.ts` ≈ 877 linhas.
  - Evidence (command output): `(Get-Content packages/contracts/src/index.ts | Measure-Object -Line).Lines`
    ```
    877
    ```

### Uso de `any`
- Há uso recorrente de `as any` para body/params/query.
  - Evidence (command output): `rg -n "any\\b" apps/api/src/routes ...` (excerpt)
    ```
    apps/api/src/routes/pool-import.ts:34:      const body = request.body as any;
    apps/api/src/routes/orders.ts:126:      const rawScope = (request.query as any)?.scope as string | undefined;
    ```

### Duplicação: parsing XLSX
- Funções auxiliares duplicadas em dois módulos.
  - Evidence: `apps/api/src/modules/orders/parse-pool-xlsx.ts:~1-30`
    ```ts
    function normalizeHeader(value: unknown) { /* ... */ }
    function readCell(row: Record<string, unknown>, ...headers: string[]) { /* ... */ }
    ```
  - Evidence: `apps/api/src/modules/routes/parse-route-source-xlsx.ts:~20-50`
    ```ts
    function normalizeHeader(value: unknown) { /* ... */ }
    function readCell(row: Record<string, unknown>, ...headers: string[]) { /* ... */ }
    ```

### TODO/FIXME
- Not found.
  - Evidence (command output): `rg -n "TODO|FIXME|HACK" -S apps/api/src apps/web/src packages` → no matches.

---

## 10. Testing

### Testes existentes
- Há testes em `apps/api/src/tests/*`.
  - Evidence: `apps/api/src/tests/listing.test.ts:~1-35`
    ```ts
    test("parsePagination aplica defaults e limite máximo", () => { /* ... */ });
    ```
- Testes de integração rodam apenas se `DATABASE_URL` existir.
  - Evidence: `apps/api/src/tests/access.integration.test.ts:~1-12`
    ```ts
    const databaseUrl = process.env.DATABASE_URL;
    const integration = databaseUrl ? test : test.skip;
    ```

### Resultado real (executado)
- `pnpm -r typecheck` e `pnpm -r build` passam.
  - Evidence (command output): `pnpm -r typecheck`
    ```
    apps/api typecheck: Done
    apps/web typecheck: Done
    ```
  - Evidence (command output): `pnpm -r build` (excerpt)
    ```
    apps/api build: Done
    apps/web build: ✓ built in 1.10s
    ```
- `pnpm test` passa, mas com 2 SKIPs.
  - Evidence (command output): `pnpm test` (excerpt)
    ```
    ok 1 ... # SKIP
    ok 2 ... # SKIP
    # pass 6
    # skipped 2
    ```

---

## 11. Performance Risks

### Import pool: transação por item (risco de escala)
- Evidence: `apps/api/src/modules/orders/import-pool-json.ts:~500-530`
  ```ts
  for (const item of params.payload.items) {
    const result = await db.transaction(async (tx) => processPoolImportItem({ tx, /* ... */ }));
  }
  ```

### Listagens com `ilike` + `count`
- Evidence: `apps/api/src/modules/orders/list-orders-assistant.ts:~25-40`
  ```ts
  if (params.search) { const pattern = `%${params.search}%`; conditions.push(or(ilike(...), ilike(...))!); }
  const totalQuery = db.select({ total: count() }).from(orders).where(whereClause);
  ```

---

## 12. Technical Debt

### HIGH
- Replace de rota pode falhar por constraint (ver seção 1).
  - Evidence: `apps/api/src/db/schema.ts:619-624` + `apps/api/src/modules/routes/create-route.ts:~162-226`.
- `docs/ESTRUTURA_INICIAL.md` contém markup HTML de renderizador (polui doc e atrapalha manutenção).
  - Evidence: `docs/ESTRUTURA_INICIAL.md:205`
    ```html
    <pre class="overflow-visible! px-0!" ...>...
    ```

### MEDIUM
- Docs citam Zod/React Router/TanStack/Tailwind/shadcn, mas o código ainda não usa.
  - Evidence: `docs/ARQUITETURA.md:~63-79`
    ```md
    * React Router
    * TanStack Query
    ```
  - Evidence: `apps/web/package.json:~1-22`
    ```json
    "dependencies": { "react": "^18.0.0", "react-dom": "^18.0.0" }
    ```
- Duplicação de `.env.example` dentro de `packages/` (possível resquício de bootstrap).
  - Evidence: `packages/.env.example:~1-5`
    ```dotenv
    VITE_API_URL=http://localhost:3001
    ```

### LOW
- UI dev gigante em um único arquivo.
  - Evidence: `apps/web/src/App.tsx:~1-10`
    ```ts
    import { approveUser, blockUser, /* ... */ } from "./lib/api";
    ```

---

## 13. Missing Features vs Docs

### Stack declarada vs stack real
- Docs declaram libs que não existem no `apps/web/package.json` atual.
  - Evidence: `docs/ARQUITETURA.md:~63-79`
    ```md
    * React Router
    * TanStack Query
    * Tailwind
    * shadcn/ui
    ```
  - Evidence: `apps/web/package.json:~1-22`
    ```json
    "dependencies": { "react": "^18.0.0", "react-dom": "^18.0.0" }
    ```

### Estrutura inicial (docs) vs repo
- Docs listam arquivos não existentes (ex.: `apps/web/src/router.tsx`, `infra/caddy/Caddyfile`, scripts `infra/scripts/*.sh`).
  - Evidence: `docs/ESTRUTURA_INICIAL.md:205` (router.tsx aparece no bloco HTML)
    ```html
    <span>    router.tsx</span>
    ```
  - Evidence: `Not found` — `apps/web/src/router.tsx`
  - Evidence: `Not found` — `infra/caddy/Caddyfile`
  - Evidence: `Not found` — `infra/scripts/restore-postgres.sh` (somente `.gitkeep` existe em `git ls-files`)

### Rotas “futuras” (docs) vs API implementada
- Docs ainda marcam `/routes` como “futuro”, mas API já expõe `/routes/*`.
  - Evidence: `docs/frontend/ROTAS_CANONICAS.md:203-206`
    ```md
    | `/routes` | Lista de rotas | admin, master | futuro |
    ```
  - Evidence: `apps/api/src/routes/routes.ts:~1-15`
    ```ts
    app.post("/routes/source-batches/xlsx", async (request, reply) => {
    ```

### Checklist
- Checklist contém duplicações/contradições (mesmo item marcado como [X] e [ ] em seguida).
  - Evidence: `docs/checklist.md:~360-420`
    ```md
    - [X] `POST /payment-batches/:id/close`
    - [ ] `POST /payment-batches/:id/close`
    ```

---

## 14. Dead Code & Unused Modules

### Possível “over-modeling” (enum vs implementação)
- Enum de `route_event_type` inclui GPX import/export, mas não há endpoints/módulos implementados.
  - Evidence: `apps/api/src/db/schema.ts:~80-90`
    ```ts
    export const routeEventTypeEnum = pgEnum("route_event_type", [
      "created","published","superseded","cancelled","reordered","imported_gpx","export_generated"
    ]);
    ```
  - Evidence: `Not found` — rotas/handlers com “gpx” em `apps/api/src/routes/*`

### Dead code evidente
- Not found (não foi identificado arquivo claramente não referenciado apenas por inspeção estática; imports são explícitos).

---

## 15. Critical Risks

### 15.1 Segurança / acesso
- Falta de rate limiting e CSRF hardening (não encontrado).
  - Evidence: `Not found` — `@fastify/rate-limit` em `apps/api/package.json`
  - Evidence: `Not found` — “csrf” em `apps/api/src/*`

### 15.2 Consistência de dados (routes replace)
- Ver risco HIGH em (1) e (12).
  - Evidence: `apps/api/src/db/schema.ts:619-624`
    ```ts
    where(sql`${t.status} in ('draft','published')`)
    ```

### 15.3 Repositório (tamanho/diffs)
- Arquivos binários grandes em `docs/arquivos` podem dificultar PRs/diffs.
  - Evidence (command output): `Get-ChildItem -Recurse -File docs/arquivos` (sizes not included in this excerpt)
  - Evidence: `git ls-files` (ver seção 5)

---

## 16. Refactoring Opportunities

1) Unificar parsing XLSX (reduzir duplicação).
- Evidence: `apps/api/src/modules/orders/parse-pool-xlsx.ts:~1-45` e `apps/api/src/modules/routes/parse-route-source-xlsx.ts:~20-55`.

2) Padronizar validação de inputs (ex.: schemas por endpoint).
- Evidence: docs citam Zod (`docs/ARQUITETURA.md:~95-110`) vs ausência em deps (`apps/api/package.json:~1-35`).

3) Padronizar erros e status codes.
- Evidence: divergências entre `BAD_REQUEST` (400) e `ORDER_INCOMPLETE` (422) (ver seção 8).

---

## 17. Overall Project Health Score

> Escala 0–10 (estado atual).

### Arquitetura — 7/10
- Pontos fortes: separação API/web, auth separada por schema, migrations versionadas.
  - Evidence: `apps/api/src/lib/auth.ts:~14-36`, `apps/api/drizzle/meta/_journal.json:~1-20`.
- Pontos fracos: docs drift visível e arquivos “estrutura inicial” poluídos.
  - Evidence: `docs/ESTRUTURA_INICIAL.md:205`.

### Qualidade de código — 6/10
- Pontos fortes: módulos no backend com transações e updates condicionais.
  - Evidence: `apps/api/src/modules/orders/claim-order.ts:~35-56`.
- Pontos fracos: UI dev monolítica, validações `any`/manuais dispersas.
  - Evidence: `apps/web/src/App.tsx:~1-10`, `apps/api/src/routes/pool-import.ts:~33-55`.

### Segurança — 6/10
- Pontos fortes: CORS restrito em dev, gates por role nas rotas críticas.
  - Evidence: `apps/api/src/app.ts:27-33`, `apps/api/src/lib/permissions.ts:~33-112`.
- Pontos fracos: rate limit/CSRF hardening não encontrados.
  - Evidence: `Not found` (ver seção 7 e 15).

### Manutenibilidade — 6/10
- Pontos fortes: monorepo simples, scripts mínimos e migrations.
  - Evidence: `package.json:~1-22`, `apps/api/drizzle/meta/_journal.json:~1-45`.
- Pontos fracos: checklist duplicado, docs com markup HTML.
  - Evidence: `docs/checklist.md:~360-420`, `docs/ESTRUTURA_INICIAL.md:205`.

### Testabilidade — 5/10
- Existem testes, mas integração depende de DB real e está skip por default.
  - Evidence: `apps/api/src/tests/access.integration.test.ts:~1-12`.
