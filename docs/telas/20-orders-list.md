# Lista de Ordens

## Objetivo

Permitir visualizar, filtrar e acessar ordens do sistema conforme a role e o contexto operacional do usuário.

Esta é uma das telas centrais do produto.

---

## Rota

`/orders`

---

## Perfis com acesso

- assistant
- admin
- master
- inspector em visão limitada futura, se fizer sentido

---

## Quando o usuário chega aqui

O usuário normalmente chega nesta tela:

- a partir do dashboard
- pela navegação principal
- após precisar localizar uma ordem específica
- após receber follow-up ou precisar acompanhar status

---

## Objetivo do usuário nesta tela

### Assistant

- ver ordens disponíveis
- ver ordens próprias
- ver ordens em follow-up
- localizar ordem por código
- abrir detalhe da ordem

### Admin

- acompanhar ordens operacionais
- filtrar por status
- abrir detalhe para revisão
- identificar gargalos e pendências

### Master

- visualizar o fluxo de forma ampla
- inspecionar situação operacional
- auditar problemas ou inconsistências

---

## Conteúdo principal

- título da página
- resumo rápido de contadores por status
- filtros
- busca por código externo
- tabela ou lista de ordens
- ações contextuais por linha

---

## Filtros principais

- status
- código externo
- data disponível
- data limite
- assistant responsável
- source status
- batch de origem, futuramente

---

## Colunas mínimas sugeridas

- código externo
- status interno
- status de origem
- morador/residente
- cidade
- estado
- available date
- deadline date
- assistant responsável
- última atualização

---

## Ações principais

- abrir detalhe da ordem
- assumir ordem, quando permitido
- filtrar
- buscar
- resetar filtros

---

## Regras de visibilidade

### Assistant

Deve ver:

- ordens disponíveis para posse
- ordens sob sua responsabilidade
- ordens em follow-up relacionadas a ele

Não deve ver:

- visão administrativa ampla sem regra explícita

### Admin

Pode ver visão operacional ampla.

### Master

Pode ver tudo que for necessário para supervisão estrutural.

### Inspector

Não usa esta tela no primeiro momento, salvo visão futura limitada.

---

## Regras de negócio que impactam a UX

- ordem cancelada não pode aparecer como disponível para claim
- ordem `batched` ou `paid` não entra em edição operacional normal
- ordem `follow_up` precisa ficar visivelmente destacada
- ordem `submitted` precisa ser claramente separada de `in_progress`
- source status e status interno devem aparecer separados

---

## Estados da tela

### Loading

- skeleton da tabela
- contadores em loading

### Vazio sem filtro

- mensagem clara informando ausência de ordens

### Vazio com filtro

- mensagem clara indicando que o filtro não retornou resultados

### Erro

- mensagem de falha de carregamento
- ação para tentar novamente

### Sem permissão

- mensagem apropriada
- sem exibir ações bloqueadas

---

## Dependências de backend

### Mínimo atual

- `GET /orders`
- `GET /orders/:id`

### Em fluxo operacional

- `POST /orders/:id/claim`

### Futuro

- filtros reais no backend
- paginação
- ordenação
- listagem por fila específica

---

## Componentes principais

- cabeçalho da tela
- barra de filtros
- input de busca
- badges de status
- tabela responsiva
- paginação futura
- estado vazio
- estado de erro

---

## Prioridade de implementação

Alta.

Sem esta tela, o sistema fica sem eixo operacional visível para o usuário.

---

## Observações

Na primeira versão:

- pode começar simples
- sem paginação
- sem filtros complexos
- com foco em clareza dos status

O importante é não misturar:

- status interno
- status externo
- ações administrativas
- ações do assistant
