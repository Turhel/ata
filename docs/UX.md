# UX do ATA Portal

## Objetivo

Este documento define a direção de UX do **ATA Portal** antes da construção do frontend completo.

A meta não é desenhar interface bonita agora.
A meta é evitar que o frontend cresça sem estrutura, com telas duplicadas, ações inconsistentes e regras espalhadas.

O foco inicial de UX deve ser:

- clareza por **role**
- fluxo operacional simples
- telas orientadas por **fila de trabalho**
- ações explícitas de negócio
- leitura rápida do estado da ordem
- mínimo atrito para execução do trabalho diário

---

## Princípios de UX

### 1. O sistema deve ser orientado por tarefa

O usuário deve abrir o sistema e entender imediatamente:

- o que ele precisa fazer agora
- onde estão suas pendências
- quais ações estão disponíveis
- o que está bloqueado e por quê

O portal não deve começar como “uma coleção de tabelas”.
Ele deve começar como um sistema de trabalho por fluxo.

### 2. Cada role deve ver uma experiência diferente

O frontend não deve tratar todas as roles como se fossem iguais.
A informação inicial, os atalhos e as ações principais mudam conforme a responsabilidade.

### 3. A ordem é a entidade central da navegação

A maior parte da navegação gira em torno de:

- filas de ordens
- detalhe da ordem
- histórico da ordem
- ações da ordem

### 4. Ações críticas devem ser explícitas

Aprovar, rejeitar, pedir follow-up, devolver ao pool, lotear e pagar não podem ficar escondidos em UX ambígua.

Cada ação crítica precisa de:

- nome claro
- contexto claro
- feedback claro
- confirmação quando fizer sentido
- erro claro quando for bloqueada

### 5. A UX deve refletir restrições reais do backend

O frontend não decide regra.
Mas ele deve deixar visível:

- quando algo é permitido
- quando algo está bloqueado
- por que está bloqueado
- qual o próximo passo esperado

---

## Momento atual do projeto

Já vale pensar seriamente no frontend.

Não no sentido de:

- design final
- identidade visual refinada
- microinterações bonitas
- componentes sofisticados

Mas sim no sentido de:

- arquitetura de navegação
- dashboards por role
- listas e filas principais
- tela de detalhe da ordem
- estados vazios
- mensagens de erro
- modelagem das ações por tela

Este é o momento certo para definir o **esqueleto do front**.

---

## Objetivo do frontend nas próximas fases

O frontend deve evoluir nesta ordem:

1. **fluxo dev mínimo validando integração**
2. **fluxo operacional mínimo por role**
3. **telas de trabalho reais**
4. **melhoria de ergonomia**
5. **polimento visual**

A prioridade agora é a etapa 2.

---

## Roles e experiência esperada

## Master

### Objetivo principal

Configurar estrutura do sistema.

### Foco da UX

- gestão estrutural
- leitura global do sistema
- configuração de usuários, roles, times, catálogos e parâmetros

### Não deve ser a prioridade visual agora

O Master é importante, mas não é o fluxo diário principal.
O frontend inicial não precisa começar por ele.

---

## Admin

### Objetivo principal

Supervisionar o fluxo operacional e financeiro.

### O que precisa ver rapidamente

- ordens submetidas aguardando decisão
- follow-ups em aberto
- ordens rejeitadas que podem voltar ao pool
- batches de importação recentes
- usuários pendentes
- produtividade do time
- ordens aprovadas elegíveis para lote

### Experiência ideal

O Admin deve abrir o sistema e cair num painel com **pendências administrativas**.

### Primeiras telas importantes

- dashboard admin
- usuários
- batches de importação
- fila de revisão de ordens
- detalhe da ordem

---

## Assistant

### Objetivo principal

Executar e enviar ordens.

### O que precisa ver rapidamente

- ordens disponíveis para claim
- minhas ordens em andamento
- meus follow-ups
- minhas ordens submetidas
- histórico básico da ordem
- motivo do follow-up/rejeição

### Experiência ideal

O Assistant deve abrir o sistema e cair direto na sua área operacional.

A navegação precisa privilegiar:

- “o que posso pegar”
- “o que estou fazendo”
- “o que voltou para correção”

### Primeiras telas importantes

- dashboard assistant
- fila disponível
- minhas ordens
- meus follow-ups
- detalhe da ordem

---

## Inspector

### Objetivo principal

