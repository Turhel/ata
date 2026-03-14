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
# Admin

## Objetivo

Definir a Ã¡rea principal do admin no ATA Portal.

Esta tela existe para:

- servir como ponto de entrada administrativa
- resumir o estado operacional da equipe
- destacar filas, gargalos e pendÃªncias
- encaminhar rapidamente para mÃ³dulos crÃ­ticos

---

## Rota principal

- `/admin`

---

## Roles atendidas

- `admin`

---

## Papel da tela

A tela `/admin` funciona como dashboard administrativo principal.

Ela nÃ£o substitui:

- approval
- pool
- payments
- performance
- users

Ela concentra visÃ£o e navegaÃ§Ã£o administrativa.

---

# 1. Perguntas que esta tela deve responder

- quantas orders estÃ£o aguardando revisÃ£o
- quantos follow-ups estÃ£o abertos
- hÃ¡ rejeiÃ§Ãµes aguardando tratamento
- existem usuÃ¡rios pendentes
- houve importaÃ§Ãµes com erro
- existe lote aberto ou pendÃªncia financeira

---

# 2. Estrutura recomendada

## Bloco 1. Header

- tÃ­tulo: `Admin`
- descriÃ§Ã£o curta
- perÃ­odo atual ou contexto de operaÃ§Ã£o

## Bloco 2. MÃ©tricas principais

- aguardando revisÃ£o
- follow-ups abertos
- aprovadas hoje
- usuÃ¡rios pending
- imports com erro
- lotes abertos

## Bloco 3. Filas operacionais

- fila de approval
- follow-ups
- rejeitadas aguardando retorno ao pool
- conflitos ou duplicidades, quando existirem

## Bloco 4. OperaÃ§Ã£o recente

- imports recentes
- submits recentes
- atividade do time

## Bloco 5. Atalhos principais

- AprovaÃ§Ãµes
- Orders
- Pool
- Importar Pool
- Payments
- Performance
- UsuÃ¡rios, se o admin tiver essa visÃ£o

---

# 3. Widgets recomendados

## ObrigatÃ³rios na primeira versÃ£o

- cards de mÃ©tricas
- lista curta de approval
- lista curta de follow-up
- bloco de imports recentes
- atalhos rÃ¡pidos

## Bons para depois

- tendÃªncia semanal
- approval rate
- follow-up rate
- assistant com maior fila
- volume por dia

---

# 4. RelaÃ§Ã£o com o trabalho do admin

O admin Ã© o centro do fluxo operacional e financeiro intermediÃ¡rio.

### Portanto esta tela deve privilegiar:

- revisÃ£o
- organizaÃ§Ã£o da fila
- acompanhamento da equipe
- monitoramento de entradas no sistema
- acesso rÃ¡pido Ã s decisÃµes

---

# 5. AÃ§Ãµes rÃ¡pidas esperadas

- abrir `/approval`
- abrir `/orders`
- abrir `/admin/pool`
- abrir `/admin/pool/import`
- abrir `/payments`
- abrir `/performance`

---

# 6. O que nÃ£o deve dominar a tela

- configuraÃ§Ãµes estruturais profundas
- ediÃ§Ã£o de catÃ¡logo como foco principal
- visual â€œcorporativoâ€ sem utilidade real
- excesso de grÃ¡fico sem aÃ§Ã£o clara

---

# 7. UX importante

- prioridade operacional deve aparecer primeiro
- o admin deve saber onde agir sem caÃ§ar informaÃ§Ã£o
- cards e filas devem usar linguagem consistente com o sistema
- erros de mÃ³dulo precisam ser localizados, nÃ£o derrubar a tela inteira

---

# 8. Estados da tela

## Loading

- skeleton nos cards
- skeleton nas listas

## Empty

Mensagens possÃ­veis:

- nenhuma order aguardando revisÃ£o
- nenhum follow-up aberto
- nenhuma pendÃªncia hoje

## Error

- erro localizado por widget
- retry individual quando fizer sentido

---

# 9. Primeira versÃ£o mÃ­nima recomendada

- 4 a 6 mÃ©tricas principais
- fila de aprovaÃ§Ã£o
- fila de follow-up
- imports recentes
- atalhos para mÃ³dulos administrativos

---

# 10. EvoluÃ§Ã£o futura possÃ­vel

- comparativo por assistant
- comparativo por perÃ­odo
- alertas de SLA
- health operacional do time
- resumo financeiro mais rico

---

# Objetivo final

A tela `/admin` deve fazer o admin enxergar a operaÃ§Ã£o como um sistema vivo:

- o que entrou
- o que estÃ¡ travado
- o que precisa de decisÃ£o
- o que deve ser feito agora

Sem virar um festival de card sem consequÃªncia.

