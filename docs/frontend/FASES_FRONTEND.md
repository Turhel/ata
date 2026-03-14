# Fases de Implementação do Frontend

## Objetivo

Definir uma ordem segura de implementação do frontend, evitando:

- criar tela bonita sem backend útil
- abrir muitas frentes ao mesmo tempo
- misturar fluxo principal com módulos avançados cedo demais
- perder coerência entre UX e regras de negócio

---

## Princípio geral

Implementar primeiro o que sustenta o fluxo real do sistema.

Ordem recomendada:

1. autenticação e entrada
2. fluxo principal de orders
3. revisão administrativa
4. escopos
5. gestão estrutural
6. financeiro
7. performance e refinamentos

---

# Fase 0. Base de app e shell

## Objetivo

Criar a base reutilizável do frontend.

## Entregas

- layout base
- roteamento
- guarda de rotas por sessão/role
- cliente HTTP
- tratamento global de loading/erro
- menu lateral/topbar
- estado de sessão
- redirecionamento pós-login

## Telas mínimas

- `/`
- `/auth`
- `/welcome`

## Observação

Sem essa base, o resto vira remendo bonito em cima de caos.

---

# Fase 1. Entrada por role

## Objetivo

Fazer o usuário entrar corretamente no sistema e cair no lugar certo.

## Entregas

- login funcional
- leitura de `/me`
- redirecionamento por role/status
- dashboard simples por role

## Telas

- `home`
- `auth`
- `welcome`
- `dashboard`
- `admin`
- `master`

## Dependências mínimas

- auth real
- `/me`

---

# Fase 2. Orders essenciais do assistant

## Objetivo

Entregar o núcleo operacional do assistant.

## Entregas

- lista de orders relevantes
- detalhe da order
- claim
- submit
- visualização clara de status
- inserção/edição operacional básica

## Telas

- `/orders`
- `/orders/:id` ou detalhe em painel
- `/orders/insert`

## Dependências mínimas

- `GET /orders`
- `GET /orders/:id`
- `POST /orders/:id/claim`
- `POST /orders/:id/submit`
- leitura clara de erros de negócio

---

# Fase 3. Aprovação administrativa

## Objetivo

Entregar o núcleo operacional do admin.

## Entregas

- fila de revisão
- detalhe da order para decisão
- approve
- follow-up
- reject
- return-to-pool

## Telas

- `/approval`
- `/approval/duplicate` pode começar depois, ainda nesta fase ou na próxima

## Dependências mínimas

- endpoints administrativos de review
- leitura de orders
- filtros mínimos

---

# Fase 4. Pool e importação

## Objetivo

Dar ao admin visibilidade do que entra no sistema.

## Entregas

- lista do pool
- importação manual
- leitura de batch importado
- feedback claro da importação

## Telas

- `/admin/pool`
- `/admin/pool/import`

## Dependências mínimas

- `POST /pool-import`
- `GET /pool-import/batches/:id`
- leitura de orders importadas

---

# Fase 5. Escopos

## Objetivo

Trazer para o sistema o fluxo real de geração e consulta de escopo.

## Entregas

- gerador de escopo
- lista de escopos
- visualização do inspetor
- busca por order code
- checklist visual

## Telas

- `/scopes`
- `/scopes/inspector`

## Dependências mínimas

- leitura de ordem
- CRUD mínimo de escopo
- consulta de escopo por order

---

# Fase 6. Gestão estrutural

## Objetivo

Entregar controle organizacional para master.

## Entregas

- gestão de times
- aprovação e bloqueio de usuários
- ajuste de roles
- gestão de work types
- pricing básico

## Telas

- `/master/teams`
- `/master/invitations`
- `/master/types`
- `/master/types/pricing`

## Dependências mínimas

- listagem e mutação de usuários
- team assignments
- work types
- pricing

---

# Fase 7. Financeiro

## Objetivo

Entregar visão financeira individual e administrativa.

## Entregas

### Usuário

- pagamento atual
- histórico

### Admin/Master

- lotes
- fechamento
- pagamento

## Telas

- `/mypayment`
- `/mypayment/history`
- `/payments`

## Dependências mínimas

- payment batches
- payment batch items
- visão individual do usuário
- visão administrativa do lote

---

# Fase 8. Performance e dashboards avançados

## Objetivo

Trazer indicadores mais ricos quando o fluxo principal já estiver estável.

## Entregas

- performance por assistant
- performance por admin
- indicadores globais
- dashboards melhores

## Telas

- `/performance`
- `/performance/master`

## Observação

Isso deve vir depois do fluxo principal.
Gráfico antes de operação estável é só maquiagem para problema real.

---

# Fase 9. Ajustes finais e polimento

## Objetivo

Refinar a experiência depois que o sistema já funciona.

## Entregas

- `/settings`
- `/manuals`
- melhorias de navegação
- busca global
- filtros avançados
- paginação
- estados vazios melhores
- consistência visual

---

# Ordem resumida recomendada

## Sequência principal

1. base + auth
2. dashboard por role
3. orders do assistant
4. approvals do admin
5. pool/import
6. scopes
7. gestão master
8. financeiro
9. performance
10. polimento geral

---

# O que não fazer

## 1. Não começar por telas periféricas

Exemplo:

- settings
- manuals
- performance avançada

antes de:

- auth
- orders
- approval

## 2. Não abrir frontend de 12 módulos ao mesmo tempo

Isso só produz tela incompleta por todos os lados.

## 3. Não depender de mock eterno

Mock ajuda no início, mas o fluxo principal tem que encostar cedo no backend real.

---

# Critério para cada fase estar “done”

Uma fase só deve ser considerada concluída quando:

- a tela existe
- o fluxo principal funciona
- loading/erro não estão quebrados
- role errada não vê navegação errada
- typecheck e build continuam ok

---

# Objetivo final

Construir o frontend na ordem do valor operacional.

Não na ordem da empolgação.
Empolgação gera tela.
Fluxo gera sistema.
