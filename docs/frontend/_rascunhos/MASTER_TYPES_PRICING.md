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
# Master Types Pricing

## Objetivo

Definir a tela de pricing por tipo de trabalho do ATA Portal.

Este mÃ³dulo existe para:

- configurar valor padrÃ£o por tipo de trabalho
- separar pagamento de assistant e inspector
- sustentar a formaÃ§Ã£o de lotes financeiros
- reduzir improviso no cÃ¡lculo

---

## Rota principal

- `/master/types/pricing`

---

## Roles atendidas

- `master`
- `admin` parcialmente, se houver polÃ­tica formal para isso no futuro

---

## Papel da tela

Esta Ã© a tela de regra financeira por `work_type`.

Ela nÃ£o Ã© lote.
Ela nÃ£o Ã© pagamento pessoal.
Ela Ã© a base de valor padrÃ£o.

---

# 1. Estrutura recomendada

## Bloco 1. Header

- tÃ­tulo: `Pricing por Tipo`
- descriÃ§Ã£o curta

## Bloco 2. Filtros

- ativo/inativo
- com pricing
- sem pricing
- busca por code

## Bloco 3. Lista principal

- work type code
- name
- amount assistant
- amount inspector
- status do tipo
- aÃ§Ãµes

---

# 2. AÃ§Ãµes esperadas

## Configurar pricing

- valor padrÃ£o assistant
- valor padrÃ£o inspector

## Editar pricing

- atualizar valores
- manter precisÃ£o adequada

## Identificar pendÃªncias

- tipos ativos sem valor
- pricing incompleto

---

# 3. Regras importantes

- pricing pertence ao contexto financeiro
- amount assistant e amount inspector sÃ£o separados
- tipo sem pricing pode travar ou dificultar entrada em lote
- mudanÃ§as futuras nÃ£o devem reescrever snapshot de lotes jÃ¡ gerados

---

# 4. RelaÃ§Ã£o com other modules

## Types

A base estrutural do tipo vem de `/master/types`

## Orders

`work_type_id` influencia elegibilidade e cÃ¡lculo

## Payments

na hora de gerar lote, o snapshot congela os valores

---

# 5. UX importante

- tipos sem pricing precisam ficar visÃ­veis
- valores devem ter leitura clara
- ediÃ§Ã£o deve ser direta e segura
- mudanÃ§a de valor nÃ£o pode parecer aÃ§Ã£o banal sem impacto

---

# 6. Formato de tela recomendado

## OpÃ§Ã£o A

Tabela editÃ¡vel com aÃ§Ã£o por linha

## OpÃ§Ã£o B

Tabela + painel lateral de ediÃ§Ã£o

### PreferÃªncia inicial

Tabela com aÃ§Ã£o por linha costuma ser suficiente na primeira versÃ£o.

---

# 7. Estados da tela

## Loading

- skeleton de tabela

## Empty

- nenhum tipo encontrado
- nenhum tipo pendente

## Error

- erro ao carregar
- erro ao salvar
- retry claro

---

# 8. Primeira versÃ£o mÃ­nima recomendada

- listar tipos com valores
- indicar tipos sem pricing
- editar amount assistant
- editar amount inspector

---

# 9. EvoluÃ§Ã£o futura possÃ­vel

- histÃ³rico de alteraÃ§Ã£o de pricing
- faixa de vigÃªncia
- override por cliente
- override por categoria ou contexto especial

---

# Objetivo final

A tela de pricing deve deixar claro:

- quais tipos tÃªm valor
- quais nÃ£o tÃªm
- quanto assistant recebe
- quanto inspector recebe

Sem cÃ¡lculo escondido.
Sem regra espalhada.
Sem â€œa gente lembra de cabeÃ§aâ€.

