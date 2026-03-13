# ATA Portal — Plano de Desenvolvimento

## Objetivo do Projeto

Construir uma nova versão do  **ATA Portal** , um sistema interno para gerenciamento operacional de inspeções, ordens de serviço e pagamentos da equipe.

O sistema será utilizado por uma equipe pequena (assistentes, inspetores e administradores) e terá como foco:

* Inserção e acompanhamento de ordens
* Controle operacional da equipe
* Importação de dados externos
* Organização de pagamentos
* Visão administrativa do desempenho da equipe

O projeto será desenvolvido  **do zero** , com arquitetura limpa e controle total da infraestrutura.

---

# Arquitetura do Sistema

## Frontend

* React
* Vite
* TypeScript
* React Router
* TanStack Query
* Tailwind
* shadcn/ui

Hospedagem:

* Vercel

Responsabilidade:

* Interface do usuário
* Consumo da API
* Gerenciamento de estado de sessão

---

## Backend

* Node.js
* Fastify
* Zod
* Drizzle ORM
* PostgreSQL

Responsabilidade:

* Autenticação
* Regras de negócio
* Validação de dados
* Acesso ao banco
* Controle de permissões

---

## Autenticação

Sistema utilizado:

**Better Auth** (self-hosted, dentro da API)

Funcionalidades:

* login
* sessão
* controle de usuários
* verificação de sessão
* middleware de autenticação

---

## Banco de Dados

Banco principal:

**PostgreSQL**

Responsável por armazenar:

* usuários
* ordens
* inspetores
* importações
* pagamentos
* histórico de alterações

Backups serão realizados via:

* `pg_dump`
* scripts automatizados

---

## Infraestrutura

Execução local e servidor:

* Docker
* Docker Compose

Serviços principais:

* postgres
* api

Reverse proxy (produção):

* Caddy

---

# Estrutura do Repositório

```
ata-portal/

apps/
  web/          # frontend
  api/          # backend

packages/
  shared/       # utilidades compartilhadas
  contracts/    # schemas e tipos compartilhados

infra/
  docker/
  caddy/
  scripts/

docs/
  PLANO.md
  adr/
  migration/

.env.example
pnpm-workspace.yaml
package.json
```

---

# Modelo de Usuários

Tipos de usuários do sistema:

### Assistant

* Inserção e atualização de ordens
* Consulta de dados operacionais

### Inspector

* Visualização básica de tarefas

### Admin

* Controle de operações
* Liberação de pagamentos
* acompanhamento de equipe

### Master

* Controle completo do sistema

---

# Fluxo de Cadastro

1. Usuário cria conta
2. Conta entra em estado **pending**
3. Admin aprova ou bloqueia
4. Admin define **role**

Usuários não aprovados terão acesso apenas à página de boas-vindas.

---

# Módulos do Sistema

## 1. Autenticação

Funcionalidades:

* login
* logout
* sessão ativa
* recuperação de sessão
* proteção de rotas
* endpoint `/me`

---

## 2. Usuários

* listagem de usuários
* aprovação de contas
* definição de roles
* bloqueio de usuários

---

## 3. Inspetores

Gerenciamento de inspetores:

* cadastro
* edição
* vínculo com equipe
* histórico de atividade

---

## 4. Ordens

Sistema principal do portal.

Funcionalidades:

* criação de ordens
* edição de ordens
* alteração de status
* histórico de eventos
* comentários/notas
* filtros e pesquisa

---

## 5. Importação de Pool

Importação de dados externos.

Funcionalidades:

* upload de arquivo `.xlsx`
* validação dos dados
* preview antes da gravação
* histórico de importações

---

## 6. Pagamentos

Organização dos pagamentos da equipe.

Funcionalidades:

* cálculo por lote
* listagem de pagamentos
* histórico
* controle administrativo

---

## 7. Dashboard

Visão administrativa do sistema.

Indicadores:

* ordens processadas
* desempenho por usuário
* status de ordens
* pagamentos pendentes

---

# Estrutura Inicial do Banco

Tabelas principais:

```
users
user_roles
team_assignments

inspectors

orders
order_events
order_notes

pool_import_batches
pool_import_items

payment_batches
payment_batch_items
```

---

# Fases de Desenvolvimento

## Fase 0 — Fundação

Configuração inicial do projeto.

Entregas:

* monorepo configurado
* docker compose
* postgres
* Better Auth configurado na API
* api inicial
* healthcheck `/health`

---

## Fase 1 — Autenticação

Implementação completa do auth.

Entregas:

* login
* sessão
* endpoint `/me`
* roles
* aprovação de usuários

---

## Fase 2 — Núcleo Operacional

Implementação das operações principais.

Entregas:

* inspetores
* ordens
* listagem
* filtros
* atualização de status

---

## Fase 3 — Importação de Dados

Entregas:

* upload de `.xlsx`
* validação
* preview
* histórico de importação

---

## Fase 4 — Pagamentos

Entregas:

* cálculo de pagamentos
* lote de pagamento
* histórico

---

## Fase 5 — Dashboard

Entregas:

* métricas operacionais
* relatórios
* visão administrativa

---

# Segurança

Medidas implementadas:

* autenticação por sessão
* verificação de role
* validação com Zod
* API isolada do banco
* controle de acesso por endpoint

---

# Backups

Backups do banco serão realizados com:

```
pg_dump
```

Estratégia:

* backup diário
* retenção de backups
* script de restore documentado

---

# Deploy

Frontend:

* Vercel

Backend:

* servidor próprio

Banco:

* PostgreSQL self-hosted

---

# Objetivo Final

Entregar um sistema:

* estável
* simples de manter
* barato de operar
* com controle total da infraestrutura

O projeto deverá permitir:

* fácil migração para outro servidor
* recuperação rápida via backup
* crescimento gradual da equipe
* expansão de funcionalidades futuras
