# Dashboard do Usuário

## Objetivo

Ser a tela inicial operacional do usuário autenticado.

Ela deve mostrar, de forma rápida, o que precisa de atenção agora, sem obrigar a pessoa a sair caçando informação em cinco páginas diferentes.

---

## Rota

`/dashboard`

---

## Perfis com acesso

- assistant
- inspector
- admin
- master

> Observação:
> o conteúdo muda conforme a role.
> A rota pode ser a mesma, mas a experiência não deve ser igual para todo mundo.

---

## Quando o usuário chega aqui

O usuário chega aqui:

- logo após login
- ao voltar para o sistema
- ao querer ver resumo rápido do dia
- ao querer descobrir o que precisa fazer agora

---

## Objetivo do usuário nesta tela

### Assistant

- ver ordens pendentes
- ver follow-ups
- ver o que está vencendo hoje
- ver produtividade básica

### Inspector

- ver acesso rápido ao módulo de escopo
- localizar inspeções ou escopos relevantes
- ter uma entrada simples para o trabalho de campo

### Admin

- ver fila de aprovação
- ver pendências do time
- ver importações recentes
- ver indicadores operacionais

### Master

- ver visão estrutural resumida
- acompanhar indicadores gerais
- acessar módulos administrativos principais

---

## Papel desta tela

Esta tela é o ponto de partida do sistema.

Ela não substitui módulos específicos, mas precisa orientar o usuário para:

- pendências imediatas
- ações recorrentes
- atalhos principais
- visão rápida do estado atual

---

## Conteúdo principal

### 1. Saudação e contexto

- nome do usuário
- role atual
- data atual
- mensagem curta contextual

### 2. Cards de resumo

Exemplos:

- ordens em andamento
- follow-ups pendentes
- ordens submetidas hoje
- aprovações pendentes
- ordens disponíveis
- escopos recentes
- lotes em aberto

### 3. Bloco “o que precisa de atenção”

Exemplos:

- follow-ups pendentes
- due date de hoje
- aprovações aguardando decisão
- importações com erro
- ordens rejeitadas aguardando retorno ao pool

### 4. Atalhos rápidos

Exemplos:

- ir para ordens
- inserir ordens
- aprovações
- pool
- escopos
- pagamentos
- manuais

### 5. Indicadores simples

Exemplos:

- hoje
- semana
- mês

---

## Regras de visibilidade

### Assistant

Ver:

- suas ordens
- seus follow-ups
- suas métricas
- seus atalhos operacionais

Não ver:

- gestão estrutural
- gestão global de usuários
- financeiro administrativo

### Inspector

Ver:

- acesso rápido a escopos
- busca operacional
- dados mínimos necessários

Não ver:

- aprovação
- pagamentos
- gestão estrutural

### Admin

Ver:

- visão do time
- fila administrativa
- aprovações
- importações
- pagamentos

### Master

Ver:

- visão ampla do sistema
- módulos estruturais
- indicadores gerais

---

## Estados da tela

### Loading

- skeleton dos cards
- skeleton dos blocos principais

### Sem dados

- mensagem clara
- ainda assim manter atalhos úteis

### Erro

- mensagem de erro amigável
- opção de recarregar

---

## Dependências de backend

### Futuro mínimo

- `GET /me`
- endpoint de métricas resumidas por role
- endpoint de pendências rápidas
- contadores operacionais

---

## Componentes principais

- header de boas-vindas
- cards de resumo
- bloco de pendências
- atalhos rápidos
- blocos por role

---

## Prioridade de implementação

Alta.

Sem dashboard, o sistema até funciona, mas a experiência fica com cara de depósito de endpoints com HTML em volta.

---

## Observações

A primeira versão deve ser simples e útil.
Não precisa nascer com vinte gráficos.

Se o dashboard não ajudar a agir, ele vira só decoração com ansiedade embutida.
