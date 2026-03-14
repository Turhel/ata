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
# Dashboard

## Objetivo

Definir a tela de dashboard do ATA Portal para cada role, com foco em:

- visÃ£o rÃ¡pida do trabalho atual
- pendÃªncias prioritÃ¡rias
- mÃ©tricas Ãºteis
- atalhos para aÃ§Ãµes reais
- baixo ruÃ­do visual

O dashboard nÃ£o substitui as telas operacionais.
Ele orienta o usuÃ¡rio para a prÃ³xima aÃ§Ã£o.

---

## Rotas relacionadas

- `/dashboard`
- `/admin`
- `/master`

---

## Roles atendidas

- `assistant`
- `inspector`
- `admin`
- `master`

---

## PrincÃ­pio central

Cada role deve ver um dashboard coerente com o seu trabalho.

### Isso significa:

- assistant vÃª execuÃ§Ã£o e pendÃªncias prÃ³prias
- inspector vÃª acesso rÃ¡pido ao que consulta
- admin vÃª revisÃ£o, filas e gargalos
- master vÃª estrutura, saÃºde operacional e visÃ£o global

---

# 1. Dashboard do Assistant

## Objetivo

Responder rapidamente:

- o que eu tenho para fazer agora
- o que voltou para mim
- o que jÃ¡ enviei
- o que estÃ¡ disponÃ­vel
- como estÃ¡ meu progresso recente

---

## Estrutura recomendada

### Linha 1. MÃ©tricas principais

- Minhas orders em andamento
- Follow-ups pendentes
- Enviadas hoje
- DisponÃ­veis hoje

### Linha 2. Fila e prioridade

- Orders com `follow_up`
- Orders `in_progress`
- Orders disponÃ­veis no pool, se a regra permitir

### Linha 3. Resumo de produtividade

- enviadas no dia
- aprovadas na semana
- rejeitadas na semana

### Linha 4. Atalhos

- Ir para Orders
- Inserir orders
- Abrir Scopes
- Ver pagamentos

---

## Widgets recomendados

### ObrigatÃ³rios na primeira versÃ£o

- metric cards
- lista curta de follow-ups
- lista curta de orders em andamento
- atalhos operacionais

### Opcionais depois

- grÃ¡fico simples da semana
- estimativa financeira da semana
- comparativo com perÃ­odo anterior

---

## AÃ§Ãµes rÃ¡pidas esperadas

- abrir `Orders`
- abrir `Orders` jÃ¡ filtrado por `follow_up`
- abrir `Orders` jÃ¡ filtrado por `in_progress`
- abrir `Scopes`
- abrir `Meu pagamento`

---

## Estados importantes

### Sem orders

Mostrar dashboard Ãºtil mesmo com zero itens.

### Pending

Assistant pending nÃ£o deve ver dashboard operacional.
Deve ser redirecionado para `/welcome`.

### Blocked / inactive

NÃ£o deve operar normalmente.

---

# 2. Dashboard do Inspector

## Objetivo

Dar acesso rÃ¡pido ao que o inspetor realmente precisa.

---

## Estrutura recomendada

### Linha 1. AÃ§Ã£o principal

- Buscar escopo

### Linha 2. Acesso rÃ¡pido

- Ãºltimos escopos consultados
- manuais principais

### Linha 3. Resumo

- pagamentos pessoais, quando existir
- rota atual, quando esse mÃ³dulo existir

---

## Widgets recomendados

### ObrigatÃ³rios na primeira versÃ£o

- card principal de busca de escopo
- lista de Ãºltimos escopos
- atalhos para manuais

### Opcionais depois

- card de pagamentos
- card de rota do dia
- card de ordens ligadas Ã  prÃ³pria atuaÃ§Ã£o

---

## ObservaÃ§Ãµes de UX

- este dashboard deve ser extremamente simples
- se ficar pobre demais, pode atÃ© virar um dashboard funcional mÃ­nimo
- a prioridade real do inspector Ã© chegar rÃ¡pido em `Scopes`

---

# 3. Dashboard do Admin

## Objetivo

Dar visÃ£o operacional da fila, pendÃªncias e ritmo da equipe.

---

## Perguntas que a tela deve responder

