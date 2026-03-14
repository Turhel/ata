> **Rascunho (legado)**
> Este arquivo é uma consolidação antiga.
> A fonte de verdade para telas reais está em `docs/telas/` (arquivos numerados) e nos índices dessa pasta.
> Não use este arquivo como referência principal de implementação.
>
> Referências:
> - `docs/telas/README.md`
> - `docs/telas/INDEX.md`
> - `docs/frontend/README.md`

---
# My Payment

## Objetivo

Definir a Ã¡rea de pagamentos pessoais do usuÃ¡rio no ATA Portal.

Este mÃ³dulo existe para:

- permitir que o usuÃ¡rio acompanhe seu pagamento atual
- consultar histÃ³rico de pagamentos passados
- baixar arquivos ou comprovantes relacionados, quando existirem
- dar transparÃªncia sem misturar isso com gestÃ£o financeira administrativa

---

## Rotas principais

- `/mypayment`
- `/mypayment/history`

---

## Roles atendidas

- `assistant`
- `inspector`
- eventualmente `admin` e `master` apenas no prÃ³prio contexto pessoal, se desejado

---

## Papel da tela

A Ã¡rea `My Payment` Ã© uma visÃ£o pessoal e resumida.

Ela nÃ£o substitui:

- gestÃ£o de lotes
- fechamento financeiro
- auditoria administrativa

Ela existe para responder:

- quanto tenho na semana/perÃ­odo
- quais itens estÃ£o no meu pagamento
- o que jÃ¡ foi pago
- o que ainda estÃ¡ em aberto

---

# 1. Tela `/mypayment`

## Objetivo

Mostrar o pagamento atual ou mais recente relevante para o usuÃ¡rio logado.

---

## Estrutura recomendada

### Bloco 1. Header

- tÃ­tulo: `Meu Pagamento`
- descriÃ§Ã£o curta
- perÃ­odo atual exibido

### Bloco 2. Resumo principal

- valor atual
- quantidade de itens
- status do lote relacionado
- perÃ­odo

### Bloco 3. Itens do perÃ­odo

- orders incluÃ­das
- tipo de trabalho
- valores
- quantidade
- datas relevantes

### Bloco 4. Arquivos

- download de arquivo resumido, quando existir
- comprovantes, quando existirem no futuro

---

## Dados principais esperados

- perÃ­odo do lote
- status do lote
- total pessoal
- quantidade de orders incluÃ­das
- items que compÃµem o valor

---

# 2. Tela `/mypayment/history`

## Objetivo

Mostrar os pagamentos passados do usuÃ¡rio.

---

## Estrutura recomendada

### Bloco 1. Header

- tÃ­tulo: `HistÃ³rico de Pagamentos`

### Bloco 2. Filtros

- perÃ­odo
- status
- busca por referÃªncia, se fizer sentido

### Bloco 3. Lista

- reference code
- perÃ­odo
- status
- total pessoal
- data de fechamento
- data de pagamento

---

## Detalhe futuro possÃ­vel

Ao abrir um item do histÃ³rico:

- ver composiÃ§Ã£o do lote
- ver items do usuÃ¡rio
- baixar arquivo relacionado

---

# 3. Regras de UX importantes

## O usuÃ¡rio deve conseguir entender:

- se aquilo jÃ¡ foi pago
- se aquilo ainda estÃ¡ em aberto
- quais orders entraram naquele valor
- a diferenÃ§a entre aprovado, loteado e pago

---

## ConsequÃªncias

- labels precisam ser claras
- status financeiro nÃ£o pode ser ambÃ­guo
- valores devem ser destacados
- histÃ³rico deve ser simples de consultar

---

# 4. O que mostrar

## Em `/mypayment`

### Alta prioridade

- total atual
- status
- perÃ­odo
- lista de items

### MÃ©dia prioridade

- observaÃ§Ãµes do lote
- download de arquivo

---

## Em `/mypayment/history`

### Alta prioridade

- lista de perÃ­odos pagos
- valores
- status
- data de pagamento

### MÃ©dia prioridade

- detalhe expandido
- arquivo associado

---

# 5. O que evitar

- misturar tela pessoal com aÃ§Ãµes administrativas
- expor campos financeiros confusos
- mostrar cÃ¡lculo cru sem contexto
- mostrar status tÃ©cnicos sem explicaÃ§Ã£o

---

# 6. RelaÃ§Ã£o com outras telas

## Dashboard

Pode trazer card resumido de pagamento atual

## Payments

Tela administrativa que gera o contexto do pagamento pessoal

---

# 7. Estados da tela

## Loading

- skeleton para resumo
- skeleton para lista

## Empty

- nenhum pagamento atual
- nenhum histÃ³rico ainda

## Error

- falha ao carregar
- retry claro

---

# 8. Primeira versÃ£o mÃ­nima recomendada

## `/mypayment`

- resumo do perÃ­odo atual
- lista simples dos items pessoais
- status do lote

## `/mypayment/history`

- lista simples de pagamentos passados

---

# 9. Objetivo final

A Ã¡rea `My Payment` deve dar transparÃªncia suficiente para o usuÃ¡rio saber:

- o que entrou no pagamento
- o que jÃ¡ foi pago
- o que ainda nÃ£o foi pago
- qual foi seu histÃ³rico recente

Sem abrir a caixa-preta do financeiro inteiro.

