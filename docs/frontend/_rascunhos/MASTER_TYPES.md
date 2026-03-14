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
# Master Types

## Objetivo

Definir a tela de gestÃ£o de tipos de trabalho (`work_types`) do ATA Portal.

Este mÃ³dulo existe para:

- cadastrar tipos de trabalho
- manter catÃ¡logo coerente
- evitar caos de `OTYPE` solto
- apoiar operaÃ§Ã£o e financeiro

---

## Rota principal

- `/master/types`

---

## Roles atendidas

- `master`
- `admin` com permissÃ£o parcial, se a polÃ­tica permitir no futuro

---

## Papel da tela

Esta Ã© a tela de catÃ¡logo dos tipos de trabalho.

Ela serve de base para:

- classificaÃ§Ã£o operacional
- validaÃ§Ã£o de orders
- cÃ¡lculo financeiro

---

# 1. Estrutura recomendada

## Bloco 1. Header

- tÃ­tulo: `Tipos de Trabalho`
- descriÃ§Ã£o curta
- aÃ§Ã£o principal: novo tipo

## Bloco 2. Filtros

- ativo/inativo
- busca por cÃ³digo
- busca por nome

## Bloco 3. Lista

- code
- name
- descriÃ§Ã£o curta
- ativo/inativo
- pricing configurado ou nÃ£o
- aÃ§Ãµes

---

# 2. AÃ§Ãµes esperadas

## Criar tipo

- definir code
- nome opcional ou amigÃ¡vel
- descriÃ§Ã£o opcional
- ativo/inativo

## Editar tipo

- ajustar nome e descriÃ§Ã£o
- ativar/inativar

## Identificar tipos nÃ£o catalogados

No futuro, especialmente a partir das importaÃ§Ãµes do pool.

---

# 3. RelaÃ§Ã£o com pool import

O pool pode trazer `OTYPE` ainda nÃ£o catalogado.

### ConsequÃªncia

Esta tela deve futuramente permitir:

- detectar cÃ³digos novos
- cadastrar rapidamente
- separar pendÃªncia estrutural de erro operacional

---

# 4. Regras importantes

- `code` precisa ser Ãºnico
- catÃ¡logo deve permanecer limpo
- nÃ£o duplicar tipo por descuido de escrita
- nome amigÃ¡vel nÃ£o substitui o code tÃ©cnico

---

# 5. UX importante

- cÃ³digo precisa ser o protagonista
- nome Ã© apoio
- pricing pendente deve ser visÃ­vel
- tipos inativos nÃ£o devem sumir completamente da histÃ³ria

---

# 6. Estados da tela

## Loading

- skeleton de lista

## Empty

- nenhum tipo cadastrado
- nenhum resultado com esse filtro

## Error

- erro ao carregar
- erro ao salvar
- retry claro

---

# 7. Primeira versÃ£o mÃ­nima recomendada

- listar tipos
- criar tipo
- editar tipo
- ativar/inativar
- busca por code

---

# Objetivo final

A tela de tipos deve manter o catÃ¡logo operacional coerente e pronto para sustentar tanto workflow quanto pricing.

