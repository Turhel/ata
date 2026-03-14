# Mapa de Rotas do ATA Portal

## Objetivo

Este documento organiza as rotas principais do sistema e serve como referência de navegação para frontend, backend e documentação de telas.

Ele não detalha profundamente a UX de cada tela.
O detalhamento fica nos arquivos individuais dentro de `docs/telas/`.

---

## Princípios

- a URL deve representar o recurso ou fluxo principal
- a role altera a experiência da tela, não necessariamente a rota
- evitar duplicar páginas equivalentes só porque a role mudou
- ações críticas continuam protegidas pela API
- o frontend reflete permissões, mas não decide permissões

---

## Áreas do sistema

### Área pública

Rotas acessíveis sem sessão operacional válida.

- `/`
- `/auth/login`
- `/auth/role`
- `/welcome`

### Área autenticada comum

Rotas operacionais usadas no dia a dia por usuários autenticados.

- `/dashboard`
- `/orders`
- `/orders/:id`
- `/orders/insert`
- `/scopes`
- `/scopes/new`
- `/scopes/:id`
- `/manuals`
- `/settings`
- `/me/payments`
- `/me/payments/history`

### Área administrativa

Rotas de operação administrativa e gestão.

- `/admin`
- `/admin/users`
- `/admin/pool`
- `/admin/pool/import`
- `/admin/pool/batches/:id`
- `/admin/approvals`
- `/admin/approvals/duplicates`
- `/admin/performance`
- `/admin/payments`
- `/admin/payments/:id`
- `/admin/teams`
- `/admin/invitations`
- `/admin/work-types`
- `/admin/work-types/pricing`
- `/admin/routes`

---

## Regras gerais por rota

### `/`

#### Objetivo

Apresentação institucional simples do portal.

#### Acesso

- público

#### Observações

Pode evoluir no futuro para landing page mínima, sem virar vitrine exagerada.

---

### `/auth/login`

#### Objetivo

Autenticação do usuário.

#### Acesso

- público

#### Observações

Fluxo real usa Better Auth.

---

### `/auth/role`

#### Objetivo

Permitir que o usuário escolha o modo de uso quando houver mais de uma experiência relevante disponível.

#### Acesso

- autenticado

#### Regras

- não exibir para admin/master como escolha visual principal
- não exibir se só existir uma experiência possível para o usuário

---

### `/welcome`

#### Objetivo

Tela de aguardando aprovação ou boas-vindas iniciais.

#### Acesso

- autenticado
- especialmente `pending`

#### Regras

Usuário `pending`, `blocked` ou `inactive` não entra em módulos operacionais.

---

### `/dashboard`

#### Objetivo

Painel principal do usuário autenticado.

#### Acesso

- assistant
- admin
- master
- inspector, se houver dashboard específico no futuro

#### Regras

A rota é a mesma. O conteúdo muda conforme role e status.

---

### `/orders`

#### Objetivo

Lista principal de ordens.

#### Acesso

- assistant
- admin
- master
- inspector apenas se existir visão limitada futura

---

### `/orders/:id`

#### Objetivo

Detalhe individual da ordem.

#### Acesso

- conforme permissão contextual da role e da ordem

---

### `/orders/insert`

#### Objetivo

Fluxo operacional de inserção manual ou processamento inicial de ordens pelo assistant.

#### Acesso

- assistant
- admin em contexto excepcional, se a regra permitir

#### Observações

O nome pode ser revisto no futuro se o fluxo ficar mais claro.

---

### `/scopes`

#### Objetivo

Listagem de escopos.

#### Acesso

- assistant
- admin
- master
- inspector apenas se houver listagem autorizada

---

### `/scopes/new`

#### Objetivo

Criação de escopo.

#### Acesso

- assistant
- admin/master apenas se a política permitir intervenção

---

### `/scopes/:id`

#### Objetivo

Visualização ou edição de um escopo existente.

#### Acesso

- assistant: edição conforme regra
- inspector: visualização com checklist local
- admin/master: leitura e eventual intervenção

---

### `/manuals`

#### Objetivo

Área de manuais e materiais operacionais.

#### Acesso

- usuários autenticados

---

### `/settings`

#### Objetivo

Configurações da conta e preferências futuras.

#### Acesso

- usuários autenticados

---

### `/me/payments`

#### Objetivo

Resumo de pagamentos do próprio usuário.

#### Acesso

- assistant
- inspector, se aplicável no futuro

---

### `/me/payments/history`

#### Objetivo

Histórico de pagamentos já fechados.

#### Acesso

- assistant
- inspector, se aplicável no futuro

---

### `/admin`

#### Objetivo

Dashboard administrativo.

#### Acesso

- admin
- master

---

### `/admin/users`

#### Objetivo

Gestão operacional de usuários.

#### Acesso

- admin
- master

---

### `/admin/pool`

#### Objetivo

Visão administrativa do pool.

#### Acesso

- admin
- master

---

### `/admin/pool/import`

#### Objetivo

Importação do pool de ordens.

#### Acesso

- admin
- master

---

### `/admin/pool/batches/:id`

#### Objetivo

Detalhe de batch importado.

#### Acesso

- admin
- master

---

### `/admin/approvals`

#### Objetivo

Fila administrativa de revisão.

#### Acesso

- admin
- master

---

### `/admin/approvals/duplicates`

#### Objetivo

Fila administrativa de duplicidades ou conflitos.

#### Acesso

- admin
- master

---

### `/admin/performance`

#### Objetivo

Acompanhamento de performance operacional.

#### Acesso

- admin
- master

#### Regras

A mesma rota pode oferecer visão de time ou visão global.

---

### `/admin/payments`

#### Objetivo

Gestão de lotes de pagamento.

#### Acesso

- admin
- master

---

### `/admin/payments/:id`

#### Objetivo

Detalhe do lote de pagamento.

#### Acesso

- admin
- master

---

### `/admin/teams`

#### Objetivo

Organização de times e vínculos administrativos.

#### Acesso

- master
- admin apenas se a política futura permitir

---

### `/admin/invitations`

#### Objetivo

Aprovação de usuários novos e gestão de contas.

#### Acesso

- admin
- master

#### Regras

Promoção para `master` deve continuar restrita.

---

### `/admin/work-types`

#### Objetivo

Gestão de tipos de trabalho.

#### Acesso

- admin
- master

---

### `/admin/work-types/pricing`

#### Objetivo

Configuração de valores por tipo de trabalho.

#### Acesso

- admin
- master

#### Regras

Trata-se de área sensível e deve ter cuidado extra de permissão.

---

### `/admin/routes`

#### Objetivo

Criação e otimização de rotas operacionais para inspetores.

#### Acesso

- admin
- master

#### Observações

Módulo futuro.

---

## Prioridade inicial de telas

### Prioridade 1

- `/auth/login`
- `/welcome`
- `/dashboard`
- `/orders`
- `/orders/:id`
- `/admin/pool/import`
- `/admin/approvals`

### Prioridade 2

- `/scopes`
- `/scopes/new`
- `/scopes/:id`
- `/admin/performance`
- `/admin/users`

### Prioridade 3

- `/me/payments`
- `/me/payments/history`
- `/admin/payments`
- `/admin/teams`
- `/admin/routes`

---

## Observações finais

Este mapa organiza o produto por fluxo e recurso.

Se uma nova tela surgir, ela deve:

- ter finalidade clara
- ter role e permissão definidas
- ter relação clara com backend
- evitar duplicar outra tela já existente com nome diferente
