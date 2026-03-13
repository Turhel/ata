# ATA Portal — Registro de Decisões Técnicas (ADR)

Este documento registra as principais decisões arquiteturais do projeto  **ATA Portal** , incluindo o contexto e os motivos que levaram à escolha de determinadas tecnologias ou abordagens.

Objetivo:

* preservar o contexto das decisões
* evitar retrabalho
* facilitar manutenção futura
* registrar trade-offs técnicos

Cada decisão segue o formato:

* **Contexto**
* **Decisão**
* **Motivo**
* **Consequências**

---

# ADR-001 — Reescrever o sistema do zero

## Contexto

O sistema anterior apresentava diversos problemas estruturais:

* código fragmentado
* dependências acopladas
* arquitetura inconsistente
* dificuldades de manutenção

Isso dificultava a evolução do projeto e aumentava o risco de bugs.

## Decisão

Criar um  **novo projeto do zero** , mantendo apenas o conhecimento do domínio do sistema anterior.

## Motivo

Permitir:

* arquitetura limpa
* código mais organizado
* evolução controlada do sistema

## Consequências

* esforço inicial maior
* necessidade de migração gradual de funcionalidades

Benefício esperado:

* sistema mais estável e sustentável.

---

# ADR-002 — Infraestrutura self-hosted

## Contexto

O sistema anterior dependia de diversos serviços externos pagos:

* Supabase
* Turso
* Clerk

O custo desses serviços aumenta conforme o sistema cresce.

## Decisão

Utilizar infraestrutura **self-hosted** para os componentes principais.

Componentes hospedados localmente:

* PostgreSQL
* API backend
* Better Auth (auth embutido na API)

## Motivo

* reduzir custos operacionais
* ter controle total da infraestrutura
* evitar limites artificiais de uso

## Consequências

Responsabilidade maior sobre:

* manutenção
* backups
* monitoramento

---

# ADR-003 — Backend próprio

## Contexto

Plataformas como Supabase oferecem backend pronto, porém com limitações de controle e customização.

## Decisão

Criar uma **API própria** utilizando Node.js.

## Motivo

* controle total das regras de negócio
* maior flexibilidade
* independência de serviços externos

---

# ADR-004 — Uso do Fastify

## Contexto

Frameworks comuns para Node incluem Express, NestJS e Fastify.

## Decisão

Utilizar **Fastify** como framework HTTP.

## Motivo

* alto desempenho
* arquitetura simples
* boa integração com TypeScript
* menor overhead comparado ao NestJS

---

# ADR-005 — PostgreSQL como banco principal

## Contexto

Era necessário escolher um banco robusto, confiável e amplamente suportado.

## Decisão

Utilizar **PostgreSQL** como banco principal do sistema.

## Motivo

* maturidade do projeto
* excelente suporte a consultas complexas
* compatibilidade com diversas ferramentas
* facilidade de backup e recuperação

---

# ADR-006 — Better Auth para autenticação

## Contexto

O sistema anterior utilizava Clerk.

Isso criava dependência de um serviço externo pago.

## Decisão

Utilizar **Better Auth** (self-hosted, dentro da API).

## Motivo

* auth self-hosted (sem serviço externo pago)
* roda dentro da API (menos infraestrutura para operar)
* controle total das sessões e autenticação

## Integração com `users`

- O **Better Auth** é responsável apenas por **identidade/autenticação/sessão**.
- A tabela `users` continua sendo o **perfil operacional interno** da aplicação (status, nome, roles, vínculos de time, etc.).
- O vínculo entre os dois mundos ocorre por `users.auth_user_id`:
  - valor: ID do usuário no Better Auth
  - regra: único (quando presente) e usado pela API para resolver o `users.id` correspondente

---

# ADR-007 — Frontend hospedado na Vercel

## Contexto

Era necessário escolher uma plataforma para deploy do frontend.

## Decisão

Hospedar o frontend na  **Vercel** .

## Motivo

* deploy simples
* preview automático
* integração com GitHub
* excelente suporte para aplicações React

---

# ADR-008 — Separação entre frontend e API

## Contexto

Arquiteturas modernas recomendam separação clara entre camadas.

## Decisão

Separar completamente:

* frontend
* backend
* banco

## Motivo

* maior flexibilidade
* melhor segurança
* facilidade de escalabilidade futura

---

# ADR-009 — Monorepo

## Contexto

O projeto possui múltiplos componentes:

* frontend
* backend
* código compartilhado

## Decisão

Utilizar  **monorepo** .

Estrutura principal:

```text
apps/
  web
  api

packages/
  shared
  contracts
```

## Motivo

* compartilhamento de código
* consistência entre módulos
* manutenção simplificada

---

# ADR-010 — Controle manual de usuários

## Contexto

O sistema é utilizado apenas internamente.

Não há necessidade de cadastro público aberto.

## Decisão

Usuários novos entram como  **pending** .

Um admin deve aprovar manualmente o acesso.

## Motivo

* maior segurança
* controle da equipe
* evitar acessos indevidos

---

# ADR-011 — Docker como base de infraestrutura

## Contexto

Era necessário garantir que o sistema pudesse ser executado facilmente em qualquer máquina.

## Decisão

Utilizar  **Docker + Docker Compose** .

## Motivo

* padronização do ambiente
* facilidade de deploy
* portabilidade entre servidores

---

# Conclusão

Este documento registra o racional por trás das principais decisões técnicas do projeto.

Caso alguma decisão seja revisada no futuro, uma nova entrada ADR deverá ser adicionada.
