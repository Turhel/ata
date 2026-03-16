# Dashboard do Master

## Objetivo
## ReferÃªncia visual do site antigo

- Fonte visual principal: `docs/telas/.old_site/src/pages/dashboard/master/MasterOverview.tsx`
- Shell base: `docs/telas/.old_site/src/components/dashboard/DashboardLayout.tsx`, `docs/telas/.old_site/src/components/dashboard/AppSidebar.tsx` e `docs/telas/.old_site/src/components/dashboard/DashboardHeader.tsx`
- A implementaÃ§Ã£o nova deve seguir o mesmo padrÃ£o antigo de cards KPI + aÃ§Ãµes rÃ¡pidas + resumo do sistema


Dar ao master uma visão estrutural e executiva do sistema, com foco em organização, governança e saúde geral da operação.

Esta tela não é para operar ordem por ordem no fluxo diário.
Ela existe para enxergar o sistema como um todo.

---

## Rota

`/master`

---

## Perfis com acesso

- master

---

## Quando o usuário chega aqui

O usuário chega aqui:

- após login com role master
- quando quer avaliar a saúde geral do sistema
- quando quer acompanhar admins, times e estrutura
- quando quer detectar gargalos organizacionais

---

## Objetivo do usuário nesta tela

- ver métricas globais do sistema
- acompanhar admins e seus times
- ver pendências estruturais
- acessar módulos de gestão
- identificar riscos operacionais ou administrativos

---

## Papel desta tela

Esta é a home estrutural do sistema.

Ela deve responder rapidamente:

- como está a operação no geral
- quais admins estão com mais volume ou atraso
- se há usuários pendentes
- se a estrutura de times está coerente
- se existem gargalos sistêmicos

---

## Conteúdo principal

### 1. Resumo executivo global

Exemplos:

- total de usuários ativos
- total de admins
- total de assistants
- total de inspetores
- ordens por status
- imports recentes
- lotes financeiros abertos e fechados

### 2. Pendências estruturais

Exemplos:

- usuários pendentes de aprovação
- assistants sem admin responsável
- ordens sem work type
- ordens sem inspector account
- imports com erro
- tipos de trabalho sem pricing configurado

### 3. Visão por admin

Exemplos:

- admin
- tamanho do time
- ordens em revisão
- follow-ups do time
- aprovadas da semana
- pendências do time

### 4. Atalhos principais

- times
- convites e aprovações
- tipos de trabalho
- pricing
- pool
- pagamentos
- performance global

### 5. Alertas importantes

- picos de backlog
- follow-ups envelhecidos
- usuários sem role
- estruturas incompletas

---

## Regras de visibilidade

### Master

- acesso total ao dashboard
- visão global
- acesso aos módulos estruturais e administrativos

### Demais roles

- não acessam esta tela

---

## Regras de negócio que impactam a UX

- master estrutura o sistema
- master não deve operar o fluxo diário como padrão
- a tela deve priorizar visão ampla, não detalhe operacional minucioso
- a UI deve destacar problemas estruturais antes de métricas “bonitas”

---

## Estados da tela

### Loading

- skeleton dos cards
- skeleton dos blocos de equipe e alertas

### Sem dados

- manter estrutura da página
- exibir cards zerados e mensagens claras

### Erro

- mensagem clara com retry

---

## Dependências de backend

### Futuro mínimo

- endpoint de métricas globais
- resumo por role
- resumo por admin
- alertas estruturais
- contadores de pendências

---

## Componentes principais

- cards executivos
- bloco de alertas
- ranking/lista por admin
- atalhos estruturais
- gráficos simples por status ou role

---

## Prioridade de implementação

Média.

Muito útil para governança, mas pode vir depois que admin e assistant estiverem operando o fluxo principal sem tropeçar nos próprios sapatos.

---

## Observações

A primeira versão deve ser limpa e objetiva.
Master precisa de visão e direção, não de um cemitério de widgets.
