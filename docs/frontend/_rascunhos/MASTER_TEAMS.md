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
# Master Teams

## Objetivo

Definir a tela de organizaÃ§Ã£o de times do ATA Portal.

Este mÃ³dulo existe para:

- estruturar a relaÃ§Ã£o entre admins e assistants
- visualizar distribuiÃ§Ã£o de equipe
- criar, encerrar ou ajustar vÃ­nculos de time
- reduzir desorganizaÃ§Ã£o operacional

---

## Rota principal

- `/master/teams`

---

## Roles atendidas

- `master`
- `admin`, se a polÃ­tica permitir visÃ£o parcial ou ediÃ§Ã£o limitada no futuro

---

## Papel da tela

Esta tela Ã© estrutural.

Ela nÃ£o Ã© parte do fluxo diÃ¡rio de orders.
Ela existe para organizar quem responde a quem.

---

# 1. Estrutura recomendada

## Bloco 1. Header

- tÃ­tulo: `Times`
- descriÃ§Ã£o curta
- aÃ§Ã£o principal: criar ou ajustar vÃ­nculo

## Bloco 2. VisÃ£o de distribuiÃ§Ã£o

- admins
- assistants sem vÃ­nculo
- assistants por admin
- times incompletos

## Bloco 3. Ãrea de organizaÃ§Ã£o

Modelo possÃ­vel:

- lista por admin
- cartÃµes de assistants vinculados
- ou experiÃªncia de drag and drop, se isso realmente ajudar

---

# 2. AÃ§Ãµes esperadas

## Criar vÃ­nculo

- associar assistant a admin

## Encerrar vÃ­nculo

- marcar encerramento
- preservar histÃ³rico

## Reatribuir assistant

- remover vÃ­nculo ativo anterior
- criar novo vÃ­nculo ativo

---

# 3. Regras importantes

- um assistant deve ter um admin responsÃ¡vel ativo por vez, salvo mudanÃ§a futura formal
- histÃ³rico precisa ser preservado
- nÃ£o sobrescrever passado como se nunca tivesse existido

---

# 4. UX importante

- distribuiÃ§Ã£o precisa ser visÃ­vel de forma clara
- nÃ£o esconder assistant Ã³rfÃ£o
- nÃ£o esconder time desequilibrado
- mudanÃ§a estrutural precisa parecer sÃ©ria, nÃ£o improvisada

---

# 5. Layout recomendado

## Desktop

- colunas por admin
  ou
- lista de admins com painel lateral de assistants

## Mobile

- nÃ£o Ã© prioridade alta
- leitura simples jÃ¡ basta

---

# 6. Estados da tela

## Loading

- skeleton de listas

## Empty

- nenhum vÃ­nculo ainda
- nenhum admin
- nenhum assistant disponÃ­vel

## Error

- erro de carregamento
- erro ao salvar mudanÃ§a
- retry claro

---

# 7. Primeira versÃ£o mÃ­nima recomendada

- listar vÃ­nculos ativos
- mostrar assistants sem time
- criar vÃ­nculo
- encerrar vÃ­nculo
- reatribuir assistant

---

# Objetivo final

A tela de times deve permitir que a estrutura operacional fique visÃ­vel, ajustÃ¡vel e historicamente coerente.

