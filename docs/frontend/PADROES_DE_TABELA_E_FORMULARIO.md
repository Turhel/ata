# Padrões de Tabela e Formulário

## Objetivo

Definir padrões de construção para tabelas e formulários do frontend do ATA Portal.

Este documento existe para evitar:

- tabela diferente em cada tela
- formulário com comportamento incoerente
- filtros jogados aleatoriamente
- UX inconsistente entre módulos

---

## Princípio geral

Tabela e formulário são ferramentas centrais do sistema.

Se essas duas bases forem ruins, todo o resto parece desorganizado, mesmo quando funciona.

---

# Parte 1. Tabelas

## Objetivo das tabelas

As tabelas do sistema devem priorizar:

- leitura rápida
- comparação de itens
- ação contextual
- consistência

---

## Estrutura padrão de tabela

### Blocos recomendados

1. cabeçalho da tela
2. barra de busca e filtros
3. resumo opcional
4. tabela
5. paginação futura
6. estado vazio/erro, quando necessário

---

## Colunas

### Regras

- poucas colunas por padrão
- colunas mais úteis primeiro
- dados críticos sempre visíveis
- informação secundária pode ficar em detalhe, tooltip ou expansão

### Ordem sugerida

1. identificação
2. status
3. responsável/contexto
4. data
5. ações

---

## Ações por linha

### Regra

Ações devem ser previsíveis e contextuais.

### Exemplos

- abrir
- editar
- aprovar
- rejeitar
- follow-up

### Não fazer

- 9 ícones sem label e sem hierarquia

---

## Ações em massa

### Regra

Só implementar quando houver caso real claro.

### Não antecipar

Seleção em massa bonita mas inútil é só peso morto.

---

## Busca e filtros

### Busca

Usar quando o usuário localizar por:

- code
- nome
- endereço
- referência

### Filtros

Usar quando houver recorte frequente por:

- status
- data
- role
- batch
- responsável

### Regra

Busca e filtros devem ficar acima da tabela.

---

## Ordenação

### Pode existir

- por data
- por status
- por valor
- por code

### Regra

Não obrigatória no início em toda tabela.
Implementar onde houver utilidade real.

---

## Estado vazio da tabela

### Deve conter

- mensagem simples
- contexto do filtro
- CTA opcional

### Exemplo

“Não há ordens com esse filtro.”

---

## Responsividade

### Desktop

- tabela completa

### Mobile

- preferir card/list item resumido
- evitar tabela espremida e ilegível

---

## Tabelas principais do projeto

### Users

Colunas mínimas:

- nome
- email
- status
- role
- auth link

### Orders

Colunas mínimas:

- external code
- status
- source status
- residente
- cidade/estado
- assistant
- available/deadline
- ação

### Pool batches

Colunas mínimas:

- file name
- status
- total rows
- inserted
- updated
- errors
- data

### Payments

Colunas mínimas:

- referência
- status
- período
- total items
- total amount

### Manuals

Pode ser lista ou tabela leve.

---

# Parte 2. Formulários

## Objetivo dos formulários

Permitir entrada e edição de dados com:

- clareza
- validação previsível
- feedback rápido
- baixo risco de erro

---

## Estrutura padrão de formulário

### Ordem recomendada

1. título e objetivo
2. contexto do item
3. seções de campos
4. validações visíveis
5. ações finais

---

## Campos

### Regras

- label claro
- hint opcional
- erro abaixo do campo
- obrigatório bem visível
- estado disabled claro

---

## Agrupamento

### Usar seções quando

- o formulário for longo
- houver blocos lógicos diferentes

### Exemplos de seções

- dados básicos
- contexto operacional
- endereço
- observações
- ação final

---

## Tipos de ação no rodapé

### Primária

Exemplo:

- salvar
- enviar
- aprovar

### Secundária

Exemplo:

- cancelar
- voltar
- limpar

### Destrutiva

Exemplo:

- rejeitar
- bloquear
- remover

---

## Validação

### Regra geral

Validar no frontend para ajudar UX.
Validar na API para garantir regra.

### Mostrar

- erro por campo
- erro geral quando aplicável
- lista de campos faltantes, se a API devolver

---

## Submit

### Durante envio

- botão com loading
- evitar clique duplo
- não apagar dados do usuário

### Após sucesso

- toast ou feedback inline
- atualizar tela
- navegar se fizer sentido

### Após erro

- manter dados
- mostrar mensagem clara

---

## Formulários importantes do projeto

### Login

Campos:

- email
- senha

### Inserção de order

Campos:

- variam conforme o fluxo definido

### Scope generator

Campos:

- identificação da order
- metadados do escopo
- categorias
- itens

### Follow-up / reject / return-to-pool

Campos:

- motivo obrigatório

### Importação de pool

Campos:

- arquivo ou payload
- observações, se fizer sentido

### Pricing

Campos:

- tipo
- valor assistant
- valor inspector
- status/ativo

---

# Parte 3. Padrões visuais comuns

## Labels

Curtos e diretos.

## Placeholders

Só quando ajudam.
Não substituir label.

## Erros

Sempre próximos do ponto do problema.

## Botões

Primário à direita ou em destaque consistente.

## Seção longa

Usar espaçamento claro entre blocos.

---

# Parte 4. O que evitar

## Tabelas

- colunas demais
- texto longo demais dentro da célula
- ação escondida demais
- filtros espalhados em vários cantos

## Formulários

- campo sem label
- erro só no toast
- submit sem feedback
- apagar tudo após falha
- modal crítico sem contexto

---

# Parte 5. Regras práticas

## 1. Se cabe em card melhor que em tabela, use card

Nem tudo precisa ser tabela.

## 2. Se o usuário compara muitos itens, use tabela

Tabelas servem para comparação rápida.

## 3. Se a ação é crítica, não esconda demais

Aprovar e rejeitar não devem ficar enterrados em submenu ridículo.

## 4. Se o formulário é longo, dividir em seções

Ajuda leitura e reduz erro.

---

# Objetivo final

Tabelas e formulários do sistema devem parecer parte do mesmo produto.

Se cada tela tiver seu próprio sotaque visual e comportamental, a experiência quebra.
E quebra feio.
