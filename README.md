
# ATA Portal

Novo sistema interno para gerenciamento operacional de ordens, equipe, importação de pool e pagamentos.

O **ATA Portal** está sendo refeito do zero para substituir a base antiga com uma arquitetura mais simples, previsível, barata de operar e totalmente controlada pela própria equipe.

---

## Objetivo

O projeto existe para centralizar o fluxo operacional interno da equipe, incluindo:

- importação de ordens a partir de arquivos `.xlsx`
- acompanhamento e processamento de ordens
- revisão administrativa
- follow-up e rejeição
- organização de pagamentos
- dashboards operacionais e administrativos

O sistema é de uso **interno**, com controle manual de acesso e roles definidas por administradores.

---

## Princípios do projeto

- **frontend não acessa banco diretamente**
- **API concentra regra de negócio**
- **PostgreSQL é a fonte principal de verdade**
- **auth é self-hosted**
- **infraestrutura deve ser simples de restaurar**
- **documentação faz parte do projeto**
- **sem dependência desnecessária de serviços caros**

---

## Stack

### Frontend

- React
- Vite
- TypeScript
- React Router
- TanStack Query
- Tailwind
- shadcn/ui

### Backend

- Node.js
- Fastify
- TypeScript
- Zod
- Drizzle ORM

### Banco

- PostgreSQL

### Autenticação

- Better Auth (self-hosted, dentro da API)

### Infraestrutura

- Docker
- Docker Compose
- Caddy em produção
- Vercel para hospedagem do frontend

---

## Estrutura do repositório

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

  .env.example
  package.json
  pnpm-workspace.yaml
  tsconfig.base.json
  README.md
```

---


### Diretórios principais

#### `apps/web`

Frontend da aplicação.

#### `apps/api`

Backend principal da aplicação.

#### `packages/contracts`

Tipos, enums e contratos compartilhados entre frontend e backend.

#### `packages/shared`

Utilitários puros e helpers compartilhados.

#### `infra/docker`

Arquivos de Docker Compose para ambiente local.

#### `infra/caddy`

Configuração de proxy reverso para produção.

#### `infra/scripts`

Scripts operacionais como backup e restore.

#### `docs`

Documentação técnica, funcional e operacional do projeto.

---



## Documentação

Os documentos oficiais do projeto ficam em `docs/`.

### Documentos principais

* `docs/PLANO.md`
* `docs/ARQUITETURA.md`
* `docs/DECISOES.md`
* `docs/VERSIONAMENTO.md`
* `docs/FLUXO_OPERACIONAL.md`
* `docs/BANCO_DE_DADOS.md`
* `docs/REGRAS_DE_NEGOCIO.md`
* `docs/PERMISSOES.md`
* `docs/BACKUP_E_RESTORE.md`
* `docs/MIGRACAO_DO_LEGADO.md`
* `docs/ESTRUTURA_INICIAL.md`

---


## Estado atual do projeto

O projeto está em fase de **estruturação inicial**.

### Fase atual

* documentação base do projeto
* esqueleto do monorepo criado (`apps/web`, `apps/api`, `packages/*`)
* API com endpoint `GET /health`
* frontend validando comunicação com a API via `/health`
* PostgreSQL local via Docker (`infra/docker/docker-compose.dev.yml`)
* Drizzle configurado para o schema operacional (`public.*`) + migrations
* Better Auth embutido na API (schema `auth.*` via Better Auth CLI)
* endpoints: `GET /health` e `GET /me`
* seed operacional (`db:seed`) + helper de vínculo (`dev:link-auth-user`)

### Próximos passos

* consolidar fluxo de auth no frontend (signup/signin + persistência de sessão)
* adicionar CORS mínimo para desenvolvimento (se necessário para browser)
* iniciar autorização baseada em roles/status na API (sem domínio ainda)

---

## Como rodar localmente

> Esta seção pode ser ajustada conforme o bootstrap real do projeto for sendo implementado.

### Pré-requisitos

* Node.js
* pnpm
* Docker
* Docker Compose
* Git

---

### 1. Clonar o repositório

```bash
git clone https://github.com/Taurhiel/ata-portal.git
cd ata-portal
```

---

### 2. Instalar dependências

```bash
pnpm install
```

Se o pnpm pedir aprovação de builds (ex.: `esbuild`):

```bash
pnpm approve-builds --all
```

---

### 3. Configurar variáveis de ambiente

Criar o arquivo `.env` com base em:

```bash
cp .env.example .env
```

---

### 4. Subir a infraestrutura local

```bash
docker compose -f infra/docker/docker-compose.dev.yml up -d
```

---

### 5. Aplicar migrations (operacional + auth)

```bash
# Drizzle (schema operacional: public.*)
pnpm -C apps/api db:migrate

# Better Auth (schema de auth: auth.*)
pnpm -C apps/api auth:migrate
```

Opcional (dados de desenvolvimento):

```bash
pnpm -C apps/api db:seed
```

---

### 6. Rodar os apps em desenvolvimento

Atualmente funciona assim:

```bash
pnpm dev
```

ou separadamente:

```bash
pnpm dev:web
pnpm dev:api
```

---

## Ambientes

### Development

Executado localmente com Docker para banco/auth e apps rodando em modo dev.

### Preview

Frontend publicado pela Vercel em ambiente de preview.

### Production

* frontend na Vercel
* backend/banco/auth em infraestrutura própria

---

## Regras de desenvolvimento

### 1. Não colocar regra de negócio no frontend

O frontend reflete o fluxo, mas não define o fluxo.

### 2. Não duplicar tipos

Se um tipo for compartilhado entre web e api, ele deve ir para `packages/contracts`.

### 3. Não criar package sem necessidade real

Compartilhamento artificial só gera bagunça com nome bonito.

### 4. Não misturar código novo com compatibilidade do legado

O novo projeto deve nascer limpo.

### 5. Toda decisão importante deve ser documentada

Mudanças arquiteturais ou de domínio devem atualizar a documentação correspondente.

---

## Migração do sistema antigo

O projeto antigo (`ata-production`) será usado como referência para:

* regras de negócio
* nomes operacionais
* fluxos existentes
* casos de borda já conhecidos

O código antigo **não** será copiado cegamente.

A política oficial é:

* reaproveitar domínio
* reaproveitar conhecimento
* refazer implementação
* descartar acoplamentos antigos

Mais detalhes em:

`docs/MIGRACAO_DO_LEGADO.md`

---

## Objetivo final

Entregar um sistema:

* estável
* previsível
* fácil de operar
* fácil de restaurar
* barato de manter
* pronto para crescer com controle