Consulta limitada e futura participação operacional específica.

### Prioridade atual

Baixa.

### Recomendação

Não tentar desenhar UX completa do Inspector agora.
Só reservar espaço arquitetural para isso no futuro.

---

## Estrutura inicial de navegação sugerida

## Navegação global

### Itens base

- Início
- Ordens
- Importações
- Usuários
- Times
- Catálogos
- Pagamentos
- Configurações

Mas esses itens não devem aparecer iguais para todo mundo.

---

## Navegação por role

## Assistant

### Menu sugerido

- Início
- Ordens disponíveis
- Minhas ordens
- Meus follow-ups

### Entrada padrão

- dashboard assistant

---

## Admin

### Menu sugerido

- Início
- Revisão de ordens
- Importações
- Usuários
- Times
- Pagamentos

### Entrada padrão

- dashboard admin

---

## Master

### Menu sugerido

- Início
- Usuários
- Times
- Inspetores
- Contas de inspetor
- Tipos de trabalho
- Clientes
- Configurações

### Entrada padrão

- painel estrutural

---

## Telas mínimas recomendadas

## 1. Tela de login

### Objetivo

Entrar com email e senha.

### Deve ter

- formulário simples
- estado de loading
- erro de autenticação claro
- confirmação de login com sessão válida

### Estados importantes

- deslogado
- autenticado sem profile operacional
- autenticado com profile `pending`
- autenticado com profile `blocked`
- autenticado com profile `active`

---

## 2. Tela “meu estado” inicial

### Objetivo

Resolver logo o estado do usuário após login.

### Casos

- sem profile operacional
- profile `pending`
- profile `blocked`
- profile `inactive`
- profile `active`

### Regra de UX

Antes do dashboard real, o usuário precisa entender **em que estado ele está**.

---

## 3. Dashboard Assistant

### Blocos mínimos

- ordens disponíveis
- minhas ordens em andamento
- meus follow-ups
- minhas submetidas

### Ações rápidas

- abrir fila disponível
- abrir minhas ordens
- abrir follow-ups

---

## 4. Dashboard Admin

### Blocos mínimos

- ordens submetidas aguardando revisão
- follow-ups em aberto
- ordens rejeitadas
- ordens aprovadas elegíveis para pagamento
- usuários pendentes
- último batch de importação

### Ações rápidas

- revisar ordens
- aprovar usuários
- importar pool

---

## 5. Lista de ordens

### Precisa existir em formatos diferentes

#### Visão Assistant

- disponíveis
- minhas
- follow-up

#### Visão Admin

- ampla
- revisão
- aprovadas
- rejeitadas
- por time no futuro

### Campos mínimos úteis

- código externo
- status interno
- status externo
- residente
- cidade/estado
- assistente responsável
- available date
- deadline date

### Ações por linha

Conforme o contexto:

- claim
- abrir detalhe
- submit
- approve
- reject
- follow-up
- return to pool

---

## 6. Detalhe da ordem

### Deve virar uma tela central

A tela de detalhe da ordem deve concentrar:

- dados principais
- status atual
- origem/importação
- histórico
- notas futuras
- ações permitidas

### Estrutura sugerida

#### Bloco 1: resumo

- código externo
- status
- source status
- assistente
- batch de origem

#### Bloco 2: dados da ordem

- residente
- endereço
- cidade/estado/zip
- work type
- inspector account
- datas
- flags operacionais

#### Bloco 3: histórico

- claim
- submit
- follow-up
- reject
- approve
- return to pool

#### Bloco 4: ações

Exibir apenas as ações permitidas para a role e status atual.

---

## 7. Importações

### Tela mínima inicial

- lista de batches
- detalhe do batch
- counters do batch
- itens com erro

### Valor de UX

Isso ajuda a tirar o admin do banco/terminal para entender importações.

---

## 8. Usuários

### Já existe base de API

### UX mínima esperada

- lista de usuários
- status visual claro
- ações de aprovar, bloquear, reativar

### Próximo passo natural

- filtrar pendentes
- exibir role ativa
n
---

## Fluxos prioritários de UX

## Fluxo 1: login e resolução do estado do usuário

1. usuário faz login
2. frontend consulta `/me`
3. decide o estado:
   - missing
   - pending
   - blocked
   - inactive
   - active
4. redireciona para a visão correspondente

---

## Fluxo 2: Assistant assume e envia ordem

