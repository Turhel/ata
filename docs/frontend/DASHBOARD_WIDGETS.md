# Dashboard Widgets

## Objetivo

Definir os widgets-padrão dos dashboards do ATA Portal para:

- padronizar indicadores
- evitar dashboard feito no improviso
- alinhar cada role ao que realmente precisa ver
- impedir excesso de gráfico inútil

Dashboard não existe para enfeitar.
Ele existe para ajudar decisão e priorização.

---

## Princípios gerais

### 1. Widget precisa responder uma pergunta real

Exemplos:

- quantas orders preciso revisar hoje?
- quantas ordens eu enviei hoje?
- quantos follow-ups estão pendentes?
- quantos usuários aguardam aprovação?

### 2. Menos widgets, mais utilidade

Melhor 6 cards úteis do que 17 blocos que ninguém lê.

### 3. Priorizar ação

Sempre que possível, o widget deve levar o usuário para a tela correspondente.

### 4. Começar simples

Primeira versão:

- métricas
- listas curtas
- alertas
- gráficos básicos, só quando fizer sentido

---

# Tipos de widget

## 1. Metric Widget

### Objetivo

Mostrar um número-chave com contexto curto.

### Estrutura

- valor
- label
- subtítulo opcional
- variação opcional
- CTA opcional

### Exemplos

- Orders disponíveis hoje
- Submetidas hoje
- Follow-ups pendentes
- Usuários pending
- Lotes abertos

### Melhor uso

Indicadores de alto impacto e leitura rápida.

---

## 2. Queue Widget

### Objetivo

Mostrar filas operacionais.

### Estrutura

- título
- contador
- lista curta de itens
- CTA “ver tudo”

### Exemplos

- Orders aguardando revisão
- Orders em follow-up
- Orders disponíveis
- Usuários aguardando aprovação

### Melhor uso

Quando o usuário precisa ir do número para a ação.

---

## 3. Alert Widget

### Objetivo

Chamar atenção para algo crítico ou fora do normal.

### Estrutura

- título curto
- mensagem objetiva
- severidade
- ação recomendada

### Exemplos

- Lote com erro
- Orders canceladas no fluxo ativo
- Follow-ups antigos
- Importações com falha
- Usuário bloqueado tentando operar

### Melhor uso

Poucos alertas, bem relevantes.

---

## 4. Trend Widget

### Objetivo

Mostrar tendência ao longo do tempo.

### Estrutura

- mini gráfico ou linha simples
- período
- valor atual
- comparação com período anterior

### Exemplos

- Aprovações por dia
- Submits por semana
- Follow-ups por mês
- Volume importado por período

### Melhor uso

Admin e master.
Não é prioridade para inspector.

---

## 5. Breakdown Widget

### Objetivo

Mostrar composição por categoria.

### Estrutura

- título
- grupos
- valores ou percentuais

### Exemplos

- Orders por status
- Usuários por status
- Lotes por status
- Orders por assistant
- Orders por work type

### Melhor uso

Quando a distribuição importa mais que o total bruto.

---

## 6. Recent Activity Widget

### Objetivo

Mostrar atividade recente relevante.

### Estrutura

- lista curta
- tipo de evento
- autor
- data/hora
- link opcional

### Exemplos

- últimas aprovações
- últimos batches importados
- últimos usuários aprovados
- últimas ações críticas

### Melhor uso

Admin e master.

---

## 7. Personal Summary Widget

### Objetivo

Resumo direto do que importa para o usuário logado.

### Estrutura

- números pessoais
- pendências próprias
- visão do dia/semana

### Exemplos

- minhas orders em andamento
- meus follow-ups
- meus pagamentos da semana
- meus envios do dia

### Melhor uso

Assistant e inspector.

---

# Dashboard por role

# 1. Assistant

## Objetivo do dashboard

Ajudar o assistant a entender:

- o que ele precisa fazer agora
- o que está pendente
- o que já foi enviado
- o que voltou em follow-up

## Widgets recomendados

### Prioridade alta

