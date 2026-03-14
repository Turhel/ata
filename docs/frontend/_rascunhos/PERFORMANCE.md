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
# Performance

## Objetivo

Definir as telas de performance operacional e estrutural do ATA Portal.

Este mÃ³dulo existe para:

- acompanhar produtividade
- identificar gargalos
- comparar perÃ­odos
- avaliar equipe e operaÃ§Ã£o
- dar suporte a decisÃµes administrativas e estruturais

---

## Rotas principais

- `/performance`
- `/performance/master`

---

## Roles atendidas

- `admin`
- `master`

---

## Papel do mÃ³dulo

Performance nÃ£o Ã© tela para vaidade nem para grÃ¡fico aleatÃ³rio.

Ela existe para responder perguntas operacionais reais.

---

# 1. Tela `/performance`

## Objetivo

Dar ao admin visÃ£o da prÃ³pria equipe e da operaÃ§Ã£o sob sua responsabilidade.

---

## Perguntas principais

- quantas orders foram enviadas
- quantas foram aprovadas
- quantas voltaram em follow-up
- quantas foram rejeitadas
- qual assistant estÃ¡ com maior volume
- onde estÃ¡ o gargalo do time

---

## Estrutura recomendada

### Bloco 1. Header

- tÃ­tulo: `Performance`
- descriÃ§Ã£o curta
- filtro de perÃ­odo

### Bloco 2. MÃ©tricas principais

- submits
- approvals
- follow-ups
- rejects
- taxa de aprovaÃ§Ã£o
- taxa de retrabalho, quando fizer sentido

### Bloco 3. Breakdown por assistant

- assistant
- volume
- aprovadas
- follow-up
- rejeiÃ§Ãµes

### Bloco 4. TendÃªncia temporal

- dia
- semana
- mÃªs

---

# 2. Tela `/performance/master`

## Objetivo

Dar ao master visÃ£o mais ampla da estrutura administrativa.

---

## Perguntas principais

- como cada admin e equipe estÃ¡ performando
- qual time estÃ¡ com maior volume
- onde estÃ¡ o gargalo organizacional
- qual admin estÃ¡ com maior fila
- como a operaÃ§Ã£o global estÃ¡ evoluindo

---

## Estrutura recomendada

### Bloco 1. MÃ©tricas globais

- volume total
- approvals globais
- follow-ups globais
- rejects globais

### Bloco 2. Breakdown por admin

- admin
- volume do time
- aprovaÃ§Ãµes
- follow-ups
- rejeiÃ§Ãµes
- taxa de aprovaÃ§Ã£o

### Bloco 3. TendÃªncia global

- por dia
- por semana
- por mÃªs

### Bloco 4. Alertas estruturais

- time desequilibrado
- volume alto com baixa aprovaÃ§Ã£o
- equipe com follow-up excessivo

---

# 3. Filtros recomendados

## ObrigatÃ³rios

- perÃ­odo
- team/admin, quando aplicÃ¡vel

## Depois

- assistant
- work type
- status final
- batch/import window

---

# 4. Tipos de visualizaÃ§Ã£o

## Metric cards

Para nÃºmeros principais

## Tabela resumida

Para ranking por assistant ou admin

## GrÃ¡fico simples

Para tendÃªncia temporal

## Breakdown por status

Para entender distribuiÃ§Ã£o

---

# 5. Regras de UX importantes

- comeÃ§ar pelos nÃºmeros que importam
- grÃ¡fico deve responder pergunta real
- ranking deve ser legÃ­vel
- nÃ£o transformar performance em dashboard ornamental

---

# 6. Indicadores recomendados

## Para admin

- submits do perÃ­odo
- approvals do perÃ­odo
- follow-ups do perÃ­odo
- rejects do perÃ­odo
- approval rate
- follow-up rate

## Para master

- volume global
- volume por admin
- approval rate por admin
- follow-up rate por admin
- gargalos estruturais

---

# 7. O que evitar

- comparar tudo com tudo
- grÃ¡fico excessivo
- ranking sem contexto
- usar performance para punir visualmente sem leitura Ãºtil
- mostrar dado que o usuÃ¡rio nÃ£o consegue interpretar ou agir

---

# 8. RelaÃ§Ã£o com outras telas

## Dashboard

Pode resumir parte da performance

## Approval

InfluÃªncia direta nos nÃºmeros de revisÃ£o

## Orders

Base operacional dos indicadores

## Payments

Pode se relacionar depois com produtividade e fechamento financeiro

---

# 9. Estados da tela

## Loading

- skeleton de mÃ©tricas
- skeleton de grÃ¡fico
- skeleton de tabela

## Empty

- perÃ­odo sem dados
- filtro sem resultado

## Error

- falha ao carregar
- retry claro

---

# 10. Primeira versÃ£o mÃ­nima recomendada

## `/performance`

- cards principais
- tabela por assistant
- grÃ¡fico simples por perÃ­odo

## `/performance/master`

- cards globais
- tabela por admin
- grÃ¡fico simples global

---

# 11. Objetivo final

O mÃ³dulo de performance deve ajudar admin e master a entender:

- volume
- qualidade
- retrabalho
- gargalos
- evoluÃ§Ã£o

Sem virar painel de TV corporativa que fala muito e ajuda pouco.

