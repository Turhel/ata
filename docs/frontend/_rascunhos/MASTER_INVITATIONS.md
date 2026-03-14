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
# Master Invitations

## Objetivo

Definir a tela de gestÃ£o de novos usuÃ¡rios e aprovaÃ§Ã£o estrutural do ATA Portal.

Este mÃ³dulo existe para:

- aprovar usuÃ¡rios pendentes
- bloquear ou reativar contas
- atribuir ou revisar roles
- dar controle estrutural ao master
- permitir acompanhamento do estado de entrada no sistema

---

## Rota principal

- `/master/invitations`

---

## Roles atendidas

- `master`
- `admin` parcialmente, se a polÃ­tica permitir parte dessas aÃ§Ãµes em outra tela

---

## Papel da tela

Esta Ã© a tela estrutural de entrada e controle de usuÃ¡rios.

Ela nÃ£o Ã© o mesmo que `/users` geral.
Aqui o foco Ã©:

- pending
- aprovaÃ§Ã£o
- ativaÃ§Ã£o/bloqueio
- role
- governanÃ§a de acesso

---

# 1. Estrutura recomendada

## Bloco 1. Header

- tÃ­tulo: `UsuÃ¡rios e AprovaÃ§Ãµes`
- descriÃ§Ã£o curta

## Bloco 2. MÃ©tricas

- pending
- active
- blocked
- inactive

## Bloco 3. Filtros

- status
- role
- busca por nome/email

## Bloco 4. Lista de usuÃ¡rios

- nome
- email
- status
- role ativa
- auth linked
- datas relevantes
- aÃ§Ãµes

---

# 2. AÃ§Ãµes esperadas

## Aprovar usuÃ¡rio

- pending -> active
- exige role ativa definida

## Bloquear usuÃ¡rio

- active -> blocked

## Reativar usuÃ¡rio

- blocked/inactive -> active

## Alterar role

- conforme polÃ­tica
- com especial cuidado para `master`

---

# 3. Regras importantes

- nÃ£o existe usuÃ¡rio ativo sem role operacional definida
- `admin` nÃ£o deve promover outro usuÃ¡rio a `master`, salvo polÃ­tica futura formal
- histÃ³rico de estado precisa ser preservado minimamente
- pending nÃ£o opera
- blocked nÃ£o opera

---

# 4. UX importante

- status precisa ser imediatamente legÃ­vel
- aÃ§Ãµes precisam refletir o estado atual
- mudanÃ§a estrutural deve parecer deliberada
- nÃ£o misturar aÃ§Ã£o simples com aÃ§Ã£o sensÃ­vel sem clareza

---

# 5. Estados da tela

## Loading

- skeleton de mÃ©tricas
- skeleton de lista

## Empty

- nenhum usuÃ¡rio pendente
- nenhum resultado no filtro

## Error

- erro de carregamento
- erro de mutaÃ§Ã£o
- retry claro

---

# 6. Primeira versÃ£o mÃ­nima recomendada

- lista de usuÃ¡rios
- filtro por status
- aprovar
- bloquear
- reativar
- mostrar role atual

---

# 7. EvoluÃ§Ã£o futura possÃ­vel

- histÃ³rico de mudanÃ§as de role
- filtros por data
- vÃ­nculo com onboarding
- convites reais, se o sistema ganhar esse fluxo

---

# Objetivo final

A tela de `Master Invitations` deve dar controle claro e seguro sobre quem entra, opera e mantÃ©m acesso no sistema.

