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
# Approval Duplicate

## Objetivo

Definir a tela de anÃ¡lise de duplicidades e conflitos de ordens no ATA Portal.

Este mÃ³dulo existe para:

- centralizar casos suspeitos de duplicidade
- permitir decisÃ£o administrativa controlada
- evitar que conflito de dados contamine o fluxo normal
- registrar o motivo da decisÃ£o tomada

---

## Rota principal

- `/approval/duplicate`

---

## Roles atendidas

- `admin`
- `master`

---

## Papel da tela

Esta nÃ£o Ã© uma tela de revisÃ£o comum.
Ã‰ uma tela de exceÃ§Ã£o administrativa.

Ela deve receber apenas casos que realmente exigem atenÃ§Ã£o especial.

---

# 1. Quando uma order vem para esta tela

## Exemplos

- possÃ­vel duplicidade por cÃ³digo externo
- conflito entre importaÃ§Ãµes
- dois registros que parecem representar o mesmo trabalho
- divergÃªncia relevante entre dados operacionais e dados de origem

---

# 2. Objetivo operacional

Responder:

- hÃ¡ duplicidade real ou nÃ£o
- qual registro prevalece
- se a order deve seguir fluxo
- se deve ser rejeitada
- se deve ser devolvida ao pool
- qual foi a justificativa da decisÃ£o

---

# 3. Estrutura recomendada

## Bloco 1. Header

- tÃ­tulo: `Duplicidades`
- descriÃ§Ã£o curta
- contador de casos pendentes

## Bloco 2. Lista de casos

Cada caso deve mostrar:

- external order code
- status atual
- source status
- motivo do conflito, se identificado
- data da detecÃ§Ã£o
- prioridade, quando existir

## Bloco 3. Painel comparativo

Ao selecionar um caso:

- mostrar lado a lado os dados conflitantes
- destacar diferenÃ§as relevantes
- exibir histÃ³rico/import batch relacionado

## Bloco 4. Painel de decisÃ£o

- manter registro A
- manter registro B
- rejeitar
- devolver ao pool
- marcar como resolvido sem aÃ§Ã£o estrutural
- motivo obrigatÃ³rio

---

# 4. Regras importantes

- decisÃ£o de duplicidade deve ser explÃ­cita
- motivo Ã© obrigatÃ³rio
- precisa gerar histÃ³rico
- a UI nÃ£o decide sozinha qual registro vale
- nÃ£o misturar esta tela com approval normal

---

# 5. Dados relevantes no comparativo

## Mostrar

- external order code
- source status
- status interno
- residente
- endereÃ§o
- city/state
- assistant vinculado
- work type
- import batch
- timestamps principais

## Destacar

- campos divergentes
- origem do conflito
- impacto operacional

---

# 6. UX importante

- conflito precisa parecer conflito
- diferenÃ§as precisam ser visualmente legÃ­veis
- decisÃ£o precisa parecer sÃ©ria e auditÃ¡vel
- motivo obrigatÃ³rio deve ser muito claro
- evitar excesso de informaÃ§Ã£o irrelevante

---

# 7. Estados da tela

## Loading

- skeleton da lista
- skeleton do comparativo

## Empty

- nenhum caso de duplicidade pendente

## Error

- erro ao carregar
- erro ao decidir
- retry claro

---

# 8. Primeira versÃ£o mÃ­nima recomendada

- lista simples de casos suspeitos
- detalhe comparativo bÃ¡sico
- aÃ§Ã£o administrativa com motivo obrigatÃ³rio
- feedback claro apÃ³s decisÃ£o

---

# 9. EvoluÃ§Ã£o futura possÃ­vel

- agrupamento automÃ¡tico por similaridade
- score de conflito
- sugestÃµes de resoluÃ§Ã£o
- trilha histÃ³rica especÃ­fica de duplicidade

---

# Objetivo final

A tela de duplicidade deve impedir que conflito estrutural entre no fluxo diÃ¡rio sem controle.

Ela existe para conter bagunÃ§a, nÃ£o para espalhÃ¡-la.

