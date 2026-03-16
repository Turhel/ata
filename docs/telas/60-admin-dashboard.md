# Dashboard Administrativo

## Objetivo
## ReferÃªncia visual do site antigo

- Fonte visual principal: `docs/telas/.old_site/src/pages/dashboard/admin/AdminOverview.tsx`
- Shell base: `docs/telas/.old_site/src/components/dashboard/DashboardLayout.tsx`, `docs/telas/.old_site/src/components/dashboard/AppSidebar.tsx` e `docs/telas/.old_site/src/components/dashboard/DashboardHeader.tsx`
- O painel novo deve manter a cara do dashboard administrativo antigo: KPIs no topo, blocos de atenÃ§Ã£o e atalhos operacionais claros


Dar ao admin uma visão central do fluxo operacional do time, com foco em revisão, pendências, produtividade e saúde do processo.

---

## Rota

`/admin`

---

## Perfis com acesso

- admin
- master

---

## Quando o usuário chega aqui

O usuário chega aqui:

- após login administrativo
- quando quer ver o estado do time
- quando quer decidir prioridades do dia
- quando quer descobrir gargalos rapidamente

---

## Objetivo do usuário nesta tela

- ver fila de aprovação
- ver follow-ups pendentes
- ver ordens rejeitadas aguardando retorno ao pool
- ver volume de ordens do dia/semana
- ver performance do time
- acessar rapidamente os módulos críticos

---

## Papel desta tela

Esta é a home operacional do admin.

Ela precisa responder rapidamente:

- o que precisa ser decidido agora
- onde está o gargalo
- como o time está performando
- qual módulo o admin precisa abrir em seguida

---

## Conteúdo principal

### 1. Resumo executivo

Exemplos:

- submitted aguardando revisão
- follow-ups em aberto
- rejected aguardando retorno ao pool
- ordens aprovadas prontas para financeiro
- imports recentes com erro

### 2. Pendências críticas

- ordens submitted há mais tempo
- follow-ups envelhecendo
- batches com falha
- usuários pendentes de aprovação
- ordens canceladas exigindo atenção

### 3. Performance do time

- aprovadas hoje
- follow-up hoje
- rejeitadas hoje
- submit por assistant
- produtividade da semana

### 4. Atalhos principais

- aprovações
- pool
- importar pool
- ordens
- pagamentos
- performance
- usuários pendentes

### 5. Bloco de saúde operacional

- ordens por status
- atrasos
- fila de revisão
- riscos do dia

---

## Regras de visibilidade

### Admin

- acesso completo ao dashboard administrativo do próprio escopo operacional

### Master

- pode visualizar também, além do dashboard estrutural

### Assistant

- não acessa

### Inspector

- não acessa

---

## Regras de negócio que impactam a UX

- admin é o dono funcional da revisão
- follow-up, reject e approve são decisões centrais
- ordens aprovadas ainda não estão pagas
- usuários pending não operam
- o dashboard deve refletir workflow, não apenas listar números aleatórios

---

## Estados da tela

### Loading

- skeleton dos cards e listas

### Sem dados

- mostrar cards zerados
- manter atalhos e estrutura

### Erro

- mensagem clara
- retry

---

## Dependências de backend

### Futuro mínimo

- endpoint de métricas administrativas
- contadores por status
- fila resumida de aprovações
- lista de pendências críticas
- métricas por assistant

---

## Componentes principais

- cards executivos
- bloco de pendências
- gráfico simples por status
- ranking ou resumo de performance
- atalhos administrativos

---

## Prioridade de implementação

Alta.

O admin até consegue sobreviver abrindo módulo por módulo, mas isso é sobreviver, não operar bem.

---

## Observações

A primeira versão deve priorizar utilidade:

- cards
- fila resumida
- atalhos
- poucos gráficos
- muita clareza

Dashboard bom ajuda a decidir.
Dashboard ruim é só um mural corporativo com números cansados.
