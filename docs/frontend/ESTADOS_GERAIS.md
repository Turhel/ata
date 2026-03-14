# Estados Gerais da Interface

## Objetivo

Padronizar como o frontend do ATA Portal lida com estados recorrentes de interface.

Este documento existe para evitar:

- loading inconsistente
- mensagens de erro aleatórias
- estados vazios improvisados
- telas silenciosas que deixam o usuário sem entender nada

---

## Princípio central

Toda tela relevante deve responder claramente:

- está carregando?
- carregou e veio vazio?
- falhou?
- funcionou?
- o usuário pode agir?
- a ação está bloqueada por regra?

---

# 1. Estados base

## Loading

Quando a tela ou ação está buscando ou processando dados.

### Regra

Sempre mostrar feedback visível.

### Pode usar

- skeleton
- spinner
- botão com loading
- overlay, quando necessário

### Não fazer

- tela “travada” sem sinal
- reload visual agressivo toda vez

---

## Empty

Quando a consulta funciona, mas não há dados.

### Regra

Estado vazio não é erro.

### Deve conter

- título curto
- explicação simples
- ação principal opcional

### Exemplo

“Não há orders para revisar no momento.”

---

## Error

Quando houve falha real.

### Deve conter

- mensagem clara
- ação de tentar novamente
- detalhes técnicos só quando necessário

### Regra

Não jogar stack trace no colo do usuário como se isso fosse comunicação.

---

## Success

Quando ação foi concluída.

### Pode usar

- toast
- feedback inline
- atualização clara da lista ou detalhe

### Regra

Sucesso deve ficar perceptível sem ser irritante.

---

## Disabled

Quando ação existe, mas não pode ser usada.

### Regra

Botão desabilitado precisa de contexto visível ou previsível.

### Exemplo

- “Aprovar” desabilitado porque a order não está `submitted`

---

# 2. Estados por contexto de autenticação

## Usuário sem sessão

### Comportamento

- redirecionar para `/auth`
- evitar loops
- preservar intenção de navegação, se fizer sentido

---

## Usuário pending

### Comportamento

- redirecionar para `/welcome`
- não mostrar áreas operacionais
- explicar que a conta ainda aguarda aprovação

---

## Usuário blocked

### Comportamento

- impedir fluxo operacional
- encerrar sessão ou bloquear ações subsequentes
- mostrar mensagem clara

---

## Usuário inactive

### Comportamento

- semelhante ao blocked
- sem acesso operacional normal

---

# 3. Estados por tipo de tela

## Dashboard

### Loading

- skeleton de métricas
- placeholder de gráficos

### Empty

- raramente vazio total
- mostrar zero com contexto quando necessário

### Error

- mostrar erro sem derrubar layout inteiro

---

## Listas

Exemplos:

- orders
- users
- pool
- pagamentos

### Loading

- skeleton de linhas
- manter estrutura da tabela

### Empty

- mensagem dentro da área da lista
- CTA opcional

### Error

- erro no bloco da lista
- botão retry

---

## Detalhes

Exemplos:

- detail panel
- order detail
- batch detail

### Loading

- skeleton de campos

### Empty

- só faz sentido se nada foi selecionado

### Error

- erro localizado no painel, não na app inteira

---

## Formulários

### Loading inicial

- campos skeleton ou bloqueados

### Saving

- botão com loading
- bloquear duplo submit

### Validation error

- erro no campo
- erro geral, se necessário

### Success

- toast
- feedback inline
- redirect, se fizer sentido

---

# 4. Estados de ação crítica

## Ações com motivo obrigatório

Exemplos:

- follow-up
- reject
- return-to-pool

### Estados esperados

- modal aberto
- validação de motivo
- submit em andamento
- sucesso com fechamento do modal
- erro sem perder o texto digitado

---

## Ações destrutivas

Exemplos:

- bloquear usuário
- rejeitar
- fechar lote
- pagar lote

### Regras

- exigir confirmação
- bloquear clique duplo
- mostrar consequência de forma clara

---

# 5. Estados de domínio importantes

## Order cancelada

### Regra

A UI deve deixar claro que não segue fluxo normal.

### Impacto

- não pode claim
- não pode submit
- não pode approve

---

## Order incompleta

### Regra

Quando a API retornar campos faltantes, a UI deve mostrar isso de forma útil.

### Deve exibir

- mensagem clara
- lista de campos ausentes, quando disponível

---

## Concorrência

Exemplo:

- outra pessoa assumiu a order antes
- status mudou durante aprovação

### Regra

A UI deve mostrar mensagem objetiva e atualizar os dados.

---

# 6. Estados de busca e filtro

## Buscando

- indicar que a lista está sendo filtrada
- evitar piscar tudo sem necessidade

## Sem resultado

- mostrar mensagem ligada ao filtro atual
- permitir limpar filtros facilmente

## Filtro aplicado

- deixar visível que há filtro ativo

---

# 7. Estados de navegação

## Primeira entrada na rota

- skeleton ou loading inicial

## Troca de item dentro da mesma tela

Exemplo:

- selecionar outra order no painel

### Regra

Não recarregar a página inteira sem necessidade.

---

# 8. Feedback global recomendado

## Toast

Usar para:

- salvar com sucesso
- atualizar com sucesso
- erro curto
- aviso curto

## Inline alert

Usar para:

- erro mais importante
- aviso contextual
- bloqueio de regra

## Modal

Usar para:

- confirmação
- motivo obrigatório
- ação crítica

---

# 9. Padrões de texto

## Mensagens devem ser

- curtas
- claras
- acionáveis

## Evitar

- texto técnico demais
- mensagem genérica tipo “erro desconhecido” sem contexto
- silêncio após ação

---

# 10. Regras gerais

## 1. Não deixar a interface muda

Se está carregando, mostrar.
Se deu erro, mostrar.
Se terminou, mostrar.

## 2. Não tratar vazio como erro

Lista vazia não significa sistema quebrado.

## 3. Não perder contexto do usuário

Se falhou ao salvar, não limpar formulário inteiro.

## 4. Não esconder erro de negócio

Se a API negou por regra, a UI deve refletir isso claramente.

---

# Objetivo final

Todo estado da interface deve parecer previsível.

O usuário pode até não gostar da resposta do sistema.
Mas ele deve sempre entender o que aconteceu.
