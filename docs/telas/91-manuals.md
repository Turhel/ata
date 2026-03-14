# Manuais

## Objetivo

Centralizar documentos, instruções e materiais de apoio para uso do sistema e da operação.

A ideia é reduzir dependência de explicação repetida por mensagem, áudio e tradição oral confusa.

---

## Rota

`/manuals`

---

## Perfis com acesso

- assistant
- inspector
- admin
- master

Com conteúdo filtrado por perfil, quando necessário.

---

## Quando o usuário chega aqui

O usuário chega aqui:

- quando precisa aprender um fluxo
- quando esqueceu um procedimento
- quando quer baixar um material de apoio
- quando está sendo treinado

---

## Objetivo do usuário nesta tela

- encontrar rápido o manual certo
- baixar ou abrir instruções
- consultar processo operacional
- reduzir erro por falta de orientação

---

## Papel desta tela

Esta tela é a biblioteca operacional do sistema.

Ela existe para:

- concentrar conhecimento
- reduzir suporte repetitivo
- acelerar onboarding
- padronizar execução

---

## Conteúdo principal

### 1. Categorias

Sugestões:

- Assistente
- Inspetor
- Admin
- Master
- Operação
- Financeiro
- Escopos
- Pool
- Aprovação
- Pagamentos

### 2. Lista de manuais

Campos úteis:

- título
- descrição curta
- público-alvo
- data de atualização
- formato
- ação de abrir/baixar

### 3. Destaques

- manuais mais usados
- materiais obrigatórios para onboarding
- atualizações recentes

### 4. Busca

- por palavra-chave
- por categoria
- por perfil

---

## Regras de negócio que impactam a UX

- certos materiais podem ser visíveis só para roles específicas
- manuais devem ser fáceis de encontrar
- busca precisa ser simples e óbvia
- a tela deve evitar excesso de texto sem estrutura

---

## Regras de visibilidade

### Assistant

- vê materiais do seu contexto

### Inspector

- vê materiais do seu contexto

### Admin

- vê materiais operacionais e administrativos

### Master

- vê tudo

---

## Estrutura visual sugerida

### Versão inicial

- cards ou lista simples por categoria
- busca no topo
- blocos de destaque

### Evolução futura

- favoritos
- histórico de leitura
- indicação de material obrigatório
- checklist de onboarding

---

## Estados da tela

### Sem materiais

- mensagem clara

### Loading

- skeleton da lista

### Erro

- mensagem com retry

### Sem resultado na busca

- mensagem mantendo filtros ativos

---

## Dependências de backend

### Primeira versão pode até ser estática

- lista controlada no frontend ou via arquivo simples

### Futuro desejável

- endpoint de listagem de materiais
- filtros por role/categoria
- controle de atualização
- upload/gestão de materiais por admin/master

---

## Componentes principais

- campo de busca
- filtros por categoria
- lista/cards de materiais
- badges por perfil
- botão de abrir/baixar

---

## Prioridade de implementação

Média.

Não é o motor do sistema, mas melhora muito onboarding e reduz a bagunça operacional. Toda equipe acha que “já sabe” até esquecer um detalhe e produzir uma pequena tragédia perfeitamente evitável.

---

## Observações

A primeira versão pode ser extremamente simples:

- uma lista organizada
- busca
- categoria
- link para abrir/baixar

Melhor um manual fácil de achar do que vinte PDFs enterrados em pasta obscura com nome final_v2_agora_vai.
