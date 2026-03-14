# Visualização de Escopo para Inspetor

## Objetivo

Permitir que o inspetor consulte um escopo pronto e utilize um checklist visual local durante a inspeção, sem alterar os dados salvos no sistema.

Esta tela é focada em execução de campo, não em edição.

---

## Rota

Sugestão principal:
`/scopes/:id`

Possível rota dedicada no futuro:
`/inspector/scopes/:id`

---

## Perfis com acesso

- inspector
- assistant em leitura
- admin
- master

---

## Quando o usuário chega aqui

O usuário chega aqui:

- após localizar uma ordem/escopo que vai inspecionar
- a partir de busca por código externo
- a partir de dashboard futuro do inspetor
- a partir de link interno autenticado

---

## Objetivo do usuário nesta tela

### Inspector

- entender o que precisa fotografar
- seguir o checklist
- não esquecer cômodos e subcômodos
- consultar contexto da ordem

### Assistant/Admin

- revisar como o escopo está sendo apresentado
- conferir se o conteúdo está completo

---

## Papel desta tela

Esta tela não é editor.

Ela existe para:

- exibir o escopo pronto
- facilitar a inspeção
- reduzir erro operacional
- substituir anotação improvisada e checklist informal

---

## Conteúdo principal

### 1. Cabeçalho do escopo

- external order code
- endereço
- loss reason, se houver
- route point, se houver
- kind do escopo, se relevante

### 2. Checklist organizado

- categorias como EXTERIOR e INTERIOR
- itens em ordem
- subitens visivelmente aninhados

### 3. Estado visual local

- checkbox local
- strike-through visual
- contador local de progresso, opcional

### 4. Informações auxiliares

- observações gerais
- aviso de que os checks são locais e não persistidos

---

## Comportamento principal

- o inspetor abre o escopo
- lê categorias e itens
- marca localmente o que já executou
- fecha a tela sem alterar o banco
- ao reabrir, no MVP, o estado pode voltar zerado

---

## Regras de visibilidade

### Inspector

- leitura do escopo
- interação local com checklist
- sem edição estrutural

### Assistant

- leitura
- pode usar a tela para conferir o escopo pronto

### Admin/Master

- leitura e auditoria

---

## Regras de negócio que impactam a UX

- o inspetor não edita o escopo salvo
- o checklist interativo do inspetor não persiste no banco
- o escopo é preparado pelo assistant
- se não existir escopo, a tela deve informar isso claramente
- se houver acesso restrito, o inspetor só vê o que estiver autorizado

---

## Estrutura visual desejada

### Topo

- código da ordem
- endereço
- informações contextuais

### Corpo

- categorias destacadas
- lista de itens
- subitens indentados

### Rodapé ou bloco lateral

- aviso sobre marcação local
- progresso local opcional

---

## Estados da tela

### Loading

- skeleton do cabeçalho
- skeleton da lista de itens

### Escopo inexistente

- mensagem clara: escopo não encontrado

### Sem permissão

- acesso negado claro

### Escopo vazio

- mensagem indicando que o escopo ainda não foi preenchido

### Erro

- erro de carregamento com retry

---

## Dependências de backend

### Futuras

- `GET /scopes/:id`
- busca de escopo por order code, se desejado
- eventual endpoint de listagem do inspetor

---

## Componentes principais

- cabeçalho de contexto
- bloco de checklist
- itens com checkbox local
- agrupadores de categoria
- subitens indentados

---

## Prioridade de implementação

Média.

Tem muito valor operacional, mas depende do módulo de escopos existir primeiro.

---

## Observações

A primeira versão deve ser:

- limpa
- legível em celular
- rápida
- sem excesso de controles

O inspetor precisa de clareza, não de um cockpit da NASA montado no meio da calçada.
