# ATA Portal — Estrutura Inicial do Projeto

## Objetivo

Este documento define a estrutura inicial do repositório **ATA Portal** e o plano de bootstrap técnico do projeto.

Ele serve para:

- organizar o monorepo desde o início
- separar claramente frontend, backend e código compartilhado
- padronizar a base do projeto
- orientar a criação dos primeiros arquivos
- evitar improviso estrutural no começo da implementação

---

# Princípios da estrutura

## 1. Monorepo com responsabilidades claras

O projeto será organizado em **monorepo**, com separação entre:

- aplicações executáveis
- pacotes compartilhados
- infraestrutura
- documentação

---

## 2. O frontend não fala com o banco

O frontend deve se comunicar apenas com a **API**.

### Regra

- frontend → API
- API → banco
- API → auth
- nunca frontend → banco diretamente

---

## 3. A API é o centro da lógica

A API será responsável por:

- autenticação
- autorização
- regras de negócio
- validação
- acesso ao banco
- integração com serviços internos

---

## 4. Infraestrutura local deve subir com poucos comandos

O projeto deve poder ser iniciado localmente com o mínimo de atrito possível.

### Objetivo

Subir:

- PostgreSQL
- Better Auth (embutido na API)
- API
- frontend

com estrutura previsível e versionada.

---

# Estrutura oficial do repositório

```text
ata-portal/
  apps/
    web/
    api/

  packages/
    contracts/
    shared/

  infra/
    docker/
    caddy/
    scripts/

  docs/

  .editorconfig
  .gitignore
  .npmrc
  .env.example
  package.json
  pnpm-workspace.yaml
  tsconfig.base.json
  README.md
```

---



# Papéis de cada diretório

## `apps/`

Contém as aplicações executáveis do sistema.

### `apps/web`

Frontend do sistema.

Responsável por:

* interface
* rotas
* páginas
* consumo da API
* estado de sessão
* dashboards e formulários

### `apps/api`

Backend do sistema.

Responsável por:

* rotas HTTP
* autenticação
* autorização
* regras de negócio
* conexão com banco
* integração com Better Auth

---

## `packages/`

Contém código compartilhado entre web e api.

### `packages/contracts`

Schemas, tipos e contratos compartilhados.

Exemplos:

* DTOs
* enums oficiais
* respostas de API
* validações com Zod
* tipos de filtros e paginação

### `packages/shared`

Utilitários puros e reutilizáveis.

Exemplos:

* helpers de data
* tratamento de erros
* constantes
* utilitários genéricos
* helpers de environment

---

## `infra/`

Contém tudo relacionado à infraestrutura do projeto.

### `infra/docker`

Arquivos de Docker Compose e apoio local.

### `infra/caddy`

Configuração de proxy reverso para produção.

### `infra/scripts`

Scripts utilitários e operacionais.

Exemplos:

* backup
* restore
* scripts de espera do banco
* scripts de manutenção

---

## `docs/`

Documentação técnica e funcional do projeto.

---

# Estrutura inicial detalhada

## `apps/web`

<pre class="overflow-visible! px-0!" data-start="3046" data-end="3349"><div class="relative w-full mt-4 mb-1"><div class=""><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute inset-x-4 top-12 bottom-4"><div class="pointer-events-none sticky z-40 shrink-0 z-1!"><div class="sticky bg-token-border-light"></div></div></div><div class=""><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼk ͼy"><div class="cm-scroller"><div class="cm-content q9tKkq_readonly"><span>apps/web/</span><br/><span>  src/</span><br/><span>    main.tsx</span><br/><span>    App.tsx</span><br/><span>    router.tsx</span><br/><br/><span>    pages/</span><br/><span>      login.tsx</span><br/><span>      pending.tsx</span><br/><span>      dashboard.tsx</span><br/><span>      not-found.tsx</span><br/><br/><span>    components/</span><br/><span>      layout/</span><br/><span>      ui/</span><br/><br/><span>    lib/</span><br/><span>      api.ts</span><br/><span>      env.ts</span><br/><br/><span>  public/</span><br/><span>  index.html</span><br/><span>  package.json</span><br/><span>  tsconfig.json</span><br/><span>  vite.config.ts</span></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></pre>

### Responsabilidades do `web`

* renderizar interface
* manter experiência do usuário
* proteger rotas visualmente
* consumir a API
* exibir dados operacionais
* nunca decidir regra crítica sozinho

---

## `apps/api`

<pre class="overflow-visible! px-0!" data-start="3570" data-end="3858"><div class="relative w-full mt-4 mb-1"><div class=""><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute inset-x-4 top-12 bottom-4"><div class="pointer-events-none sticky z-40 shrink-0 z-1!"><div class="sticky bg-token-border-light"></div></div></div><div class=""><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼk ͼy"><div class="cm-scroller"><div class="cm-content q9tKkq_readonly"><span>apps/api/</span><br/><span>  src/</span><br/><span>    app.ts</span><br/><span>    server.ts</span><br/><span>    env.ts</span><br/><br/><span>    routes/</span><br/><span>      health.ts</span><br/><span>      me.ts</span><br/><br/><span>    plugins/</span><br/><span>      db.ts</span><br/><span>      auth.ts</span><br/><br/><span>    modules/</span><br/><span>      auth/</span><br/><span>      users/</span><br/><span>      orders/</span><br/><br/><span>    lib/</span><br/><span>      errors.ts</span><br/><span>      permissions.ts</span><br/><br/><span>  drizzle/</span><br/><span>  package.json</span><br/><span>  tsconfig.json</span></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></pre>

