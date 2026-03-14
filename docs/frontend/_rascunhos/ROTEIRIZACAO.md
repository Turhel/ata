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
# RoteirizaÃ§Ã£o

## Objetivo

Definir a futura tela de roteirizaÃ§Ã£o do ATA Portal.

Este mÃ³dulo existe para:

- apoiar criaÃ§Ã£o e organizaÃ§Ã£o de rotas para inspetores
- agrupar pontos de atendimento
- otimizar sequÃªncia de visitas
- reduzir trabalho manual de planejamento

---

## Rota principal sugerida

- `/route`

---

## Rotas relacionadas futuras

- `/route/:id`
- `/route/history`

---

## Roles atendidas

- `admin`
- `master`
- `inspector` com leitura limitada, se o produto evoluir nessa direÃ§Ã£o

---

## ObservaÃ§Ã£o importante

Este mÃ³dulo Ã© futuro e nÃ£o deve entrar cedo demais no front se o nÃºcleo operacional ainda estiver incompleto.

Primeiro:

- users
- orders
- approval
- pool
- scopes
- payments

Depois:

- roteirizaÃ§Ã£o

Porque querer resolver logÃ­stica sofisticada com base operacional ainda incompleta Ã© um jeito muito criativo de fabricar dor de cabeÃ§a.

---

# 1. Papel do mÃ³dulo

A tela de roteirizaÃ§Ã£o deve ajudar a responder:

- quais pontos precisam ser visitados
- em que ordem faz mais sentido visitar
- qual inspetor recebe qual rota
- como visualizar o conjunto do dia

---

# 2. Estrutura recomendada

## Bloco 1. Header

- tÃ­tulo: `RoteirizaÃ§Ã£o`
- descriÃ§Ã£o curta
- aÃ§Ã£o principal: nova rota

## Bloco 2. Filtros

- data
- inspetor
- cidade/regiÃ£o
- status da ordem

## Bloco 3. Lista de pontos/orders elegÃ­veis

- cÃ³digo
- endereÃ§o
- city/state
- inspector account
- prioridade, quando existir
- janela/data Ãºtil

## Bloco 4. Mapa e sequÃªncia

- visualizaÃ§Ã£o geogrÃ¡fica
- ordem planejada de visita
- resumo de distÃ¢ncia, quando houver

---

# 3. AÃ§Ãµes esperadas

## Criar rota

Selecionar items e montar sequÃªncia

## Reordenar

Ajustar manualmente a ordem da rota

## Atribuir inspetor

Vincular rota ou conjunto de points ao inspetor

## Exportar/compartilhar

No futuro, gerar visÃ£o simples para execuÃ§Ã£o

---

# 4. Regras importantes

- rota nÃ£o deve reescrever a histÃ³ria da order
- atribuiÃ§Ã£o precisa respeitar contexto operacional
- otimizaÃ§Ã£o automÃ¡tica nunca deve esconder a decisÃ£o administrativa
- mapa Ã© apoio, nÃ£o autoridade absoluta do negÃ³cio

---

# 5. UX importante

- mapa precisa ajudar, nÃ£o dominar a tela atoa
- lista e mapa devem conversar entre si
- reordenaÃ§Ã£o deve ser clara
- nÃ£o lotar a primeira versÃ£o com recursos de logÃ­stica avanÃ§ada que ninguÃ©m consegue manter

---

# 6. Primeira versÃ£o mÃ­nima recomendada

## Quando esse mÃ³dulo for implementado

- lista de pontos
- agrupamento bÃ¡sico
- ordem manual
- associaÃ§Ã£o a inspetor
- visual simples de rota

---

# 7. EvoluÃ§Ã£o futura possÃ­vel

- otimizaÃ§Ã£o automÃ¡tica
- cÃ¡lculo de distÃ¢ncia
- janela de atendimento
- integraÃ§Ã£o com mapa externo
- histÃ³rico de rotas
- visual para inspetor em mobile

---

# Objetivo final

A tela de roteirizaÃ§Ã£o deve organizar deslocamento e execuÃ§Ã£o de forma prÃ¡tica, sem virar um projeto paralelo maior que o prÃ³prio sistema.