1. abre “Ordens disponíveis”
2. escolhe uma ordem
3. faz claim
4. vai para “Minhas ordens”
5. edita dados permitidos
6. envia para revisão
7. ordem some da fila operacional ativa e entra como submetida

---

## Fluxo 3: Admin revisa ordem

1. abre fila de submetidas
2. entra no detalhe
3. decide:
   - approve
   - follow-up
   - reject
4. sistema mostra confirmação e novo estado
5. histórico reflete a ação

---

## Fluxo 4: Assistant responde follow-up

1. abre “Meus follow-ups”
2. vê motivo claramente
3. corrige
4. resubmete

---

## Regras de UX por status da ordem

## available

### Assistant vê

- botão de claim
- dados mínimos suficientes para decidir pegar ou não

### Admin vê

- leitura ampla
- possível intervenção administrativa futura

---

## in_progress

### Assistant responsável vê

- edição permitida
- botão de submit

### Outros usuários

- leitura restrita conforme role

---

## submitted

### Assistant vê

- leitura
- sem edição livre
- aguardando decisão administrativa

### Admin vê

- ações de approve / follow-up / reject

---

## follow_up

### Assistant responsável vê

- motivo destacado
- possibilidade de corrigir e reenviar

### Admin vê

- acompanhamento do retorno

---

## rejected

### UX recomendada

- mostrar histórico e motivo
- não tratar como limbo silencioso
- preparar para retorno ao pool explícito

---

## approved

### UX recomendada

- destacar elegibilidade financeira
- sem edição operacional normal

---

## batched / paid / cancelled / archived

### UX recomendada

- leitura prioritária
- ações fortemente restritas
- badges visuais claros

---

## Componentes mínimos úteis

Não precisa criar design system final agora.
Mas já vale prever componentes simples e reutilizáveis.

### Componentes prioritários

- `StatusBadge`
- `RoleBadge`
- `PageSection`
- `EmptyState`
- `ErrorState`
- `LoadingState`
- `OrderList`
- `OrderActionBar`
- `OrderSummaryCard`
- `OrderHistoryList`

---

## Estados de UX que precisam existir desde cedo

## Loading

Sempre mostrar loading claro para:

- login
- `/me`
- listas
- ações de order

## Empty state

Exemplos:

- nenhuma ordem disponível
- nenhum follow-up
- nenhum usuário pendente
- nenhum batch recente

## Error state

O erro precisa dizer:

- o que deu errado
- se a ação foi bloqueada por regra
- se é erro de permissão
- se é erro de validação

## Success feedback

Exemplos:

- ordem assumida
- ordem enviada
- follow-up registrado
- ordem devolvida ao pool

---

## O que não fazer agora

### Não começar por design final

Sem gastar energia agora com:

- branding refinado
- animações
- modo “dashboard super bonito”
- tabela mega complexa

### Não misturar telas de roles diferentes sem critério

Assistant e Admin não devem compartilhar exatamente a mesma home.

### Não esconder regra crítica em menu obscuro

Ações críticas de workflow devem ficar visíveis e contextualizadas.

---

## Roadmap sugerido de UX/frontend

## Fase 1

- login
- resolução do estado do usuário
- `/me`
- visão dev mínima

## Fase 2

- Assistant:
  - ordens disponíveis
  - minhas ordens
  - meus follow-ups
- Admin:
  - listagem ampla de ordens
  - detalhe da ordem

## Fase 3

- detalhe da ordem mais completo
- histórico de eventos
- edição controlada
- resubmit
- revisão administrativa mais fluida

## Fase 4

- importações no frontend
- usuários no frontend mais completos
- times
- catálogos

## Fase 5

- financeiro
- dashboards reais
- polimento visual

---

## Decisão prática

Sim, **já vale pensar no front**.

Mais especificamente, já vale definir e implementar:

- arquitetura de navegação
- dashboards por role
- listas principais
- detalhe da ordem
- estados de UX
- componentes mínimos reutilizáveis

Ainda **não** vale gastar muito tempo com:

- visual final
- refinamento de design
- sistema visual completo

A prioridade deve ser construir um frontend que reflita o workflow corretamente.

---

## Próximo passo recomendado

O próximo passo de frontend/UX mais valioso é:

1. consolidar a visão do **Assistant**
2. consolidar a leitura da **ordem**
3. consolidar a visão de **revisão do Admin**

Se isso ficar bom, o resto cresce com muito menos caos.