### Responsabilidades da `api`

* expor endpoints
* validar requisições
* integrar com PostgreSQL
* integrar com Better Auth
* aplicar permissões
* manter as regras centrais do sistema

---

## `packages/contracts`

<pre class="overflow-visible! px-0!" data-start="4075" data-end="4197"><div class="relative w-full mt-4 mb-1"><div class=""><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute inset-x-4 top-12 bottom-4"><div class="pointer-events-none sticky z-40 shrink-0 z-1!"><div class="sticky bg-token-border-light"></div></div></div><div class=""><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼk ͼy"><div class="cm-scroller"><div class="cm-content q9tKkq_readonly"><span>packages/contracts/</span><br/><span>  src/</span><br/><span>    index.ts</span><br/><span>    auth.ts</span><br/><span>    users.ts</span><br/><span>    orders.ts</span><br/><br/><span>  package.json</span><br/><span>  tsconfig.json</span></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></pre>

### Responsabilidades

* centralizar contratos compartilhados
* evitar divergência entre frontend e backend
* padronizar payloads e enums

---

## `packages/shared`

<pre class="overflow-visible! px-0!" data-start="4364" data-end="4499"><div class="relative w-full mt-4 mb-1"><div class=""><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute inset-x-4 top-12 bottom-4"><div class="pointer-events-none sticky z-40 shrink-0 z-1!"><div class="sticky bg-token-border-light"></div></div></div><div class=""><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼk ͼy"><div class="cm-scroller"><div class="cm-content q9tKkq_readonly"><span>packages/shared/</span><br/><span>  src/</span><br/><span>    index.ts</span><br/><span>    env.ts</span><br/><span>    dates.ts</span><br/><span>    errors.ts</span><br/><span>    constants.ts</span><br/><br/><span>  package.json</span><br/><span>  tsconfig.json</span></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></pre>

### Responsabilidades

* concentrar utilitários puros
* evitar repetição de helpers
* manter funções sem acoplamento com framework

---

## `infra/docker`

<pre class="overflow-visible! px-0!" data-start="4656" data-end="4728"><div class="relative w-full mt-4 mb-1"><div class=""><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute inset-x-4 top-12 bottom-4"><div class="pointer-events-none sticky z-40 shrink-0 z-1!"><div class="sticky bg-token-border-light"></div></div></div><div class=""><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼk ͼy"><div class="cm-scroller"><div class="cm-content q9tKkq_readonly"><span>infra/docker/</span><br/><span>  docker-compose.dev.yml</span><br/><span>  .env.docker.example</span></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></pre>

### Responsabilidades

* subir PostgreSQL
* configurar Better Auth na API
* subir API local
* manter ambiente local previsível

---

## `infra/caddy`

<pre class="overflow-visible! px-0!" data-start="4868" data-end="4904"><div class="relative w-full mt-4 mb-1"><div class=""><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute inset-x-4 top-12 bottom-4"><div class="pointer-events-none sticky z-40 shrink-0 z-1!"><div class="sticky bg-token-border-light"></div></div></div><div class=""><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼk ͼy"><div class="cm-scroller"><div class="cm-content q9tKkq_readonly"><span>infra/caddy/</span><br/><span>  Caddyfile</span></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></pre>

### Responsabilidades

* proxy reverso em produção
* HTTPS
* roteamento de domínio da API

---

## `infra/scripts`

<pre class="overflow-visible! px-0!" data-start="5021" data-end="5107"><div class="relative w-full mt-4 mb-1"><div class=""><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute inset-x-4 top-12 bottom-4"><div class="pointer-events-none sticky z-40 shrink-0 z-1!"><div class="sticky bg-token-border-light"></div></div></div><div class=""><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼk ͼy"><div class="cm-scroller"><div class="cm-content q9tKkq_readonly"><span>infra/scripts/</span><br/><span>  backup-postgres.sh</span><br/><span>  restore-postgres.sh</span><br/><span>  wait-for-db.sh</span></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></pre>

### Responsabilidades

* backup
* restore
* automações operacionais
* preparação de ambiente

---

# Stack inicial oficial

## Frontend

* React
* Vite
* TypeScript
* React Router
* TanStack Query
* Tailwind
* shadcn/ui

---

## Backend

* Node.js
* Fastify
* TypeScript
* Zod
* Drizzle ORM

---

## Banco

* PostgreSQL

---

## Autenticação

* Better Auth (self-hosted, dentro da API)

---

## Infraestrutura local

* Docker
* Docker Compose

---

