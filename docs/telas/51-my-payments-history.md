# Histórico de Pagamentos

## Objetivo

Permitir ao usuário consultar pagamentos passados, com visão organizada por período e lote, preservando rastreabilidade financeira.

---

## Rota

`/mypayment/history`

---

## Perfis com acesso

- assistant
- inspector

---

## Quando o usuário chega aqui

O usuário chega aqui:

- para consultar pagamentos antigos
- para confirmar se uma ordem já foi paga
- para comparar semanas ou períodos
- para baixar arquivos antigos

---

## Objetivo do usuário nesta tela

- ver histórico por lote
- localizar ordem ou pagamento antigo
- conferir valores passados
- baixar arquivos de referência anteriores

---

## Papel desta tela

Esta tela é o arquivo financeiro individual do usuário.

Ela existe para:

- preservar transparência
- reduzir dúvidas recorrentes
- evitar busca manual em arquivo solto
- manter histórico consultável

---

## Conteúdo principal

### 1. Lista de lotes passados

Campos úteis:

- referência do lote
- período
- status
- total de itens
- total pago ao usuário
- data de pagamento

### 2. Busca e filtros

- por período
- por referência do lote
- por order code
- por status
- por faixa de data

### 3. Detalhe expandido do lote

- itens do lote
- valores por item
- work type
- ordem relacionada
- arquivos disponíveis

---

## Regras de negócio que impactam a UX

- histórico não deve mudar retroativamente por edição de orders
- payment batch items representam snapshot
- o usuário vê apenas o próprio histórico
- a tela deve deixar claro que os valores são históricos congelados do lote

---

## Regras de visibilidade

### Assistant

- vê apenas seu histórico

### Inspector

- vê apenas seu histórico

### Demais roles

- telas administrativas próprias, não esta

---

## Estados da tela

### Sem histórico

- mensagem clara
- link de volta para pagamento atual

### Loading

- skeleton da lista e filtros

### Sem resultados no filtro

- mensagem clara mantendo filtros ativos

### Erro

- erro com retry

---

## Dependências de backend

### Futuro mínimo

- endpoint de histórico financeiro do usuário
- detalhe de lotes passados
- busca por order code dentro do histórico
- arquivos por lote

---

## Componentes principais

- filtros por período
- lista de lotes
- detalhe expansível
- links de download

---

## Prioridade de implementação

Média para baixa no início.

Muito útil, mas pode nascer depois da visão do pagamento atual, já que primeiro o sistema precisa aprender a pagar antes de virar memorial do que pagou.

---

## Observações

A UX aqui deve priorizar clareza e busca.
Histórico ruim obriga o usuário a perguntar de novo no WhatsApp.
E o objetivo do sistema é justamente parar de transformar tudo em arqueologia por mensagem.
