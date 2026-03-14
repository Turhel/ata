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
# Scopes

## Objetivo

Definir as telas e o fluxo do mÃ³dulo de escopos do ATA Portal.

Este mÃ³dulo existe para:

- permitir que o assistant gere e salve escopos
- permitir que o inspector consulte escopos com rapidez
- padronizar checklist de ambientes e itens
- preservar histÃ³rico e organizaÃ§Ã£o dos escopos vinculados Ã s orders

---

## Rotas principais

- `/scopes`
- `/scopes/inspector`

---

## Rotas relacionadas

- `/orders/:id`
- futura rota de detalhe de escopo, se necessÃ¡rio

---

## Roles atendidas

- `assistant`
- `inspector`
- `admin` e `master` apenas com leitura administrativa, se necessÃ¡rio

---

## Papel do mÃ³dulo

O mÃ³dulo de escopos nÃ£o substitui orders.
Ele complementa a execuÃ§Ã£o operacional.

### Assistant

- cria
- edita
- salva
- organiza

### Inspector

- consulta
- acompanha checklist localmente
- usa como apoio operacional

---

# 1. Tela `/scopes`

## Objetivo

Permitir que o assistant gere e salve um escopo associado a uma order.

---

## Fluxo principal esperado

1. assistant informa ou busca a order
2. sistema tenta carregar dados jÃ¡ existentes
3. assistant organiza categorias e itens
4. assistant salva o escopo
5. escopo fica disponÃ­vel para consulta futura

---

## Estrutura recomendada

### Bloco 1. Header

- tÃ­tulo: `Scopes`
- descriÃ§Ã£o curta
- aÃ§Ã£o principal: salvar escopo
- aÃ§Ã£o secundÃ¡ria: limpar/reiniciar, se fizer sentido

### Bloco 2. Contexto da order

- external order code
- endereÃ§o
- loss reason, se existir
- route point, se existir
- work type, quando Ãºtil

### Bloco 3. Estrutura do escopo

- categorias
- itens
- subitens
- ordenaÃ§Ã£o

### Bloco 4. PrÃ©via

- visualizaÃ§Ã£o textual do escopo
- checklist visual

---

## Campos principais

### Do escopo

- order vinculada
- external id
- kind
- loss reason
- route point
- visibility
- created by
- timestamps

### Dos itens

- area
- label
- notes
- required
- sort order

---

# 2. Funcionalidades da tela `/scopes`

## ObrigatÃ³rias na primeira versÃ£o

- buscar order por cÃ³digo
- carregar dados bÃ¡sicos da order
- criar categorias
- criar itens
- criar subitens
- remover linha vazia
- salvar escopo
- carregar escopo jÃ¡ existente, se houver

## DesejÃ¡veis depois

- duplicar categoria
- duplicar item
- reorder por drag and drop
- templates por tipo de order
- comparaÃ§Ã£o entre versÃµes

---

# 3. Regras de UX importantes

## Assistant precisa sentir que:

- estÃ¡ montando um checklist operacional
- nÃ£o estÃ¡ preenchendo um formulÃ¡rio burocrÃ¡tico infinito

### ConsequÃªncia

- ediÃ§Ã£o precisa ser Ã¡gil
- estrutura precisa ser clara
- subitem precisa ser fÃ¡cil de representar
- prÃ©via deve refletir bem o resultado final

---

## Regras especÃ­ficas

- linha vazia nÃ£o deve poluir a visualizaÃ§Ã£o
- subitem deve ter leitura claramente hierÃ¡rquica
- categorias precisam ser distinguÃ­veis visualmente
- salvar precisa dar feedback claro
- erro no salvamento nÃ£o pode apagar o que o usuÃ¡rio montou

---

# 4. Tela `/scopes/inspector`

## Objetivo

Permitir que o inspector consulte rapidamente um escopo pronto.

---

## Papel desta tela

Essa tela deve ser rÃ¡pida, simples e muito amigÃ¡vel para uso em campo.

O inspector nÃ£o estÃ¡ ali para editar estrutura.
Ele estÃ¡ ali para:

- encontrar o escopo certo
- visualizar o que precisa fazer
- marcar checklist localmente

---

## Estrutura recomendada

### Bloco 1. Header

- tÃ­tulo: `Buscar Escopo`
- descriÃ§Ã£o curta

### Bloco 2. Busca principal

- campo para external order code
- botÃ£o buscar

### Bloco 3. Resultado

- cabeÃ§alho do escopo
- categorias
- itens
- checkboxes locais

---

## Funcionalidades principais

- buscar por cÃ³digo externo
- visualizar checklist
- marcar boxes localmente
- manter marcaÃ§Ã£o local enquanto a sessÃ£o de uso durar

---

## Regra importante

A marcaÃ§Ã£o do inspector nÃ£o deve persistir no banco nesta fase.

Ela serve como apoio visual local.

---

# 5. RelaÃ§Ã£o com orders

Todo escopo relevante deve estar ligado a uma order.

### ConsequÃªncia

- a order Ã© a referÃªncia operacional principal
- o escopo Ã© uma estrutura complementar
- a navegaÃ§Ã£o entre order e escopo deve ser simples

---

# 6. Estados da tela

## `/scopes`

### Loading

- skeleton ou placeholder leve

### Empty

- sem escopo carregado ainda
- ordem nÃ£o localizada
- nenhum item criado ainda

### Error

- falha ao buscar ordem
- falha ao salvar
- falha ao carregar escopo existente

## `/scopes/inspector`

### Empty

- nenhum escopo encontrado para esse cÃ³digo

### Error

- erro de carregamento
- retry claro

---

# 7. AÃ§Ãµes principais

## Assistant

- buscar order
- criar/editar escopo
- salvar

## Inspector

- buscar escopo
- marcar checklist local

---

# 8. RelaÃ§Ã£o com outras telas

## Orders

Pode abrir escopo associado

## Dashboard

Atalho para scopes

## Manuals

Pode servir de apoio ao uso do inspector

---

# 9. Primeira versÃ£o mÃ­nima recomendada

## Assistant

- busca da order
- ediÃ§Ã£o simples de categorias/itens
- salvar escopo
- carregar existente

## Inspector

- busca por cÃ³digo
- visualizaÃ§Ã£o limpa
- checklist local

---

# 10. Objetivo final

O mÃ³dulo de scopes deve transformar um processo antes manual e confuso em algo:

- padronizado
- fÃ¡cil de consultar
- Ãºtil para assistant
- Ãºtil para inspector
- seguro e rastreÃ¡vel

