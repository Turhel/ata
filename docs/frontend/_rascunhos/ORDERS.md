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
# Orders

## Objetivo

Definir a tela principal de ordens do ATA Portal.

Esta Ã© uma das telas centrais do sistema e precisa permitir:

- localizar ordens
- entender o estado atual de cada order
- abrir detalhes
- executar aÃ§Ãµes permitidas por role
- navegar pelo fluxo operacional sem confusÃ£o

---

## Rota principal

- `/orders`

---

## Rotas relacionadas

- `/orders/:id`
- `/orders/insert`

---

## Roles atendidas

- `assistant`
- `admin`
- `master`
- `inspector` apenas se houver visÃ£o futura limitada e especÃ­fica

---

## Papel da tela

A tela de orders Ã© a visÃ£o operacional principal da tabela `orders`.

Ela nÃ£o substitui:

- approvals
- pool
- payments
- scopes

Mas conversa com todas essas Ã¡reas.

---

# 1. Objetivos por role

## Assistant

Precisa:

- ver ordens prÃ³prias
- ver ordens disponÃ­veis, se permitido
- localizar rapidamente uma order
- entender status e prÃ³xima aÃ§Ã£o
- abrir detalhe
- assumir
- enviar
- reenviar

## Admin

Precisa:

- ver ordens operacionais
- localizar e auditar
- abrir detalhe
- entender contexto da order
- revisar e navegar para approval

## Master

Precisa:

- visÃ£o ampla
- detalhe e auditoria
- suporte administrativo
- conferÃªncia estrutural

## Inspector

Em princÃ­pio nÃ£o Ã© a tela principal dele.
A visÃ£o do inspetor deve ficar concentrada em escopos e consultas limitadas.

---

# 2. Estrutura da tela

## Bloco 1. Header

- tÃ­tulo: `Orders`
- descriÃ§Ã£o curta
- aÃ§Ã£o primÃ¡ria contextual, quando existir
- aÃ§Ã£o secundÃ¡ria opcional

## Bloco 2. Busca e filtros

- busca por cÃ³digo externo
- filtro por status
- filtro por source status
- filtro por responsÃ¡vel
- filtro por data disponÃ­vel
- limpar filtros

## Bloco 3. ConteÃºdo principal

- tabela no desktop
- cards no mobile
- painel de detalhe opcional ou navegaÃ§Ã£o para rota de detalhe

---

# 3. Colunas recomendadas

## Primeira versÃ£o mÃ­nima

- external order code
- status
- source status
- resident name
- city/state
- assistant
- available date
- deadline date
- updated at
- aÃ§Ãµes

## Colunas secundÃ¡rias possÃ­veis depois

- work type
- import batch
- flags relevantes
- origem do problema
- team/admin responsÃ¡vel

---

# 4. Filtros recomendados

## ObrigatÃ³rios na primeira versÃ£o

- status
- source status
- busca por external code

## Ãšteis depois

- assistant
- date range
- import batch
- work type
- city/state
- only mine
- only available

---

# 5. Estados e recortes operacionais

## Para Assistant

Recortes importantes:

- minhas em andamento
- minhas follow-ups
- disponÃ­veis
- enviadas

## Para Admin

Recortes importantes:

- submitted
- follow_up
- rejected
- approved
- canceladas
- problemÃ¡ticas

## Para Master

Recortes importantes:

- visÃ£o global
- status crÃ­ticos
- ordens canceladas no fluxo
- ordens em incoerÃªncia

---

# 6. AÃ§Ãµes por role

## Assistant

### Pode ver

- own orders
- available orders, se permitido

### Pode fazer

- claim
- submit
- resubmit
- editar dados operacionais permitidos
- abrir escopo associado, quando existir

### NÃ£o pode

- approve
- reject
- follow-up
- return-to-pool
- aÃ§Ãµes financeiras

---

## Admin

### Pode ver

- ordens operacionais amplas

### Pode fazer

- abrir detalhe
- navegar para approval
- intervir administrativamente
- conferir histÃ³rico
- avaliar problemas
- em casos permitidos, agir diretamente nas actions administrativas

---

## Master

### Pode ver

- tudo o que o admin vÃª
- mais contexto estrutural quando fizer sentido

### Pode fazer

- leitura ampla
- aÃ§Ãµes administrativas permitidas
- auditoria estrutural

---

# 7. Detalhe da order

## O detalhe deve mostrar pelo menos

- id
- external code
- source status
- status
- residente
- endereÃ§o
- city/state/zip
- work type
- inspector account id
- assigned inspector id
- assistant user id
- import batch
- datas operacionais
- flags importantes

---

## InformaÃ§Ãµes de destaque no detalhe

- status atual
- source status
- bloqueios de fluxo
- motivo de follow-up ou reject, quando existir em eventos/notas futuras
- timestamps principais

---

# 8. IntegraÃ§Ã£o com outras telas

## A tela de orders deve conversar com:

- `Approval`
- `Pool`
- `Scopes`
- `Payments`
- `Performance`

### Exemplos

- admin abre detalhe e vai para approval
- assistant abre order e vai para submit
- admin vÃª import batch associado
- master audita origem da order

---

# 9. Estados da tela

## Loading

- skeleton de tabela
- skeleton de cards no mobile

## Empty

Mensagem depende do contexto:

- sem ordens
- sem resultado para filtro
- sem ordens prÃ³prias
- sem ordens disponÃ­veis

## Error

- erro de carregamento
- retry claro

---

# 10. Primeira versÃ£o mÃ­nima recomendada

## Backend esperado

- `GET /orders`
- `GET /orders/:id`
- `POST /orders/:id/claim`
- `POST /orders/:id/submit`
- `POST /orders/:id/resubmit`
- aÃ§Ãµes administrativas jÃ¡ existentes ou integradas por approval

## Front mÃ­nimo

- lista
- busca
- filtro por status
- detalhe
- actions contextuais bÃ¡sicas

---

# 11. Ordem de implementaÃ§Ã£o sugerida

1. lista simples com busca
2. detalhe da order
3. filtros mÃ­nimos
4. actions do assistant
5. link para approval
6. filtros avanÃ§ados
7. refinamento mobile

---

# 12. Regras de UX importantes

- status precisa ser imediatamente legÃ­vel
- actions precisam respeitar role e status
- nÃ£o lotar a tabela com coluna inÃºtil
- o detalhe deve facilitar decisÃ£o, nÃ£o poluir
- filtros ativos devem ficar visÃ­veis
- erro de regra da API precisa aparecer de forma clara

---

# Objetivo final

A tela de orders deve ser o centro operacional mais confiÃ¡vel do sistema.

Quem abrir essa tela deve conseguir:

- localizar a order certa
- entender em que estado ela estÃ¡
- saber o que pode fazer com ela
- seguir para a prÃ³xima etapa do fluxo sem atrito

