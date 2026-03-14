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
# Pool

## Objetivo

Definir a tela e o fluxo de gerenciamento do pool de ordens.

O mÃ³dulo de pool existe para:

- importar batches
- acompanhar resultado da importaÃ§Ã£o
- auditar linhas importadas
- rastrear criaÃ§Ã£o e atualizaÃ§Ã£o de orders
- detectar falhas e inconsistÃªncias
- servir como ponto de entrada do workflow operacional

---

## Rotas principais

- `/admin/pool`
- `/admin/pool/import`

---

## Roles atendidas

- `admin`
- `master`

---

## Papel do mÃ³dulo

O pool nÃ£o Ã© a tela principal de trabalho diÃ¡rio do assistant.

Ele Ã© um mÃ³dulo administrativo de entrada, controle e auditoria do material que entra no sistema.

---

# 1. SubmÃ³dulos

## `/admin/pool`

VisÃ£o de batches e histÃ³rico de importaÃ§Ãµes

## `/admin/pool/import`

Tela de importaÃ§Ã£o do arquivo ou payload

## Futuramente

- detalhe de batch
- itens com erro
- comparaÃ§Ã£o entre imports
- reconciliaÃ§Ã£o de conflitos

---

# 2. Tela `/admin/pool`

## Objetivo

Permitir que admin/master vejam:

- batches importados
- status do batch
- quantidade de linhas
- quantas ordens foram criadas
- quantas foram atualizadas
- quantas falharam
- quais imports precisam atenÃ§Ã£o

---

## Estrutura recomendada

### Bloco 1. Header

- tÃ­tulo: `Pool`
- descriÃ§Ã£o curta
- aÃ§Ã£o principal: `Importar Pool`

### Bloco 2. MÃ©tricas rÃ¡pidas

- imports recentes
- falhas recentes
- batches parciais
- total processado no perÃ­odo

### Bloco 3. Lista de batches

- file name
- status
- total rows
- inserted rows
- updated rows
- ignored rows
- error rows
- imported by
- started at
- finished at

---

# 3. AÃ§Ãµes da tela `/admin/pool`

## Abrir detalhe do batch

Deve mostrar:

- resumo
- itens
- erros
- links para orders geradas ou afetadas, quando fizer sentido

## Ir para importaÃ§Ã£o

BotÃ£o principal

## Filtrar batches

Por:

- status
- data
- usuÃ¡rio
- erro

---

# 4. Tela `/admin/pool/import`

## Objetivo

Permitir que admin/master faÃ§am nova importaÃ§Ã£o de pool com seguranÃ§a e feedback claro.

---

## Estrutura recomendada

### Bloco 1. Header

- tÃ­tulo: `Importar Pool`
- descriÃ§Ã£o curta
- link de volta para `Pool`

### Bloco 2. Ãrea de entrada

Dependendo da implementaÃ§Ã£o:

- upload de arquivo
  ou
- payload JSON de desenvolvimento

### Bloco 3. Resultado

ApÃ³s importar:

- status do batch
- counters
- acesso ao detalhe do batch
- feedback de sucesso ou erro

---

# 5. InformaÃ§Ãµes mÃ­nimas do batch

## O batch deve exibir

- id
- file name
- status
- total rows
- inserted rows
- updated rows
- ignored rows
- error rows
- imported by user id
- started at
- finished at

---

# 6. Itens do batch

## Em detalhe futuro, mostrar:

- line number
- external order code
- source status
- import action
- matched order id
- error message
- created at

---

# 7. Estados de importaÃ§Ã£o

## `processing`

ImportaÃ§Ã£o em andamento

## `completed`

ImportaÃ§Ã£o concluÃ­da sem erro relevante

## `failed`

Falha total

## `partially_completed`

Parte entrou, parte falhou

---

# 8. Import actions por item

## `created`

Criou nova order

## `updated`

Atualizou order jÃ¡ existente

## `ignored`

Linha ignorada

## `failed`

Linha falhou

---

# 9. Regras de UX importantes

## Ao importar

- mostrar claramente que a operaÃ§Ã£o comeÃ§ou
- bloquear duplo envio
- mostrar resultado final
- facilitar acesso ao batch gerado

## Em caso de falha

- nÃ£o esconder erro
- mostrar se a falha foi total ou parcial
- permitir auditoria posterior

## Em caso de sucesso

- mostrar counters
- link para detalhe do batch
- deixar claro impacto nas orders

---

# 10. RelaÃ§Ã£o com o domÃ­nio

O pool Ã© a entrada do workflow de orders.

### A importaÃ§Ã£o deve:

- preservar raw payload
- usar external order code como chave principal de match
- nÃ£o destruir histÃ³rico operacional
- separar source status de status interno

---

# 11. RelaÃ§Ã£o com outras telas

## Orders

Orders criadas ou atualizadas devem aparecer no fluxo operacional

## Approval

SÃ³ depois da operaÃ§Ã£o seguir o curso

## Performance

PoderÃ¡ refletir volume importado

## Master types

No futuro, pool import pode ajudar a detectar `OTYPE` ainda nÃ£o catalogado

---

# 12. Primeira versÃ£o mÃ­nima recomendada

## `/admin/pool`

- lista de batches
- mÃ©tricas mÃ­nimas
- botÃ£o de importar

## `/admin/pool/import`

- entrada simples
- feedback de sucesso/erro
- retorno do batch criado

---

# 13. Filtros recomendados para batches

## Primeira versÃ£o

- status
- data

## Depois

- imported by
- file name
- com erro
- parcialmente concluÃ­dos

---

# 14. Estados da tela

## Loading

- skeleton para mÃ©tricas
- skeleton para tabela

## Empty

- nenhum batch ainda
- nenhum resultado para esse filtro

## Error

- erro de carregamento
- retry claro

---

# 15. Riscos de UX que devem ser evitados

- importar sem feedback claro
- esconder counters
- esconder falhas parciais
- misturar pool com orders gerais
- nÃ£o deixar claro o efeito do batch

---

# Objetivo final

O mÃ³dulo de pool deve permitir que admin/master saibam exatamente:

- o que entrou
- o que foi criado
- o que foi atualizado
- o que falhou
- o que precisa de atenÃ§Ã£o

Sem opacidade.
Sem import â€œmÃ¡gicaâ€.
Sem descobrir no susto que metade entrou errada.

