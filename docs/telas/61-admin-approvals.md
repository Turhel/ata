# Aprovações Administrativas

## Objetivo
## ReferÃªncia visual do site antigo

- Fonte visual principal: `docs/telas/.old_site/src/pages/dashboard/admin/AdminApprovals.tsx`
- Componentes equivalentes: `docs/telas/.old_site/src/components/orders/OrderDetailsDrawer.tsx` e `docs/telas/.old_site/src/components/orders/DuplicateRequestsSection.tsx`
- A implementaÃ§Ã£o nova deve preservar a experiÃªncia antiga de fila administrativa com detalhe lateral, aÃ§Ãµes explÃ­citas e foco em decisÃ£o rÃ¡pida


Permitir que admin e master revisem ordens submetidas e executem as decisões centrais do workflow:

- approve
- follow-up
- reject
- return to pool

Esta é uma das telas mais importantes do fluxo administrativo.

---

## Rota

`/admin/approvals`

---

## Perfis com acesso

- admin
- master

---

## Quando o usuário chega aqui

O usuário chega aqui:

- após ordens serem submetidas por assistants
- quando precisa revisar pendências
- quando precisa decidir follow-up, reject ou approve
- quando precisa devolver ordem ao pool após rejeição

---

## Objetivo do usuário nesta tela

- ver fila de ordens em `submitted`
- abrir detalhe rapidamente
- decidir o próximo passo
- revisar ordens em `follow_up` ou `rejected`, quando necessário
- reduzir gargalos administrativos

---

## Conteúdo principal

### 1. Cabeçalho

- título
- resumo da fila
- contadores por status relevante

### 2. Filtros

- submitted
- follow_up
- rejected
- approved, opcional
- busca por código externo
- assistant responsável
- datas

### 3. Lista administrativa

- tabela ou cards com ordens
- status
- dados essenciais
- assistant
- datas importantes
- ações rápidas

### 4. Painel de ação

- approve
- follow-up
- reject
- return to pool, quando a ordem estiver rejected

### 5. Acesso ao detalhe

- abrir `/orders/:id`

---

## Ações principais

### Approve

- disponível para `submitted`
- sem motivo
- validação mínima de completude

### Follow-up

- disponível para `submitted`
- motivo obrigatório

### Reject

- disponível para `submitted` ou `follow_up`
- motivo obrigatório

### Return to pool

- disponível para `rejected`
- motivo obrigatório
- devolve para `available`

---

## Regras de negócio que impactam a UX

- ações críticas precisam ser explícitas
- follow-up exige motivo
- reject exige motivo
- return to pool exige motivo
- order cancelada não pode ser aprovada
- assistant não executa estas ações
- status interno é a base da fila
- source status precisa estar visível, mas não manda sozinho na decisão

---

## Regras de visibilidade

### Admin

- acesso completo à fila administrativa

### Master

- acesso completo e visão ampla

### Assistant

- não acessa esta tela

### Inspector

- não acessa esta tela

---

## Estados da tela

### Loading

- skeleton da fila

### Fila vazia

- mensagem clara de ausência de ordens pendentes

### Erro

- erro de carregamento com retry

### Ação em andamento

- botão em loading
- evitar clique duplo

### Sucesso

- feedback claro
- atualizar a linha ou remover da fila conforme ação

---

## Dependências de backend

### Já previstas ou existentes

- `GET /orders`
- `GET /orders/:id`
- `POST /orders/:id/follow-up`
- `POST /orders/:id/reject`
- `POST /orders/:id/approve`
- `POST /orders/:id/return-to-pool`

### Futuro desejável

- filtros reais por status
- endpoint otimizado para fila administrativa
- leitura de `order_events`

---

## Componentes principais

- filtros
- tabela de fila
- badges de status
- modal de confirmação
- modal com campo `reason`
- atalho para detalhe
- toast ou feedback inline

---

## Prioridade de implementação

Alta.

Sem esta tela, o admin fica operando só por detalhe individual ou terminal, o que é o paraíso do retrabalho.

---

## Observações

Na primeira versão:

- foque em `submitted`
- permita follow-up, reject e approve
- inclua `rejected` com return to pool
- não precisa construir cockpit analítico ainda

O importante é deixar o workflow administrativo funcional e legível.
