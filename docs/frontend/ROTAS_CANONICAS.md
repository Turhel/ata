# Rotas Canônicas do ATA Portal

## Objetivo

Este documento define as rotas oficiais do frontend do ATA Portal.

Ele existe para:

- evitar duplicação de páginas com nomes diferentes
- padronizar navegação por role
- orientar implementação do frontend
- servir como mapa mestre das telas
- impedir que o projeto ganhe 4 rotas para a mesma coisa só porque alguém achou um nome “mais bonitinho”

---

## Regra principal

Se uma funcionalidade já possui rota canônica definida aqui, novas rotas equivalentes não devem ser criadas sem motivo real.

Exemplo de erro:

- `/scope`
- `/scopes`
- `/scope-generator`
- `/inspection-scope`

todas tentando representar a mesma tela.

---

## Status possíveis

- `planejada`
- `parcial`
- `pronta`
- `futuro`
- `descontinuar`

---

## Convenções de rota

### 1. Preferir plural para recursos

Exemplos:

- `/orders`
- `/scopes`
- `/payments`

### 2. Preferir prefixo por contexto administrativo

Exemplos:

- `/admin/pool`
- `/master/teams`

### 3. Evitar nomes soltos e ambíguos

Evitar:

- `/setting`
- `/scope-insp`
- `/rote`

Preferir:

- `/settings`
- `/scopes/inspector`
- `/routes`

### 4. Uma rota principal por tela

Uma mesma tela não deve existir com múltiplas rotas equivalentes.

---

# Rotas canônicas

## Públicas e entrada

| Rota           | Tela                       |      Acesso | Status    |
| -------------- | -------------------------- | ----------: | --------- |
| `/`          | Home pública              |    público | planejada |
| `/auth`      | Login                      |    público | parcial   |
| `/auth/role` | Escolha de contexto visual | autenticado | futuro    |
| `/welcome`   | Aguardando aprovação     |     pending | planejada |

---

## Núcleo comum autenticado

| Rota           | Tela                     |               Acesso | Status    |
| -------------- | ------------------------ | -------------------: | --------- |
| `/dashboard` | Dashboard do usuário    | assistant, inspector | planejada |
| `/settings`  | Configurações pessoais |   todos autenticados | planejada |
| `/manuals`   | Biblioteca de manuais    |         autenticados | planejada |

---

## Orders

| Rota               | Tela                      |                   Acesso | Status    |
| ------------------ | ------------------------- | -----------------------: | --------- |
| `/orders`        | Lista principal de orders | assistant, admin, master | planejada |
| `/orders/:id`    | Detalhe da order          | assistant, admin, master | futuro    |
| `/orders/insert` | Inserção operacional    |                assistant | planejada |

---

## Aprovação administrativa

| Rota                    | Tela                   |        Acesso | Status    |
| ----------------------- | ---------------------- | ------------: | --------- |
| `/approval`           | Fila de revisão       | admin, master | planejada |
| `/approval/duplicate` | Duplicatas e conflitos | admin, master | planejada |

---

## Pool

| Rota                        | Tela                       |        Acesso | Status    |
| --------------------------- | -------------------------- | ------------: | --------- |
| `/admin/pool`             | Lista do pool              | admin, master | planejada |
| `/admin/pool/import`      | Importação do pool       | admin, master | planejada |
| `/admin/pool/batches/:id` | Detalhe do batch importado | admin, master | futuro    |

---

## Scopes

| Rota                  | Tela                               |                   Acesso | Status    |
| --------------------- | ---------------------------------- | -----------------------: | --------- |
| `/scopes`           | Lista/geração de escopos         | assistant, admin, master | planejada |
| `/scopes/:id`       | Detalhe do escopo                  | assistant, admin, master | futuro    |
| `/scopes/inspector` | Busca e visualização do inspetor |                inspector | planejada |

---

## Financeiro pessoal

| Rota                   | Tela                     |               Acesso | Status    |
| ---------------------- | ------------------------ | -------------------: | --------- |
| `/mypayment`         | Pagamento atual          | assistant, inspector | planejada |
| `/mypayment/history` | Histórico de pagamentos | assistant, inspector | planejada |

---

## Financeiro administrativo

| Rota              | Tela               |        Acesso | Status    |
| ----------------- | ------------------ | ------------: | --------- |
| `/payments`     | Lotes de pagamento | admin, master | planejada |
| `/payments/:id` | Detalhe do lote    | admin, master | futuro    |

---

## Performance

| Rota                    | Tela                          | Acesso | Status    |
| ----------------------- | ----------------------------- | -----: | --------- |
| `/performance`        | Performance do admin e equipe |  admin | planejada |
| `/performance/master` | Performance global            | master | planejada |

---

## Admin

| Rota       | Tela                     | Acesso | Status    |
| ---------- | ------------------------ | -----: | --------- |
| `/admin` | Dashboard administrativo |  admin | planejada |

---

## Master

| Rota                      | Tela                             | Acesso | Status    |
| ------------------------- | -------------------------------- | -----: | --------- |
| `/master`               | Dashboard master                 | master | planejada |
| `/master/teams`         | Gestão de times                 | master | planejada |
| `/master/invitations`   | Gestão de contas e aprovações | master | planejada |
| `/master/types`         | Tipos de trabalho                | master | planejada |
| `/master/types/pricing` | Pricing por tipo                 | master | planejada |

