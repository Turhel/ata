# Gestão de Pagamentos

## Objetivo

Permitir que admin e master organizem o fluxo financeiro operacional:

- selecionar ordens aprovadas
- criar lote
- revisar lote
- fechar lote
- marcar lote como pago

Esta tela representa o fechamento do ciclo operacional.

---

## Rota

`/admin/payments`

Detalhe futuro:
`/admin/payments/:id`

---

## Perfis com acesso

- admin
- master

---

## Quando o usuário chega aqui

O usuário chega aqui:

- quando precisa preparar pagamento
- quando precisa revisar ordens aprovadas
- quando precisa fechar lote
- quando precisa marcar lote como pago
- quando precisa consultar histórico de lotes

---

## Objetivo do usuário nesta tela

- ver ordens elegíveis para lote
- criar novo lote
- acompanhar lotes abertos
- fechar lote
- marcar lote como pago
- consultar histórico de batches

---

## Papel desta tela

Esta tela não é só uma listagem de dinheiro.

Ela existe para:

- transformar ordens `approved` em fluxo financeiro controlado
- congelar snapshot
- impedir recalcular passado de forma solta
- dar rastreabilidade ao pagamento

---

## Conteúdo principal

### 1. Resumo financeiro

- ordens aprovadas elegíveis
- quantidade
- valor estimado futuro, se já existir cálculo
- lotes abertos
- lotes fechados
- lotes pagos

### 2. Fila de elegíveis

- ordens `approved`
- filtros
- seleção para lote

### 3. Lotes existentes

- open
- closed
- paid
- data de criação
- total de itens
- total do lote

### 4. Ações

- criar lote
- abrir detalhe do lote
- fechar lote
- marcar como pago

---

## Fluxo esperado

### Criar lote

1. admin acessa tela
2. vê ordens `approved`
3. seleciona conjunto elegível
4. cria lote
5. sistema gera snapshot em `payment_batch_items`
6. ordens viram `batched`

### Fechar lote

1. admin abre lote `open`
2. revisa itens
3. fecha lote
4. lote vira `closed`

### Marcar como pago

1. admin abre lote `closed`
2. confirma pagamento
3. lote vira `paid`
4. ordens relacionadas podem virar `paid`

---

## Regras de negócio que impactam a UX

- pagamento trabalha com snapshot
- ordem aprovada ainda não está paga
- ordem `batched` não deve voltar à edição operacional livre
- ordem `paid` não entra em fluxo normal
- lote `open` ainda aceita ajustes permitidos
- lote `closed` não aceita comportamento de edição normal
- lote `paid` vira registro definitivo
- a mesma ordem não deve entrar duas vezes no mesmo lote

---

## Regras de visibilidade

### Admin

- acesso completo ao módulo financeiro operacional

### Master

- acesso completo e visão estrutural

### Assistant

- não acessa esta tela
- no futuro pode ter visão própria em `/me/payments`

### Inspector

- não acessa esta tela
- no futuro pode ter visão própria resumida

---

## Estados da tela

### Loading

- resumo carregando
- filas e lotes carregando

### Sem elegíveis

- mensagem clara de que não há ordens aprovadas prontas para lote

### Sem lotes

- mensagem clara em histórico vazio

### Erro

- falha de carregamento com retry

### Sucesso em ação

- lote criado
- lote fechado
- lote pago
- feedback claro e atualização da lista

---

## Dependências de backend

### Futuras

- `GET /payment-batches`
- `POST /payment-batches`
- `GET /payment-batches/:id`
- `POST /payment-batches/:id/close`
- `POST /payment-batches/:id/pay`

### Dependências indiretas

- ordens `approved`
- `payment_batch_items`
- work types e pricing resolvidos

---

## Componentes principais

- cards de resumo
- tabela de elegíveis
- seleção em massa
- tabela de lotes
- drawer ou detalhe de lote
- modais de confirmação

---

## Prioridade de implementação

Média.

É módulo crítico do produto final, mas depende de orders, approvals, work types e pricing estarem razoavelmente prontos.

---

## Observações

A primeira versão deve ser objetiva:

- lista de ordens elegíveis
- criação de lote
- detalhe simples
- fechar
- pagar

Sem inventar dashboard financeiro barroco cedo demais.
Primeiro precisa funcionar. Depois vocês enfeitam o sofrimento com gráfico.