- Minhas orders em andamento
- Orders disponíveis
- Follow-ups pendentes
- Enviadas hoje
- Due/available de hoje
- Atalho para Inserção
- Atalho para Scopes

### Prioridade média

- Enviadas na semana
- Aprovadas na semana
- Rejeitadas na semana
- Pagamento atual estimado, quando existir

### Evitar no começo

- gráfico complexo
- comparações demais
- dashboard de performance exagerado

---

# 2. Inspector

## Objetivo do dashboard

Ajudar o inspector a chegar rápido no que precisa consultar.

## Widgets recomendados

### Prioridade alta

- Buscar escopo
- Últimos escopos consultados
- Pagamento atual, quando existir
- Manuais principais

### Prioridade média

- rota atual, quando módulo existir
- ordens ligadas à sua atuação, quando essa visão existir

### Evitar no começo

- gráfico
- performance detalhada
- qualquer coisa administrativa

---

# 3. Admin

## Objetivo do dashboard

Dar visão operacional da fila e do time.

## Widgets recomendados

### Prioridade alta

- Orders aguardando revisão
- Follow-ups abertos
- Rejeitadas aguardando retorno ao pool
- Orders aprovadas hoje
- Importações recentes
- Usuários pending
- Lote aberto atual, se existir

### Prioridade média

- Submits por dia/semana
- Aprovações por assistant
- Follow-up rate
- Duplicatas em aberto

### Widgets de ação rápida

- Ir para Aprovações
- Importar Pool
- Ver Performance
- Abrir Pagamentos

---

# 4. Master

## Objetivo do dashboard

Dar visão global de estrutura, operação e gargalos.

## Widgets recomendados

### Prioridade alta

- Usuários pending
- Times sem vínculo correto
- Orders aguardando revisão
- Lotes abertos
- Tipos sem pricing
- Importações com erro

### Prioridade média

- Performance por admin
- Volume semanal
- Status geral das orders
- Crescimento de usuários

### Widgets de ação rápida

- Gerenciar times
- Aprovar usuários
- Ajustar tipos
- Ver performance global

---

# Estrutura recomendada de dashboard

## Linha 1

Métricas principais

## Linha 2

Filas e alertas

## Linha 3

Tendência ou atividade recente

## Linha 4

Atalhos operacionais ou listas complementares

---

# Regras visuais

## 1. Cards principais primeiro

Os números centrais devem aparecer acima da dobra.

## 2. Alertas com parcimônia

Se tudo é alerta, nada é alerta.

## 3. Gráfico só com pergunta clara

Não colocar gráfico porque “dashboard precisa ter gráfico”.

## 4. Click-through útil

O widget deve abrir a tela correspondente quando isso fizer sentido.

---

# Padrões de interação

## Clique em metric widget

Pode levar para lista filtrada.

### Exemplo

“Follow-ups pendentes” → `/orders?status=follow_up`

## Clique em queue widget

Vai para a tela operacional correspondente.

### Exemplo

“Aguardando revisão” → `/approval`

## Clique em alerta

Vai para o problema ou abre detalhe.

---

# Estados dos widgets

## Loading

- skeleton do card
- placeholder simples

## Empty

- valor zero com contexto
- ou mensagem curta

## Error

- mensagem pequena
- retry, se fizer sentido

---

# Widgets prioritários para primeira versão

## Assistant

- minhas orders em andamento
- follow-ups pendentes
- enviadas hoje
- orders disponíveis

## Inspector

- buscar escopo
- últimos escopos
- manuais

## Admin

- aguardando revisão
- follow-ups
- aprovações do dia
- usuários pending
- imports recentes

## Master

- usuários pending
- times
- tipos sem pricing
- imports com erro
- lotes abertos

---

# O que evitar

- gráfico de pizza para tudo
- card redundante com o mesmo número em lugares diferentes
- widget sem ação ou sem leitura clara
- dashboard gigante que parece cockpit de avião quebrado

---

# Objetivo final

Cada dashboard deve responder rapidamente:

- o que está acontecendo
- o que precisa de atenção
- para onde o usuário deve ir agora