## Hospedagem

### Frontend

* Vercel

### Backend / banco / auth

* servidor próprio

---

# Arquivos obrigatórios na raiz

## `package.json`

Responsável por:

* scripts principais do monorepo
* gerenciamento global do workspace

### Scripts iniciais sugeridos

* `dev:web`
* `dev:api`
* `dev`
* `build`
* `lint`
* `typecheck`
* `format`

---

## `pnpm-workspace.yaml`

Define os workspaces do projeto.

### Estrutura esperada

* `apps/*`
* `packages/*`

---

## `tsconfig.base.json`

Define a base compartilhada de TypeScript.

### Objetivo

* evitar duplicação de configuração
* unificar aliases e opções comuns
* manter consistência entre web, api e packages

---

## `.env.example`

Documenta todas as variáveis de ambiente necessárias para o projeto.

---

# Variáveis de ambiente iniciais

## Frontend

* `VITE_API_URL`

## API

* `PORT`
* `DATABASE_URL`

## Better Auth

* `BETTER_AUTH_SECRET`
* `BETTER_AUTH_URL`

## Aplicação

* `APP_ENV`
* `APP_WEB_URL`
* `APP_API_URL`

---

# Ambiente local com Docker

## Serviços iniciais

O ambiente local deve subir inicialmente:

* `postgres`
* `api`

O frontend pode rodar localmente fora do Docker no começo.

---

## Objetivo do `docker-compose.dev.yml`

Permitir ambiente local com:

* persistência do PostgreSQL
* Better Auth configurado na API
* API conectada ao banco
* health check básico

---

# Primeiros endpoints obrigatórios

O projeto deve nascer com estes endpoints mínimos:

## `GET /health`

Objetivo:

* confirmar que a API está viva

## `GET /me`

Objetivo:

* validar autenticação e contexto do usuário no futuro

---

# Primeira meta funcional do projeto

O sistema será considerado **iniciado corretamente** quando os itens abaixo estiverem funcionando:

* `pnpm install` funciona na raiz
* o workspace reconhece `apps/` e `packages/`
* PostgreSQL sobe via Docker
* Better Auth configurado na API
* API responde em `/health`
* frontend sobe localmente
* frontend consegue chamar a API

---

# Ordem oficial de montagem do esqueleto

## Etapa 1 — Base do monorepo

Criar:

* `package.json`
* `pnpm-workspace.yaml`
* `tsconfig.base.json`
* `.env.example`

---

## Etapa 2 — Estrutura de aplicações

Criar:

* `apps/web`
* `apps/api`

---

## Etapa 3 — Estrutura compartilhada

Criar:

* `packages/contracts`
* `packages/shared`

---

## Etapa 4 — Infraestrutura local

Criar:

* `infra/docker/docker-compose.dev.yml`

---

## Etapa 5 — Bootstrap da API

Criar:

* `app.ts`
* `server.ts`
* `routes/health.ts`

---

## Etapa 6 — Bootstrap do frontend

Criar:

* `main.tsx`
* `App.tsx`
* `router.tsx`

---

## Etapa 7 — Primeiro teste de vida

Validar:

* Docker sobe
* API responde `/health`
* frontend carrega
* frontend alcança a API

---

# Arquivos mínimos para o primeiro commit estrutural

## Raiz

* `package.json`
* `pnpm-workspace.yaml`
* `tsconfig.base.json`
* `.env.example`

## API

* `apps/api/package.json`
* `apps/api/src/app.ts`
* `apps/api/src/server.ts`
* `apps/api/src/routes/health.ts`

## Web

* `apps/web/package.json`
* `apps/web/src/main.tsx`
* `apps/web/src/App.tsx`

## Shared

* `packages/contracts/package.json`
* `packages/contracts/src/index.ts`
* `packages/shared/package.json`
* `packages/shared/src/index.ts`

## Infra

* `infra/docker/docker-compose.dev.yml`

---

# Regras de implementação estrutural

## 1. Não colocar regra de negócio no `shared`

`shared` deve conter apenas utilidades genéricas.

---

## 2. Não duplicar tipos entre web e api

Sempre que um tipo for compartilhado, ele deve viver em `contracts`.

---

## 3. Não transformar tudo em package

Criar package compartilhado apenas quando houver compartilhamento real.

---

## 4. Não misturar documentação com infraestrutura

Cada coisa no seu lugar:

* docs em `docs/`
* compose em `infra/docker/`
* scripts em `infra/scripts/`

---

## 5. O esqueleto deve ser pequeno, mas sólido

O objetivo inicial não é ter o sistema completo.

O objetivo inicial é ter um projeto que:

* sobe
* compila
* organiza
* aceita evolução sem virar bagunça

---

# Critério de conclusão desta fase

A fase de estrutura inicial estará concluída quando:

* o monorepo estiver criado
* a stack local mínima estiver funcional
* o frontend e a API estiverem separados corretamente
* os pacotes compartilhados existirem
* a documentação estiver alinhada com a estrutura
* o projeto estiver pronto para iniciar `auth`, `users` e `orders`
