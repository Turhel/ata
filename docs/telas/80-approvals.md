# Aprovações Administrativas

## Objetivo
## ReferÃªncia visual do site antigo

- Fonte visual principal: `docs/telas/.old_site/src/pages/dashboard/admin/AdminApprovals.tsx`
- Componentes equivalentes: `docs/telas/.old_site/src/components/orders/OrderDetailsDrawer.tsx` e `docs/telas/.old_site/src/components/orders/OrderHistoryDialog.tsx`
- Esta tela deve permanecer visualmente colada ao fluxo administrativo antigo de revisÃ£o de ordens, sem tentar criar um layout novo por padrÃ£o


Permitir que admin e master revisem ordens submetidas e decidam o próximo passo do fluxo:

- aprovar
- pedir follow-up
- rejeitar
- devolver ao pool, quando aplicável

Esta é a tela central de revisão operacional.

---

## Rota

`/approval`

---

## Perfis com acesso

- admin
- master

---

## Quando o usuário chega aqui

O usuário chega aqui:

- para revisar ordens em `submitted`
- para tratar ordens em `follow_up`
- para decidir o destino operacional de uma ordem
- para acompanhar backlog de revisão

---

## Objetivo do usuário nesta tela

- ver rapidamente o que está pendente de revisão
- abrir uma order
- conferir dados essenciais
- tomar decisão com segurança
- registrar motivo quando necessário
- evitar retrabalho ou decisão apressada

---

## Papel desta tela

Esta é a fila de revisão do sistema.

Ela existe para:

- centralizar a análise administrativa
- reduzir tempo entre submit e decisão
- evitar decisões espalhadas por várias telas
- manter o fluxo explícito e auditável

---

## Conteúdo principal

### 1. Fila de revisão

Estados mais relevantes:

- `submitted`
- `follow_up`, para acompanhamento
- eventualmente `rejected`, para ações subsequentes

Campos úteis por linha:

- external order code
- resident name
- cidade/estado
- assistant responsável
- work type
- datas importantes
- status atual
- tempo desde submit

### 2. Painel de detalhe da order

Ao selecionar uma order:

- dados básicos da ordem
- endereço
- status interno
- source status
- work type
- inspector account, quando existir
- assistant responsável
- timestamps do fluxo
- batch de importação de origem, se útil

### 3. Ações administrativas

- aprovar
- pedir follow-up
- rejeitar
- devolver ao pool, se a regra permitir no estado atual

### 4. Motivos e observações

- campo obrigatório para follow-up
- campo obrigatório para rejeição
- campo obrigatório para retorno ao pool, quando aplicável

---

## Fluxo esperado

### Aprovar

1. admin abre order em `submitted`
2. confere dados mínimos
3. aprova
4. sistema muda para `approved` e registra evento

### Follow-up

1. admin abre order em `submitted`
2. informa motivo claro
3. envia para `follow_up`
4. sistema registra evento e devolve ao assistant

### Rejeitar

1. admin abre order em `submitted` ou `follow_up`
2. informa motivo
3. rejeita
4. sistema registra evento e mantém trilha

### Devolver ao pool

1. admin parte de uma order `rejected`
2. informa motivo
3. devolve ao pool
4. sistema volta a `available`, limpa posse ativa e registra evento

---

## Regras de negócio que impactam a UX

- só admin/master acessam esta tela
- approve exige ordem válida e não cancelada
- follow-up exige motivo
- reject exige motivo
- return-to-pool exige motivo
- decisões críticas devem ser feitas por endpoints explícitos
- o histórico não pode depender de memória humana ou de `updated_at`

---

## Regras de visibilidade

### Admin

- acesso completo à fila operacional

### Master

- acesso completo à fila operacional

### Assistant

- não acessa esta tela de decisão

### Inspector

- não acessa esta tela

---

## Estrutura visual sugerida

### Layout simples inicial

- coluna esquerda: fila de ordens
- coluna direita: detalhe + ações

### Evolução futura

- filtros mais ricos
- painel de métricas da fila
- atalho para duplicatas
- histórico de eventos embutido

---

## Estados da tela

### Loading

- skeleton da lista
- skeleton do painel de detalhe

### Sem ordens pendentes

- mensagem clara
- indicador positivo de fila zerada

### Erro

- mensagem clara
- retry

### Ação em andamento

- botão com loading
- bloquear clique duplo

---

## Dependências de backend

### Já existe parcialmente

- `GET /orders`
- `GET /orders/:id`
- `POST /orders/:id/follow-up`
- `POST /orders/:id/reject`
- `POST /orders/:id/approve`
- `POST /orders/:id/return-to-pool`

### Futuro desejável

- filtros por status
- busca por code/assistant/cidade
- leitura de histórico de `order_events`

---

## Componentes principais

- tabela/lista de fila
- card de detalhe
- modal de motivo
- grupo de ações
- filtros de status e busca

---

## Prioridade de implementação

Alta.

Essa tela é o coração do trabalho do admin. Sem ela, o sistema já tem engine, mas ainda obriga o operador a dirigir encostado na janela.
