# Lista do Pool

## Objetivo
## ReferÃªncia visual do site antigo

- Fonte visual principal: `docs/telas/.old_site/src/pages/dashboard/admin/AdminPoolImport.tsx`
- Blocos equivalentes: histÃ³rico de batches, preview tabular e busca local dentro do lote
- A tela nova deve reaproveitar a organizaÃ§Ã£o antiga de lista + preview, separando apenas o que agora for endpoint distinto


Permitir que admin e master visualizem o pool atual de ordens disponíveis, consultem o efeito das importações e acompanhem a massa operacional antes da posse pelo assistant.

---

## Rota

`/admin/pool`

---

## Perfis com acesso

- admin
- master

---

## Quando o usuário chega aqui

O usuário chega aqui:

- depois de importar o pool
- para revisar ordens disponíveis
- para checar ordens canceladas
- para localizar ordens por código externo
- para acompanhar volume operacional vindo da origem

---

## Objetivo do usuário nesta tela

- ver quais ordens estão `available`
- filtrar por source status e status interno
- localizar ordens específicas
- entender o que entrou recentemente
- identificar inconsistências ou conflitos

---

## Papel desta tela

Esta tela representa a visão administrativa do “estoque operacional”.

Ela não substitui a gestão completa de orders, mas deve ser a melhor visão para:

- pool atual
- ordens recém-importadas
- elegibilidade para posse
- impacto de importações

---

## Conteúdo principal

### 1. Resumo do pool

- total de ordens disponíveis
- total por source status
- total canceladas
- total recentemente importadas

### 2. Filtros

- external order code
- source status
- status interno
- cidade
- available date
- deadline date
- batch de importação
- flags como rush ou vacant, se útil

### 3. Lista principal

Campos úteis:

- external order code
- source status
- status interno
- resident name
- city/state
- available date
- deadline date
- source import batch id
- assistant responsável, se já não estiver mais disponível

### 4. Ações rápidas

- abrir detalhe da ordem
- abrir batch de origem
- eventualmente exportar lista filtrada, no futuro

---

## Regras de negócio que impactam a UX

- source status e status interno são diferentes
- ordem cancelada não deve parecer elegível para fluxo normal
- importação não apaga histórico operacional
- available é o principal status do pool operacional
- ordens podem ter vindo de batch diferente e ainda existir no sistema há mais tempo

---

## Regras de visibilidade

### Admin

- acesso principal ao pool

### Master

- mesma visão com escopo mais amplo

### Assistant

- não acessa esta visão administrativa do pool
- no futuro pode ter visão própria de ordens disponíveis para claim

### Inspector

- não acessa

---

## Estados da tela

### Loading

- skeleton de resumo e tabela

### Sem resultados

- mensagem clara
- filtros mantidos

### Erro

- erro com retry

---

## Dependências de backend

### Já existe parcialmente

- `GET /orders`
- `GET /orders/:id`

### Futuro ideal

- filtros no endpoint de listagem
- ordenação controlada
- paginação

---

## Componentes principais

- cards de resumo
- barra de filtros
- tabela do pool
- badges de status
- links para detalhe

---

## Prioridade de implementação

Média para alta.

Depois da importação, esta tela vira extremamente útil para operação administrativa normal.

---

## Observações

A primeira versão pode nascer em cima de `GET /orders` com filtro simples no front, mas isso é só um tapa-buraco decente.
Depois o backend deve assumir filtros reais, porque não faz sentido baixar o universo inteiro para brincar de peneira no navegador.
