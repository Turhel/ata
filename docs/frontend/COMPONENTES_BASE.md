# Componentes Base do Frontend

## Objetivo

Definir os componentes-base reutilizáveis do frontend do ATA Portal para manter consistência visual, reduzir duplicação e acelerar implementação.

Este documento não define a estética final do sistema.
Ele define a base funcional e estrutural.

---

## Princípios

### 1. Reutilizar antes de reinventar

Se um padrão aparece em 2 ou mais telas, ele merece componente próprio.

### 2. Componente não decide regra de negócio

Componente apresenta dados e dispara ações.
Validação e regra crítica continuam na API.

### 3. Priorizar clareza

Os componentes devem ajudar o usuário a trabalhar mais rápido, não provar que alguém descobriu animação.

### 4. Estados visíveis e previsíveis

Todo componente relevante deve ter comportamento claro para:

- loading
- vazio
- erro
- sucesso
- desabilitado

---

## Camadas de componentes

### 1. Layout

Estrutura geral da aplicação.

### 2. Navegação

Menus, breadcrumbs, headers e elementos de orientação.

### 3. Dados

Tabelas, listas, cards e painéis de detalhe.

### 4. Entrada

Formulários, filtros, busca e ações.

### 5. Feedback

Alertas, toasts, modais e estados vazios.

---

# 1. Layout

## AppShell

Responsável pela estrutura principal da aplicação.

### Deve conter

- sidebar
- header/topbar
- área de conteúdo
- rodapé opcional
- suporte a versão mobile

### Uso

Todas as telas autenticadas.

---

## PublicShell

Estrutura de páginas públicas.

### Uso

- `/`
- `/auth`

---

## CenteredPage

Layout simples para páginas de estado único.

### Uso

- `/welcome`
- erros simples
- páginas sem navegação lateral

---

# 2. Navegação

## Sidebar

Menu principal por role.

### Deve suportar

- grupos
- item ativo
- colapso
- mobile drawer
- rodapé com usuário atual

---

## Topbar

Cabeçalho superior.

### Pode conter

- título da tela
- breadcrumbs
- ações rápidas
- avatar/menu do usuário

---

## Breadcrumbs

Navegação contextual.

### Usar quando

- houver detalhe de item
- a hierarquia da tela não for óbvia

### Não usar quando

- a tela for simples e direta demais para justificar isso

---

## PageHeader

Cabeçalho padrão de tela.

### Deve conter

- título
- descrição curta opcional
- ações primárias
- ações secundárias, se existirem

---

# 3. Componentes de dados

## DataTable

Tabela padrão do sistema.

### Deve suportar

- colunas configuráveis
- loading
- vazio
- erro
- paginação futura
- ações por linha
- ordenação futura

### Usar em

- users
- orders
- pool batches
- payments
- performance

---

## DataList

Lista simples para telas menos densas.

### Usar em

- manuais
- escopos
- cards resumidos
- resultados de busca simples

---

## DetailPanel

Painel lateral ou bloco de detalhe.

### Usar em

- approval
- orders
- pool batch detail
- scope detail

---

## MetricCard

Card pequeno para indicadores.

### Usar em

- dashboards
- performance
- pagamentos
- resumo de fila

### Exemplo de conteúdo

- valor
- label
- delta opcional
- status opcional

---

## StatusBadge

Badge padronizado para status.

### Deve cobrir

- user status
- order status
- import batch status
- payment status

### Regra

Cor e label devem ser consistentes em todo o sistema.

---

## EmptyState

Estado vazio padronizado.

### Deve conter

- título curto
- explicação curta
- ação principal opcional

---

## ErrorState

Estado de erro padronizado.

### Deve conter

- mensagem clara
- botão de tentar novamente
- detalhe técnico só quando fizer sentido

---

# 4. Componentes de entrada

## SearchInput

Campo de busca padrão.

### Usar em

- orders
- escopos
- pool
- manuais
- pagamentos

---

## FilterBar

Barra de filtros simples.

### Pode conter

