# UX Geral do ATA Portal

## Objetivo

Definir princípios gerais de experiência do usuário para o frontend do ATA Portal.

Este documento serve para:

- manter coerência entre telas
- orientar decisões de interface
- reduzir ruído visual
- reforçar o fluxo real de trabalho
- evitar que o sistema fique bonito e cansativo ao mesmo tempo

---

## Princípio central

O ATA Portal é um sistema operacional interno.

A UX precisa priorizar:

- clareza
- velocidade
- previsibilidade
- baixa fricção
- confiança

Não é um produto de marketing.
Não precisa impressionar.
Precisa funcionar bem para quem usa o dia inteiro.

---

## Objetivos da experiência

A interface deve ajudar o usuário a:

- entender rapidamente onde está
- saber o que precisa fazer agora
- executar a ação principal sem procurar demais
- identificar bloqueios e pendências
- confiar que o sistema registrou corretamente o que aconteceu

---

## Perfil de uso esperado

O sistema será usado por pessoas:

- sob pressão operacional
- repetindo tarefas muitas vezes por dia
- consultando listas e detalhes com frequência
- alternando entre revisão, execução e conferência
- usando desktop na maior parte do tempo
- eventualmente usando mobile em contexto mais limitado

---

# 1. Princípios de UX

## 1. Clareza antes de sofisticação

Toda tela deve ser fácil de entender em poucos segundos.

### Regra

O usuário precisa reconhecer:

- a função da tela
- a ação principal
- o estado atual dos dados

---

## 2. Ação principal evidente

Cada tela deve ter uma ação principal clara.

### Exemplos

- tela de approval → aprovar, pedir follow-up ou rejeitar
- tela de pool import → importar arquivo
- tela de scopes → gerar ou revisar escopo
- tela de orders → localizar, abrir, agir

### Regra

Não esconder ação crítica em submenu desnecessário.

---

## 3. Fluxo acima de decoração

A interface deve refletir o fluxo operacional real.

### Consequência

- etapas diferentes devem parecer etapas diferentes
- contextos críticos devem ter destaque
- dados periféricos não devem competir com o essencial

---

## 4. Consistência reduz custo cognitivo

O mesmo padrão deve se repetir sempre que possível.

### Exemplos

- mesmo status = mesma cor e mesmo label
- mesma ação = mesma posição e mesmo texto
- mesma estrutura de lista = mesmo padrão de filtro e detalhe

---

## 5. Menos atrito, mais ritmo

Usuário operacional não deve lutar com a interface para concluir ação simples.

### Evitar

- passos demais
- modal para tudo
- excesso de confirmação onde não precisa
- navegação rebuscada

---

## 6. Erro precisa ser compreensível

Quando algo falhar, o sistema deve explicar o suficiente para o usuário agir.

### Regra

Toda mensagem de erro deve tentar responder:

- o que falhou
- por que falhou
- o que fazer agora

---

# 2. Estrutura geral de tela

## Estrutura recomendada

1. título da tela
2. contexto curto
3. ação principal
4. filtros ou resumo, quando fizer sentido
5. conteúdo principal
6. detalhe contextual ou ações secundárias

---

## Hierarquia visual

### Prioridade alta

- título
- status
- ação principal
- item selecionado
- alerta importante

### Prioridade média

- filtros
- métricas
- contexto adicional

### Prioridade baixa

- texto auxiliar
- metadata secundária
- detalhes históricos

---

# 3. Navegação

## Objetivo

Fazer o usuário se movimentar pelo sistema sem precisar “descobrir” a arquitetura toda vez.

---

## Regras de navegação

### 1. Sidebar é navegação principal

A sidebar deve organizar o sistema por papel e trabalho real.

### 2. Tela deve deixar claro onde o usuário está

Usar:

- item ativo
- título claro
- breadcrumb quando necessário

### 3. Detalhe não precisa virar item fixo de menu

Detalhes devem ser contextuais.

### 4. Role não deve ver menu inútil

Menu errado gera insegurança e ruído.

---

# 4. Padrões de página

## Dashboard

### Objetivo

Responder:

