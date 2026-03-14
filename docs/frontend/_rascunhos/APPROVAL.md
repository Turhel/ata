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
# Approval

## Objetivo

Definir a tela de revisÃ£o administrativa das ordens enviadas.

Esta tela Ã© uma das mais crÃ­ticas do sistema.
Ela existe para que `admin` e `master` possam:

- revisar orders submetidas
- aprovar
- pedir follow-up
- rejeitar
- devolver ao pool, quando aplicÃ¡vel
- decidir com seguranÃ§a e rastreabilidade

---

## Rota principal

- `/approval`

---

## Rota relacionada

- `/approval/duplicate`

---

## Roles atendidas

- `admin`
- `master`

---

## Papel da tela

A tela de approval Ã© a fila de decisÃ£o administrativa do workflow.

Ela nÃ£o deve ser confundida com:

- orders gerais
- pool
- payments
- performance

Aqui o foco Ã© revisÃ£o e decisÃ£o.

---

# 1. Perguntas que a tela deve responder

- quais ordens aguardam decisÃ£o
- o que hÃ¡ de mais urgente
- qual order estÃ¡ pronta para aprovaÃ§Ã£o
- qual order precisa de follow-up
- qual order deve ser rejeitada
- o que ainda precisa voltar ao pool

---

# 2. Escopo principal da tela

## Primeira fase

- revisar `submitted`
- aplicar `approve`
- aplicar `follow-up`
- aplicar `reject`

## Segunda fase

- visualizar histÃ³rico relevante
- visualizar sinais de duplicidade
- retornar ao pool explicitamente
- melhorar priorizaÃ§Ã£o e filtros

---

# 3. Estrutura da tela

## Bloco 1. Header

- tÃ­tulo: `AprovaÃ§Ãµes`
- descriÃ§Ã£o curta
- resumo da fila
- atalhos para duplicatas e orders gerais

## Bloco 2. Filtros

- status
- assistant
- date range
- busca por external code
- prioridade, se existir depois

## Bloco 3. ConteÃºdo principal

- lista de orders em revisÃ£o
- detalhe da order selecionada
- painel de aÃ§Ãµes administrativas

---

# 4. Modelo de layout recomendado

## Desktop

### Coluna esquerda

Lista ou tabela da fila

### Coluna direita

Detalhe + painel de aÃ§Ã£o

Isso acelera revisÃ£o sem ficar pulando de tela o tempo todo como um ritual irritante.

## Mobile

- lista primeiro
- detalhe em tela separada ou seÃ§Ã£o expandida
- aÃ§Ãµes abaixo do detalhe

---

# 5. Itens mÃ­nimos da fila

Cada item da fila deve mostrar:

- external order code
- status
- source status
- resident name
- city/state
- assistant
- submitted at
- sinais relevantes de risco ou incompletude, quando existirem

---

# 6. Detalhe mÃ­nimo da order em approval

## Mostrar

- external code
- status
- source status
- endereÃ§o
- residente
- work type
- assistant
- submitted at
- approved/rejected/follow-up timestamps, se existirem
- import batch, quando Ãºtil
- informaÃ§Ãµes mÃ­nimas necessÃ¡rias para decidir

## Futuramente mostrar

- histÃ³rico de eventos
- notas
- conflitos de duplicidade
- checklist de completude

---

# 7. AÃ§Ãµes da tela

## Aprovar

### Regras

- sÃ³ `submitted`
- dados mÃ­nimos completos
- order nÃ£o cancelada

### Resultado esperado

- status `approved`
- feedback imediato
- item sai ou muda de fila
- histÃ³rico gerado

---

## Pedir follow-up

### Regras

- sÃ³ `submitted`
- motivo obrigatÃ³rio

### Resultado esperado

- status `follow_up`
- item sai da fila principal
- histÃ³rico gerado

---

## Rejeitar

### Regras

- `submitted` ou `follow_up`
- motivo obrigatÃ³rio

### Resultado esperado

- status `rejected`
- histÃ³rico gerado

---

## Devolver ao pool

### Regras

- aÃ§Ã£o explÃ­cita
- motivo obrigatÃ³rio
- geralmente apÃ³s `rejected`

### Resultado esperado

- status `available`
- assistant desvinculado
- returned_to_pool_at preenchido
- histÃ³rico gerado

---

# 8. Filtros recomendados

## ObrigatÃ³rios na primeira versÃ£o

- busca por external code
- assistant
- status

## Muito Ãºteis depois

- submitted today
- follow-up
- rejected aguardando retorno
- source status
- import batch
- city/state

---

# 9. Estados da tela

## Loading

- skeleton da fila
- skeleton do painel de detalhe

## Empty

Mensagens Ãºteis:

- nenhuma order aguardando revisÃ£o
- nenhum resultado com esse filtro
- nenhuma pendÃªncia no momento

## Error

- erro localizado
- retry

---

# 10. Feedback de aÃ§Ãµes

## Aprovar

- toast curto
- item atualizado ou removido da fila
- detalhe refrescado

## Follow-up

- modal com motivo
- validaÃ§Ã£o clara de motivo obrigatÃ³rio
- item muda de estado

## Reject

- modal com motivo
- mudanÃ§a de status clara

## Return to pool

- confirmaÃ§Ã£o clara
- feedback visÃ­vel no item e detalhe

---

# 11. RelaÃ§Ã£o com outras telas

## Orders

Pode abrir ordem mais completa ou contexto maior

## Approval duplicate

Deve receber itens suspeitos ou duplicados

## Performance

Pode refletir volume de follow-up/reject/approve

## Pool

Pode servir para conferir origem da order

---

# 12. Primeira versÃ£o mÃ­nima recomendada

## Backend

- `GET /orders` ou endpoint especÃ­fico filtrÃ¡vel
- `GET /orders/:id`
- `POST /orders/:id/approve`
- `POST /orders/:id/follow-up`
- `POST /orders/:id/reject`
- `POST /orders/:id/return-to-pool`

## Front

- fila simples
- detalhe simples
- painel com aÃ§Ãµes
- modais de motivo
- filtros mÃ­nimos

---

# 13. Riscos de UX que devem ser evitados

- fazer admin sair da tela para cada decisÃ£o
- esconder motivo em lugar ruim
- nÃ£o atualizar visualmente apÃ³s aÃ§Ã£o
- misturar ordem em revisÃ£o com ordem financeira
- fazer approval parecer uma lista genÃ©rica de orders

---

# Objetivo final

A tela de approval deve fazer revisÃ£o administrativa parecer:

- clara
- rÃ¡pida
- segura
- rastreÃ¡vel

Sem ambiguidade sobre o que estÃ¡ sendo decidido e por quÃª.

