# Meus Pagamentos

## Objetivo

Permitir ao usuário acompanhar seus pagamentos atuais e a situação financeira mais recente relacionada ao seu trabalho no sistema.

A primeira versão deve focar em leitura clara, não em engenharia aeroespacial disfarçada de dashboard.

---

## Rota

`/mypayment`

---

## Perfis com acesso

- assistant
- inspector

> Admin e master não usam esta tela como visão principal.
> Eles terão telas administrativas do financeiro.

---

## Quando o usuário chega aqui

O usuário chega aqui:

- para saber quanto tem a receber
- para ver o lote atual
- para consultar itens da semana
- para conferir se determinada ordem entrou em pagamento

---

## Objetivo do usuário nesta tela

- ver resumo do período atual
- ver pagamentos em aberto
- ver lote atual, se existir
- entender quais ordens estão contempladas
- baixar arquivos de pagamento, se houver

---

## Papel desta tela

Esta tela é a visão financeira individual do usuário.

Ela existe para:

- reduzir dúvida operacional
- evitar consulta manual por mensagem
- mostrar de forma transparente o que entrou ou não entrou no pagamento

---

## Conteúdo principal

### 1. Resumo do período atual

- total previsto
- total fechado
- total pago
- quantidade de ordens no período
- status do lote atual

### 2. Lista de itens do período

Campos úteis:

- order code
- work type
- valor
- quantidade
- status
- referência do lote
- data relevante

### 3. Arquivos disponíveis

- comprovante
- planilha
- resumo exportado
- outros arquivos do lote, se existirem

### 4. Informações auxiliares

- período considerado
- observações do lote
- aviso se ainda não existe lote fechado

---

## Regras de negócio que impactam a UX

- assistant e inspector veem apenas seu próprio contexto financeiro
- approved não significa pago
- batched não significa pago
- paid é o estado final consolidado
- o sistema deve deixar clara a diferença entre:
  - elegível
  - em lote
  - pago

---

## Regras de visibilidade

### Assistant

- vê seus dados financeiros

### Inspector

- vê seus dados financeiros, quando essa parte estiver ligada ao modelo final

### Admin

- não usa esta visão individual como principal

### Master

- não usa esta visão individual como principal

---

## Estados da tela

### Sem lote atual

- exibir resumo zerado
- explicar que ainda não há lote fechado/pago

### Com lote em aberto

- exibir status como pendente/em processamento

### Com lote pago

- exibir resumo e itens confirmados

### Loading

- skeleton de cards e tabela

### Erro

- mensagem clara com retry

---

## Dependências de backend

### Futuro mínimo

- endpoint de resumo financeiro do usuário atual
- endpoint de itens do lote atual
- endpoint de arquivos disponíveis
- leitura de payment batches e payment batch items no escopo do usuário

---

## Componentes principais

- cards de resumo
- tabela de itens
- lista de arquivos
- header do período atual

---

## Prioridade de implementação

Média.

É muito importante para confiança do usuário, mas depende do módulo financeiro estar pelo menos minimamente de pé.

---

## Observações

A primeira versão precisa ser transparente.
Usuário não quer poesia visual aqui.
Usuário quer saber: entrou, não entrou, quanto é, quando sai.
