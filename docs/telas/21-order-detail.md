
# Detalhe da Ordem

## Objetivo

Exibir uma ordem individual com contexto suficiente para operação, revisão e auditoria.

Esta tela é o ponto central de ação sobre a ordem.

---

## Rota

`/orders/:id`

---

## Perfis com acesso

- assistant, quando a ordem estiver no seu escopo permitido
- admin
- master
- inspector em leitura limitada futura, se necessário

---

## Quando o usuário chega aqui

O usuário chega aqui:

- a partir da lista de ordens
- a partir da fila de approvals
- a partir do pool
- a partir de links internos do dashboard

---

## Objetivo do usuário nesta tela

### Assistant

- entender a situação da ordem
- preparar ou corrigir dados
- enviar para revisão
- responder follow-up

### Admin

- revisar
- aprovar
- rejeitar
- pedir follow-up
- devolver ao pool
- validar histórico

### Master

- auditar
- intervir administrativamente
- validar consistência do fluxo

---

## Blocos principais da tela

- cabeçalho da ordem
- status interno
- status de origem
- dados principais da ordem
- endereço
- vínculo operacional
- dados de importação
- histórico operacional
- ações disponíveis
- escopo vinculado, quando existir
- pagamentos vinculados, futuramente

---

## Informações mínimas que devem aparecer

- id interno
- external order code
- source status
- status interno
- resident name
- address line 1
- address line 2
- city
- state
- zip code
- available date
- deadline date
- assistant user id ou nome resolvido no futuro
- source import batch id
- created at
- updated at

---

## Seções sugeridas

### 1. Resumo

- código externo
- status
- badge visual forte
- datas principais

### 2. Dados da ordem

- morador
- endereço
- cidade
- estado
- flags como rush e vacant

### 3. Contexto operacional

- assistant responsável
- batch de origem
- claimed at
- submitted at
- approved at
- rejected at
- follow up at
- returned to pool at

### 4. Histórico

- timeline de eventos
- usuário autor
- motivo, quando houver

### 5. Ações

- claim
- submit
- follow-up
- reject
- approve
- return to pool
- edição futura controlada

---

## Ações por role e status

### Assistant em `available`

- não deveria editar
- pode assumir, se permitido

### Assistant em `in_progress`

- pode editar campos operacionais permitidos
- pode enviar para revisão

### Assistant em `follow_up`

- pode ver motivo
- pode corrigir
- pode reenviar

### Assistant em `submitted`

- leitura quase total
- sem edição livre
- sem decisão administrativa

### Admin em `submitted`

- pode aprovar
- pode rejeitar
- pode pedir follow-up

### Admin em `rejected`

- pode devolver ao pool
- pode analisar reaproveitamento

### Ordens `cancelled`

- devem aparecer claramente como bloqueadas
- sem ações operacionais normais

### Ordens `batched` ou `paid`

- leitura forte
- edição fortemente restrita

---

## Regras de negócio que impactam a UX

- motivo é obrigatório em follow-up
- motivo é obrigatório em reject
- return to pool é ação explícita
- cancelamento precisa aparecer com destaque
- source status não substitui o workflow interno
- assistant não aprova a própria execução
- histórico deve explicar o que aconteceu, não apenas mostrar timestamps

---

## Estados da tela

### Loading

- skeleton dos blocos

### Não encontrada

- mensagem clara de order não encontrada

### Sem permissão

- mensagem clara de acesso negado

### Erro

- bloco de erro com retry

---

## Dependências de backend

### Mínimo atual

- `GET /orders/:id`

### Ações já previstas

- `POST /orders/:id/claim`
- `POST /orders/:id/submit`
- `POST /orders/:id/follow-up`
- `POST /orders/:id/reject`
- `POST /orders/:id/approve`
- `POST /orders/:id/return-to-pool`

### Futuro

- `PATCH /orders/:id`
- endpoint de leitura de `order_events`
- endpoint de leitura de notas
- endpoint de vínculo com escopos

---

## Componentes principais

- cabeçalho com badges
- cards de informação
- timeline de histórico
- bloco de ações
- modais de confirmação
- modal ou drawer para reason
- mensagens contextuais de bloqueio

---

## Prioridade de implementação

Alta.

Sem esta tela, o workflow fica espalhado e confuso.

---

## Observações

A primeira versão pode começar com:

- leitura clara da ordem
- ações explícitas
- feedback de erro/sucesso
- histórico mínimo assim que houver endpoint

Não vale transformar esta tela em um formulário gigante sem critério.
Ela deve ser:

- legível
- operacional
- orientada ao status da ordem
