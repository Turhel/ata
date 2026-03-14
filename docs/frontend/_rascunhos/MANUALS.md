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
# Manuals

## Objetivo

Definir a tela de manuais do ATA Portal.

Este mÃ³dulo existe para:

- centralizar materiais de apoio
- facilitar acesso rÃ¡pido a documentos operacionais
- reduzir dependÃªncia de arquivos soltos em pastas e chats
- manter referÃªncia Ãºnica para procedimentos importantes

---

## Rota principal

- `/manuals`

---

## Roles atendidas

- `assistant`
- `inspector`
- `admin`
- `master`

---

## Papel da tela

A tela de manuais Ã© um centro de consulta.

Ela nÃ£o Ã© parte do workflow principal, mas dÃ¡ suporte a ele.

### Deve servir para:

- consulta rÃ¡pida
- download de material
- padronizaÃ§Ã£o operacional
- onboarding leve

---

# 1. Estrutura recomendada

## Bloco 1. Header

- tÃ­tulo: `Manuais`
- descriÃ§Ã£o curta
- busca por tÃ­tulo ou palavra-chave

## Bloco 2. Filtros

- categoria
- role
- tipo de material
- mais recentes

## Bloco 3. Lista de materiais

- tÃ­tulo
- categoria
- pÃºblico-alvo
- descriÃ§Ã£o curta
- data de atualizaÃ§Ã£o
- aÃ§Ã£o de abrir ou baixar

---

# 2. Categorias recomendadas

## OperaÃ§Ã£o

- fluxo de orders
- revisÃ£o
- follow-up
- rejeiÃ§Ã£o
- retorno ao pool

## Escopos

- como gerar escopos
- como consultar escopos
- boas prÃ¡ticas

## Financeiro

- leitura de pagamentos
- regras de lote
- interpretaÃ§Ã£o de status

## Sistema

- login
- roles
- navegaÃ§Ã£o
- configuraÃ§Ãµes

## Treinamento

- onboarding
- passo a passo
- checklists de entrada

---

# 3. Comportamento por role

## Assistant

- ver manuais operacionais
- ver instruÃ§Ãµes de escopos
- ver materiais prÃ³prios de uso diÃ¡rio

## Inspector

- ver materiais de escopo
- ver guias rÃ¡pidos
- ver instruÃ§Ãµes de campo

## Admin

- ver materiais operacionais e administrativos
- ver polÃ­ticas internas pertinentes

## Master

- ver todos
- inclusive materiais estruturais

---

# 4. Formatos de material

## Tipos esperados

- PDF
- documento interno
- checklist simples
- guia curto
- arquivo de apoio

---

# 5. UX importante

- busca precisa ser rÃ¡pida
- lista deve ser limpa
- tÃ­tulo precisa dizer claramente o que o manual resolve
- descriÃ§Ã£o curta deve ajudar a decidir se vale abrir

---

# 6. Estados da tela

## Loading

- skeleton simples

## Empty

- nenhum manual encontrado
- nenhum resultado para esse filtro

## Error

- erro ao carregar
- retry claro

---

# 7. Primeira versÃ£o mÃ­nima recomendada

- lista simples de materiais
- filtro por categoria
- busca textual
- botÃ£o de abrir/baixar

---

# Objetivo final

A tela de manuais deve funcionar como uma biblioteca operacional simples, Ãºtil e fÃ¡cil de consultar.

