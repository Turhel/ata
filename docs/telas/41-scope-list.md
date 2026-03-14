# Lista de Escopos

## Objetivo

Permitir que usuários autorizados consultem escopos já criados, localizem rapidamente uma ordem e acompanhem o estado dos escopos no sistema.

---

## Rota

Sugestão:

- `/scopes`

> Se quiser manter compatibilidade com a ideia atual, pode existir uma rota inicial equivalente.
> Mas o nome plural faz mais sentido para listagem.

---

## Perfis com acesso

- assistant
- admin
- master
- inspector, com visualização limitada ao próprio fluxo

---

## Quando o usuário chega aqui

O usuário chega aqui:

- para localizar um escopo existente
- para conferir se um escopo já foi criado
- para abrir um escopo para edição ou visualização
- para o inspetor consultar o checklist da ordem

---

## Objetivo do usuário nesta tela

### Assistant

- encontrar escopos criados
- editar ou revisar
- localizar rapidamente por order code

### Inspector

- buscar escopo da inspeção
- abrir visualização simples do checklist

### Admin/Master

- acompanhar existência e qualidade dos escopos
- auditar ou localizar casos específicos

---

## Papel desta tela

Esta tela é a porta de entrada para consulta de escopos.

Ela existe para:

- evitar duplicação de escopos
- facilitar localização
- permitir reuso
- dar acesso operacional rápido ao inspetor

---

## Conteúdo principal

### 1. Busca principal

- por external order code
- por endereço
- por route point
- por tipo de escopo
- por data de criação

### 2. Lista de resultados

Campos úteis:

- código da ordem
- endereço resumido
- tipo do escopo
- criado por
- data de criação
- data de atualização
- status visual, se houver
- arquivado ou não

### 3. Ações por item

- abrir
- editar, se permitido
- visualizar
- arquivar, se permitido no futuro

---

## Regras de negócio que impactam a UX

- escopo pertence ao contexto da order
- inspetor visualiza, mas não edita
- assistant edita o que criou ou o que puder operar
- sistema deve deixar claro se o escopo está ativo ou arquivado
- visualização do inspetor deve ser mais limpa e direta

---

## Regras de visibilidade

### Assistant

- vê escopos do seu contexto operacional

### Inspector

- vê apenas consulta operacional relevante
- idealmente com UI simplificada

### Admin

- vê escopos operacionais para gestão

### Master

- vê todos

---

## Estados da tela

### Sem busca

- lista recente ou campo central de busca

### Sem resultados

- mensagem clara
- botão para gerar escopo, se fizer sentido para a role

### Loading

- feedback simples

### Erro

- erro com retry

---

## Dependências de backend

### Futuro mínimo

- listagem de escopos
- busca por order code
- detalhe do escopo
- filtro por arquivado/ativo

---

## Componentes principais

- barra de busca
- filtros simples
- tabela/lista de escopos
- ação de abrir

---

## Prioridade de implementação

Alta junto com o gerador.

Criar escopo sem conseguir localizar depois é basicamente produzir desordem com tecnologia, que é um clássico da humanidade.
