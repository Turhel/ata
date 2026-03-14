# Gestão de Times

## Objetivo

Permitir ao master organizar a estrutura entre admins e assistants, definindo quem responde a quem no sistema.

Esta tela sustenta segmentação operacional, dashboards por equipe e responsabilidade administrativa.

---

## Rota

`/master/teams`

---

## Perfis com acesso

- master

---

## Quando o usuário chega aqui

O usuário chega aqui:

- quando precisa organizar ou corrigir a estrutura dos times
- quando precisa vincular assistants a admins
- quando precisa encerrar vínculo antigo
- quando precisa reequilibrar equipes

---

## Objetivo do usuário nesta tela

- ver admins e seus respectivos assistants
- criar vínculo entre admin e assistant
- encerrar vínculo ativo
- detectar assistants sem admin
- evitar estruturas duplicadas ou inconsistentes

---

## Papel desta tela

Esta tela organiza a estrutura humana do sistema.

Ela existe para:

- dar dono administrativo ao assistant
- sustentar dashboards por time
- evitar assistants soltos no limbo organizacional
- preservar histórico de vínculo

---

## Conteúdo principal

### 1. Resumo estrutural

- total de admins
- total de assistants
- assistants com vínculo ativo
- assistants sem vínculo ativo

### 2. Lista por admin

Para cada admin:

- nome
- email
- quantidade de assistants ativos
- lista dos assistants vinculados

### 3. Lista de assistants sem time

- assistants ativos sem admin responsável
- ação rápida para vincular

### 4. Ações principais

- criar vínculo
- encerrar vínculo
- reatribuir assistant
- visualizar histórico, no futuro

---

## Fluxo esperado

### Criar vínculo

1. master seleciona admin
2. master seleciona assistant
3. sistema valida se já existe vínculo ativo
4. vínculo é criado com data de início

### Reatribuir assistant

1. master identifica assistant em time errado
2. encerra vínculo atual
3. cria novo vínculo com outro admin

### Encerrar vínculo

1. master seleciona vínculo ativo
2. confirma encerramento
3. sistema preenche data de fim e marca vínculo como inativo

---

## Regras de negócio que impactam a UX

- um assistant pode ter um admin responsável ativo por vez
- histórico deve ser preservado
- não pode haver vínculo duplicado ativo
- a UI deve deixar muito claro o estado ativo/inativo
- assistant sem time deve aparecer como pendência estrutural

---

## Regras de visibilidade

### Master

- acesso completo à gestão de times

### Admin

- não gerencia a estrutura global por esta tela
- no futuro pode ver seu próprio time em tela separada

### Assistant

- não acessa

### Inspector

- não acessa

---

## Estrutura visual sugerida

### Opção inicial simples

- coluna de admins
- lista de assistants por admin
- bloco lateral com assistants sem vínculo

### Evolução futura

- drag and drop entre colunas
- histórico de movimentação
- filtros por status

---

## Estados da tela

### Loading

- skeleton das listas

### Sem admins

- mensagem clara

### Sem assistants

- mensagem clara

### Sem pendências

- bloco de “todos os assistants têm admin”

### Erro

- mensagem com retry

---

## Dependências de backend

### Futuro mínimo

- `GET /team-assignments`
- `POST /team-assignments`
- `DELETE /team-assignments/:id`
- listagem de admins e assistants ativos

---

## Componentes principais

- cards de resumo
- colunas por admin
- lista de assistants órfãos
- modal de vinculação
- confirmação de encerramento

---

## Prioridade de implementação

Média para alta.

Sem isso, o sistema até roda, mas a visão por equipe fica torta e a gestão vira adivinhação com planilha paralela, que é sempre uma péssima tradição humana.