- quantas orders estÃ£o aguardando revisÃ£o
- quantos follow-ups estÃ£o em aberto
- quantas aprovaÃ§Ãµes aconteceram hoje
- quantos usuÃ¡rios aguardam aprovaÃ§Ã£o
- houve importaÃ§Ãµes com problema
- existe lote aberto ou pendÃªncia financeira

---

## Estrutura recomendada

### Linha 1. MÃ©tricas principais

- Orders aguardando revisÃ£o
- Follow-ups abertos
- Aprovadas hoje
- UsuÃ¡rios pending

### Linha 2. Filas

- fila de approval
- follow-ups
- rejeitadas aguardando retorno ao pool
- duplicatas, quando existir

### Linha 3. OperaÃ§Ã£o recente

- imports recentes
- atividade recente de revisÃ£o
- submits recentes do time

### Linha 4. Atalhos

- AprovaÃ§Ãµes
- Pool
- Importar Pool
- Pagamentos
- Performance

---

## Widgets recomendados

### ObrigatÃ³rios na primeira versÃ£o

- metric cards
- queue widget de aprovaÃ§Ã£o
- queue widget de follow-up
- imports recentes
- atalhos principais

### Opcionais depois

- tendÃªncia semanal
- follow-up rate
- aprovaÃ§Ãµes por assistant
- retrabalho por perÃ­odo

---

# 4. Dashboard do Master

## Objetivo

Dar visÃ£o estrutural e global do sistema.

---

## Perguntas que a tela deve responder

- hÃ¡ usuÃ¡rios aguardando aprovaÃ§Ã£o
- hÃ¡ times incompletos
- hÃ¡ tipos sem pricing
- hÃ¡ filas administrativas crescentes
- houve importaÃ§Ãµes problemÃ¡ticas
- hÃ¡ gargalo na operaÃ§Ã£o

---

## Estrutura recomendada

### Linha 1. MÃ©tricas principais

- UsuÃ¡rios pending
- Orders aguardando revisÃ£o
- Lotes abertos
- Imports com erro

### Linha 2. Estrutura

- tipos sem pricing
- times com problema
- usuÃ¡rios sem role ou configuraÃ§Ã£o incoerente

### Linha 3. VisÃ£o global

- performance por admin
- volume recente
- distribuiÃ§Ã£o de status das orders

### Linha 4. Atalhos

- UsuÃ¡rios
- Times
- Tipos
- Pricing
- Pagamentos
- Performance global

---

# 5. Regras visuais

## O dashboard deve:

- mostrar nÃºmeros grandes e legÃ­veis
- destacar a aÃ§Ã£o principal da role
- usar poucos widgets por dobra inicial
- evitar excesso de grÃ¡fico na primeira versÃ£o

## O dashboard nÃ£o deve:

- virar mural de tudo que existe no sistema
- competir com as telas operacionais
- mostrar coisa irrelevante sÃ³ para preencher espaÃ§o

---

# 6. Estados gerais da tela

## Loading

- skeleton para cards
- skeleton para listas
- sem piscar a tela inteira

## Empty

- zero com contexto claro
- sem tratar vazio como erro

## Error

- erro localizado
- retry quando fizer sentido

---

# 7. NavegaÃ§Ã£o esperada a partir do dashboard

## Assistant

- `/orders`
- `/orders?status=follow_up`
- `/orders?status=in_progress`
- `/scopes`
- `/mypayment`

## Inspector

- `/scopes/inspector`
- `/manuals`
- `/mypayment`

## Admin

- `/approval`
- `/orders`
- `/admin/pool`
- `/admin/pool/import`
- `/payments`
- `/performance`

## Master

- `/master/invitations`
- `/master/teams`
- `/master/types`
- `/master/types/pricing`
- `/approval`
- `/payments`
- `/performance/master`

---

# 8. Primeira versÃ£o mÃ­nima recomendada

## Assistant

- 4 mÃ©tricas
- 2 listas curtas
- 3 ou 4 atalhos

## Inspector

- busca principal
- Ãºltimos escopos
- manuais

## Admin

- 4 mÃ©tricas
- 3 filas curtas
- imports recentes
- atalhos principais

## Master

- 4 mÃ©tricas
- 3 blocos estruturais
- atalhos administrativos

---

# Objetivo final

O dashboard deve fazer o usuÃ¡rio saber, em poucos segundos:

- o que estÃ¡ acontecendo
- o que precisa de atenÃ§Ã£o
- para onde ele deve ir agora

