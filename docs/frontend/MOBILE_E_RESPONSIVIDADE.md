# Mobile e Responsividade

## Objetivo

Definir como o frontend do ATA Portal deve se comportar em diferentes tamanhos de tela.

Este documento existe para:

- evitar quebra de layout
- impedir tabela ilegível no celular
- decidir o que precisa funcionar bem em mobile
- separar o que é desktop-first do que é realmente mobile-useful

---

## Princípio central

O ATA Portal é principalmente desktop-first.

Mas isso não significa ignorar mobile.

Significa:

- desktop é o ambiente principal de operação pesada
- mobile deve funcionar bem para uso rápido e focado
- nem toda tela precisa ter a mesma profundidade em telas pequenas

---

# 1. Estratégia geral

## Desktop-first com responsividade real

### Desktop

Ambiente principal para:

- revisão administrativa
- tabelas densas
- importações
- gestão estrutural
- pricing
- performance detalhada

### Mobile

Ambiente útil para:

- consulta rápida
- escopos do inspetor
- dashboard simples
- pagamentos pessoais
- leitura de detalhes
- ações pontuais

---

## Regra

Não tentar forçar todas as telas complexas a parecerem confortáveis no celular do mesmo jeito que no desktop.

Isso quase sempre termina num crime visual.

---

# 2. Prioridade por role em mobile

## Assistant

### Deve funcionar bem

- dashboard simples
- lista resumida de orders
- detalhe da order
- follow-ups
- escopos, quando necessário
- pagamentos pessoais

### Pode ser mais limitado

- inserção pesada
- edição muito longa

---

## Inspector

### Deve funcionar muito bem

- busca de escopo
- visualização do checklist
- consulta rápida de informações
- manuais

### Esse é o caso mais importante de mobile real.

---

## Admin

### Deve funcionar de forma aceitável

- dashboard resumido
- fila de approval básica
- detalhe da order
- ações pontuais

### Não é prioridade máxima em mobile

- importação de pool
- tabelas muito densas
- gestão pesada

---

## Master

### Mobile pode existir, mas não é foco

A maior parte do trabalho estrutural do master é melhor em desktop.

---

# 3. Layout responsivo

## Desktop

### Estrutura

- sidebar fixa ou colapsável
- topbar
- conteúdo com múltiplas colunas quando fizer sentido
- tabelas
- painéis laterais

---

## Tablet

### Estrutura

- sidebar colapsável
- conteúdo mais espaçado
- alguns layouts de 2 colunas ainda possíveis

---

## Mobile

### Estrutura

- sidebar vira drawer
- uma coluna principal
- cards em vez de tabela, quando necessário
- detalhe abaixo ou em tela própria
- ações mais simples e diretas

---

# 4. Navegação em mobile

## Regras

### 1. Menu lateral vira drawer

Abrir e fechar com clareza.

### 2. Título da tela continua visível

Usuário precisa saber onde está.

### 3. Ações críticas não devem sumir

Se a ação importa, ela precisa continuar alcançável.

### 4. Evitar hover-dependência

Em mobile não existe mouse.
Parece óbvio, mas humanos adoram esquecer.

---

# 5. Tabelas em mobile

## Regra principal

Tabela densa não deve ser simplesmente espremida.

### Estratégias permitidas

- transformar em cards
- esconder colunas secundárias
- usar detalhe ao tocar
- usar accordions leves

---

## Quando virar card

- orders
- users
- pagamentos
- manuais
- escopos

## Quando ainda pode manter tabela leve

- listas muito simples com poucas colunas

---

# 6. Formulários em mobile

## Regras

### 1. Uma coluna

Em mobile, quase sempre uma coluna é melhor.

### 2. Labels claras

Nada de placeholder tentando fazer papel de label.

### 3. Ações acessíveis

Botão principal visível e tocável.

### 4. Campos longos

Usar textarea ou campo expandido quando necessário.

---

## Cuidado especial com

- modais cheios demais
- formulário longo sem seções
- botões pequenos
- datas difíceis de selecionar

---

# 7. Componentes que precisam de atenção em mobile

## Approval panel

### Regra

No mobile, pode virar:

- tela dedicada
  ou
- seção empilhada abaixo do detalhe

---

## Scope checklist

### Regra

Precisa ser muito confortável em toque.

### Exigir

- área clicável grande
- contraste claro
- leitura fácil
- itens bem espaçados

---

## Dashboard widgets

### Regra

Empilhar verticalmente.

### Evitar

- 4 cards minúsculos na mesma linha
- gráfico ilegível

---

# 8. Breakpoints conceituais

## Sugestão

### Mobile

até ~767px

### Tablet

~768px até ~1023px

### Desktop

1024px ou mais

### Wide desktop

1280px ou mais

---

## Regra

Os breakpoints podem mudar na implementação, mas a lógica deve permanecer.

---

# 9. O que é obrigatório funcionar bem em mobile

## Alta prioridade

- login
- welcome
- dashboard simples
- scopes do inspetor
- pagamentos pessoais
- leitura de detalhe
- manuais
- configurações básicas

## Média prioridade

- lista simples de orders
- actions pontuais do assistant
- approval básico

## Baixa prioridade inicial

- importação de pool
- gestão master
- pricing
- tabelas grandes
- performance detalhada

---

# 10. O que não fazer

- usar tabela full desktop espremida
- esconder ação crítica em menu minúsculo
- depender de hover
- usar texto pequeno demais
- colocar botões colados
- transformar tudo em modal no celular

---

# 11. Testes de responsividade recomendados

## Sempre verificar

- login
- sidebar/drawer
- order list
- order detail
- scopes do inspetor
- approval básico
- pagamento pessoal

## Cenários mínimos

- celular comum
- tablet vertical
- notebook
- monitor maior

---

# 12. Critério de qualidade

Uma tela está responsiva quando:

- continua legível
- continua navegável
- continua acionável
- não exige zoom manual
- não perde a ação principal

---

# Objetivo final

O sistema não precisa ser “mobile-first”.

Mas precisa ser “mobile-decente” onde isso importa de verdade.

Especialmente para o inspetor e para consultas rápidas.