- o que está acontecendo
- o que exige atenção
- para onde ir agora

### Regra

Dashboard não substitui a tela operacional.
Ele aponta para ela.

---

## Lista

### Objetivo

Permitir localizar, comparar e agir.

### Regra

Lista precisa ser:

- filtrável
- legível
- acionável

---

## Detalhe

### Objetivo

Mostrar contexto suficiente para decisão.

### Regra

Detalhe deve priorizar:

- status atual
- dados essenciais
- histórico relevante
- ações possíveis

---

## Formulário

### Objetivo

Permitir entrada e edição sem fricção desnecessária.

### Regra

O usuário deve sempre saber:

- o que é obrigatório
- o que está errado
- se o envio está acontecendo
- se o envio deu certo

---

# 5. Priorização por role

## Assistant

### O que mais importa

- ordens dele
- pendências
- follow-ups
- envio
- escopos
- pagamento próprio

### A UX deve transmitir

“o que eu preciso fazer agora?”

---

## Inspector

### O que mais importa

- encontrar escopo
- visualizar checklist
- consultar informação útil rapidamente

### A UX deve transmitir

“como chego logo no que preciso em campo?”

---

## Admin

### O que mais importa

- fila de revisão
- pool
- follow-ups
- pagamento
- performance da equipe

### A UX deve transmitir

“onde está o gargalo e qual decisão tomo agora?”

---

## Master

### O que mais importa

- estrutura
- times
- usuários
- tipos
- pricing
- visão global

### A UX deve transmitir

“o sistema está organizado e saudável?”

---

# 6. Conteúdo e linguagem

## Regra geral

A linguagem da interface deve ser:

- simples
- direta
- consistente
- operacional

---

## Preferir

- “Aprovar”
- “Rejeitar”
- “Pedir follow-up”
- “Devolver ao pool”
- “Importar pool”
- “Salvar”
- “Atualizar”

---

## Evitar

- texto excessivamente técnico
- rótulos ambíguos
- termos diferentes para a mesma coisa
- frases longas em botão

---

# 7. Feedback do sistema

## Feedback esperado em toda ação relevante

### Antes

Usuário sabe o que vai acontecer.

### Durante

Usuário vê que está acontecendo.

### Depois

Usuário entende o resultado.

---

## Exemplos

### Sucesso

- toast curto
- lista atualizada
- status alterado visivelmente

### Erro

- mensagem clara
- contexto preservado
- opção de tentar de novo

### Bloqueio por regra

- mensagem explícita
- motivo compreensível
- dados mantidos

---

# 8. Densidade de informação

## Regra

O sistema pode ser denso, mas não confuso.

### Consequência

- mostrar bastante informação quando necessário
- organizar por blocos
- evitar paredes de texto
- usar espaçamento para separar contexto

---

## Bom uso de densidade

- tabela com colunas úteis
- painel de detalhe ao lado
- cards de métrica compactos

## Mau uso de densidade

- tudo gritado ao mesmo tempo
- label demais
- status demais
- excesso de caixa, borda e cor

---

# 9. Ritmo de interação

## Regra

A UI deve responder rápido e parecer estável.

### Evitar

- tela piscando inteira ao filtrar
- loading global para ação pequena
- perda de scroll sem necessidade
- refresh bruto de tudo ao mudar um item

---

# 10. Evolução de UX

## Ordem recomendada

1. funcionamento correto
2. clareza da navegação
3. consistência de estados
4. refinamento visual
5. melhoria de velocidade percebida
6. microdetalhes visuais

---

## Regra importante

Não polir cedo demais o que ainda não está funcionalmente estável.

Interface elegante em fluxo ruim só mascara problema.

---

# 11. Critérios de qualidade de UX

Uma tela está boa quando:

- o usuário entende rápido o propósito
- a ação principal está clara
- erros são compreensíveis
- status são consistentes
- a role certa vê a coisa certa
- a API e a UI contam a mesma história

---

# Objetivo final

O ATA Portal deve parecer um sistema de trabalho sério, claro e confiável.

Não precisa parecer futurista.
Precisa parecer que respeita o tempo e a atenção de quem opera.