- select
- checkbox
- status
- intervalo de datas
- botão limpar filtros

---

## FormSection

Agrupador visual de campos.

### Usar em

- formulários longos
- telas com contexto dividido

---

## FormField

Campo base padronizado.

### Variações

- texto
- email
- senha
- textarea
- select
- checkbox
- date

### Deve suportar

- label
- hint
- erro
- obrigatório
- desabilitado

---

## ActionButton

Botão padrão do sistema.

### Variações mínimas

- primary
- secondary
- destructive
- ghost

### Deve suportar

- loading
- disabled
- icon opcional

---

## ConfirmDialog

Modal de confirmação para ação crítica.

### Usar em

- bloquear usuário
- rejeitar
- devolver ao pool
- fechar lote
- pagar lote

---

## ReasonModal

Modal com campo obrigatório de motivo.

### Usar em

- follow-up
- reject
- return-to-pool
- bloqueios relevantes

---

# 5. Componentes específicos do domínio

## OrderRowCard

Resumo visual de order.

### Usar em

- mobile
- listas resumidas
- dashboards

---

## OrderDetailCard

Card com dados principais da ordem.

### Deve mostrar

- external code
- status
- source status
- endereço
- residente
- work type
- assistant
- datas

---

## ApprovalActionPanel

Painel com ações administrativas da revisão.

### Deve conter

- aprovar
- follow-up
- rejeitar
- devolver ao pool

---

## ScopeEditor

Editor de categorias e itens do escopo.

### Deve suportar

- categorias
- itens
- sub-itens
- ordenação simples
- remoção
- adição

---

## ScopePreview

Prévia textual do escopo.

### Objetivo

Permitir conferência rápida antes de salvar.

---

## PaymentSummaryCard

Resumo financeiro individual.

### Usar em

- `/mypayment`
- `/mypayment/history`

---

# 6. Componentes de feedback

## AppToast

Feedback rápido de ação.

### Usar para

- sucesso de salvar
- sucesso de atualizar
- erro leve
- informação curta

### Não usar para

- explicar regra de negócio complexa demais

---

## InlineAlert

Alerta dentro da tela.

### Usar em

- aviso de permissões
- informação de status
- aviso de dados incompletos

---

## LoadingOverlay

Overlay para ações críticas demoradas.

### Usar com cuidado

Apenas quando a ação bloquear a tela inteira.

---

# 7. Componentes de infraestrutura visual

## PermissionGate

Componente para exibir ou ocultar partes da UI por role/status.

### Regra

Isso melhora UX, mas não substitui proteção da API.

---

## RouteGuard

Proteção de rotas no frontend.

### Deve considerar

- autenticado ou não
- status do usuário
- role

---

## QueryStateBoundary

Wrapper para loading/erro/vazio de consultas assíncronas.

### Objetivo

Evitar if espalhado em toda tela.

---

# 8. Ordem sugerida de construção

## Primeiro

- AppShell
- Sidebar
- Topbar
- PageHeader
- ActionButton
- FormField
- StatusBadge
- MetricCard
- EmptyState
- ErrorState

## Depois

- DataTable
- FilterBar
- SearchInput
- ConfirmDialog
- ReasonModal
- DetailPanel

## Depois do domínio ficar mais claro

- ApprovalActionPanel
- ScopeEditor
- ScopePreview
- OrderDetailCard
- PaymentSummaryCard

---

# 9. Regras importantes

## 1. Não criar componente cedo demais

Se só existe um uso e ele ainda está mudando muito, pode esperar.

## 2. Não criar componente genérico demais

“MegaFieldUniversalEnterpriseInput” é como projetos começam a feder.

## 3. Não misturar visual com lógica de domínio

Botão sabe disparar ação.
Botão não sabe decidir se order pode ser aprovada.

---

# Objetivo final

Ter uma base de componentes que permita montar telas do sistema com:

- consistência
- velocidade
- previsibilidade
- manutenção razoável

Se cada tela parecer de um produto diferente, o frontend falhou.
