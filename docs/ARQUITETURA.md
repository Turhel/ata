# ATA Portal — Arquitetura do Sistema

## Visão Geral

O **ATA Portal** é um sistema interno utilizado para gerenciar operações de inspeção, ordens de serviço e pagamentos da equipe.

A arquitetura do sistema segue o modelo  **frontend + API + banco de dados** , com separação clara de responsabilidades entre as camadas.

Principais objetivos da arquitetura:

* simplicidade operacional
* controle total da infraestrutura
* baixo custo de operação
* facilidade de backup e recuperação
* facilidade de migração para outro servidor

---

# Arquitetura Geral

```text
Usuário
   │
   │ HTTPS
   ▼
Frontend (Vercel)
React + Vite
   │
   │ HTTPS API
   ▼
Backend API
Fastify (Node.js)
   │
   │ SQL
   ▼
PostgreSQL
Banco principal
```

Sistema de autenticação:

```text
Frontend
   │
   │ auth request
   ▼
Backend API (Fastify + Better Auth)
   │
   │ SQL
   ▼
PostgreSQL
```

---

# Componentes do Sistema

## Frontend

Localização:

```
apps/web
```

Tecnologias utilizadas:

* React
* Vite
* TypeScript
* React Router
* TanStack Query
* Tailwind
* shadcn/ui

Responsabilidades:

* interface do usuário
* gerenciamento de sessão
* comunicação com a API
* renderização de dashboards
* interação com formulários

O frontend  **não acessa o banco diretamente** .

Toda comunicação ocorre via API.

---

## Backend API

Localização:

```
apps/api
```

Tecnologias utilizadas:

* Node.js
* Fastify
* Zod
* Drizzle ORM
* PostgreSQL driver

Responsabilidades:

* autenticação
* autorização
* validação de dados
* regras de negócio
* acesso ao banco de dados
* proteção de endpoints

A API atua como  **camada central do sistema** .

---

## Banco de Dados

Banco utilizado:

PostgreSQL

Responsabilidades:

* armazenamento de usuários
* armazenamento de ordens
* histórico de alterações
* dados operacionais
* dados financeiros

Principais tabelas:

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

# Sistema de Autenticação

O sistema utiliza **Better Auth** (self-hosted, dentro da API).

Isso significa que **não existe um serviço/container de auth separado**: o auth roda como parte do processo da API.

Separação de responsabilidades:

* Better Auth: identidade/autenticação/sessão
* `users` (PostgreSQL): perfil operacional interno do portal
* vínculo: `users.auth_user_id` (ID do usuário no Better Auth)

Responsabilidades:

* login
* criação de sessão
* verificação de sessão
* gerenciamento de tokens

Fluxo de autenticação:

```text
Usuário faz login
      │
      ▼
Frontend envia credenciais
      │
      ▼
API valida login via Better Auth
      │
      ▼
Better Auth cria sessão
      │
      ▼
Frontend recebe sessão válida
```

Controle de permissões ocorre na  **API** , utilizando:

* roles
* middleware de autorização

---

# Modelo de Permissões

Roles existentes no sistema:

* assistant
* inspector
* admin
* master

Controle de acesso é realizado na API.

Exemplo:

```
assistant → acesso operacional básico
inspector → acesso limitado
admin → controle administrativo
master → controle total do sistema
```

---

# Fluxo de Cadastro de Usuários

1. Usuário cria conta
2. Conta entra em estado `pending`
3. Admin revisa o cadastro
4. Admin define a role do usuário

Enquanto o usuário estiver em estado  **pending** , ele não terá acesso às funcionalidades operacionais.

---

# Comunicação entre Componentes

Fluxo padrão de requisição:

```text
Usuário
   │
   ▼
Frontend
   │
   ▼
API
   │
   ▼
Banco
```

Fluxo de autenticação:

```text
Frontend
   │
   ▼
API (Better Auth embutido)
   │
   ▼
Banco
```

---

# Infraestrutura

Execução local e no servidor:

Docker + Docker Compose.

Serviços principais:

```
postgres
api
```

O frontend é hospedado separadamente na Vercel.

---

# Deploy

## Frontend

Hospedado na Vercel.

Ambientes utilizados:

* development
* preview
* production

---

## Backend

Executado em servidor próprio.

Responsável por:

* API
* banco
* autenticação

---

# Backups

Backups são realizados via:

```
pg_dump
```

Estratégia:

* backup diário
* armazenamento externo
* possibilidade de restore rápido

Script de restore disponível em:

```
infra/scripts/restore-postgres.sh
```

---

# Recuperação de Desastre

Caso seja necessário restaurar o sistema em nova máquina:

1. instalar Docker
2. clonar o repositório
3. configurar `.env`
4. iniciar serviços com Docker Compose
5. restaurar backup do banco

Tempo estimado de recuperação:

menos de 30 minutos.

---

# Escalabilidade Futura

Possíveis evoluções da arquitetura:

* servidor dedicado
* separação do banco em máquina própria
* cache com Redis
* filas com RabbitMQ ou Redis Queue
* analytics avançado

Essas evoluções  **não são necessárias no início do projeto** .

---

# Princípios Arquiteturais

O sistema segue os seguintes princípios:

* simplicidade antes de complexidade
* controle total da infraestrutura
* separação clara de responsabilidades
* facilidade de manutenção
* facilidade de backup
* baixo custo operacional

---

# Conclusão

A arquitetura do ATA Portal foi projetada para ser:

* simples
* confiável
* eficiente
* barata de manter

O objetivo é permitir que o sistema cresça de forma controlada, sem dependência de serviços externos caros ou complexos.