---

## Rotas futuras de catálogos

| Rota                           | Tela                            | Acesso | Status |
| ------------------------------ | ------------------------------- | -----: | ------ |
| `/master/inspectors`         | Cadastro de inspetores          | master | futuro |
| `/master/inspector-accounts` | Contas de inspetor              | master | futuro |
| `/master/clients`            | Clientes                        | master | futuro |
| `/master/work-types`         | Gestão detalhada de work types | master | futuro |

---

## Rotas futuras de roteirização

| Rota                  | Tela                         |        Acesso | Status |
| --------------------- | ---------------------------- | ------------: | ------ |
| `/routes`           | Lista de rotas               | admin, master | futuro |
| `/routes/new`       | Criar rota                   | admin, master | futuro |
| `/routes/:id`       | Detalhe/otimização da rota | admin, master | futuro |
| `/routes/inspector` | Visão do inspetor para rota |     inspector | futuro |

---

# Aliases que devem ser evitados ou descontinuados

## Rotas antigas ou ruins de naming

| Rota antiga             | Rota canônica          | Situação   |
| ----------------------- | ----------------------- | ------------ |
| `/setting`            | `/settings`           | descontinuar |
| `/scope`              | `/scopes`             | descontinuar |
| `/scope-insp`         | `/scopes/inspector`   | descontinuar |
| `/pool`               | `/admin/pool`         | descontinuar |
| `/pool/import`        | `/admin/pool/import`  | descontinuar |
| `/performance-master` | `/performance/master` | descontinuar |
| `/master/invitation`  | `/master/invitations` | descontinuar |
| `/rote`               | `/routes`             | descontinuar |

---

# Navegação principal por role

## Assistant

### Menu principal

- Dashboard
- Orders
- Inserção
- Scopes
- Meus pagamentos
- Manuais
- Configurações

### Rotas principais

- `/dashboard`
- `/orders`
- `/orders/insert`
- `/scopes`
- `/mypayment`
- `/mypayment/history`
- `/manuals`
- `/settings`

---

## Inspector

### Menu principal

- Dashboard
- Scopes
- Meus pagamentos
- Manuais
- Configurações

### Rotas principais

- `/dashboard`
- `/scopes/inspector`
- `/mypayment`
- `/mypayment/history`
- `/manuals`
- `/settings`

---

## Admin

### Menu principal

- Dashboard Admin
- Aprovações
- Orders
- Pool
- Importar Pool
- Pagamentos
- Performance
- Scopes
- Manuais
- Configurações

### Rotas principais

- `/admin`
- `/approval`
- `/approval/duplicate`
- `/orders`
- `/admin/pool`
- `/admin/pool/import`
- `/payments`
- `/performance`
- `/scopes`
- `/manuals`
- `/settings`

---

## Master

### Menu principal

- Dashboard Master
- Aprovações
- Orders
- Pool
- Times
- Usuários
- Tipos
- Pricing
- Pagamentos
- Performance Global
- Manuais
- Configurações

### Rotas principais

- `/master`
- `/approval`
- `/approval/duplicate`
- `/orders`
- `/admin/pool`
- `/admin/pool/import`
- `/master/teams`
- `/master/invitations`
- `/master/types`
- `/master/types/pricing`
- `/payments`
- `/performance/master`
- `/manuals`
- `/settings`

---

# Redirecionamento pós-login

## Sem sessão

- `/auth`

## Usuário pending

- `/welcome`

## Assistant

- `/dashboard`

## Inspector

- `/dashboard`

## Admin

- `/admin`

## Master

- `/master`

---

# Regras importantes

## 1. Rota visível não substitui autorização

A API continua sendo a autoridade real.

## 2. Role errada não deve ver menu errado

Mesmo que a rota esteja protegida no backend, a navegação deve evitar exposição inútil.

## 3. Admin e master não são a mesma coisa

As rotas precisam refletir essa diferença.

## 4. Nome de rota deve sobreviver ao tempo

Evitar nomes improvisados ou “apelidos de equipe”.

---

# Ordem sugerida de implementação de rotas

## Fase 1

- `/`
- `/auth`
- `/welcome`
- `/dashboard`
- `/admin`
- `/master`

## Fase 2

- `/orders`
- `/orders/insert`
- `/approval`

## Fase 3

- `/admin/pool`
- `/admin/pool/import`
- `/scopes`
- `/scopes/inspector`

## Fase 4

- `/master/teams`
- `/master/invitations`
- `/master/types`
- `/master/types/pricing`

## Fase 5

- `/payments`
- `/mypayment`
- `/mypayment/history`
- `/performance`
- `/performance/master`

## Fase 6

- `/manuals`
- `/settings`
- rotas futuras de detalhe e catálogos

---

# Objetivo final

Toda pessoa no sistema deve saber:

- onde está
- para onde vai
- o que pode fazer

Se a navegação parecer improvisada, o produto também vai parecer improvisado.
E normalmente com razão.
