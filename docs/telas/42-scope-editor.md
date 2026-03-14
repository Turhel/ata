# Editor de Escopo

## Objetivo

Permitir que o assistant crie, edite e salve escopos operacionais de inspeção vinculados a uma ordem.

Este módulo substitui o processo manual antigo de organizar cômodos e itens fotografáveis.

---

## Rota

`/scopes/new`
`/scopes/:id`

---

## Status no projeto

Planejado.

Ainda não faz parte do núcleo implementado atual do novo portal.

---

## Perfis com acesso

- assistant
- admin ou master apenas se a política futura permitir intervenção
- inspector não edita

---

## Quando o usuário chega aqui

O assistant chega aqui:

- após precisar montar um escopo para uma ordem
- após receber solicitação operacional
- após abrir ordem que exige checklist de fotos
- para editar ou revisar escopo já salvo

---

## Objetivo do usuário nesta tela

- localizar a ordem relacionada
- preencher dados de contexto
- organizar categorias
- adicionar cômodos e subcômodos
- salvar escopo
- revisar antes de enviar ao inspetor
- arquivar quando necessário

---

## Conceito da tela

O escopo é um checklist estruturado de fotos e ambientes.

Ele não é apenas texto livre.Ele precisa ser:

- legível
- padronizado
- reaproveitável
- seguro
- fácil para o inspetor consultar depois

---

## Blocos principais

### 1. Identificação da ordem

- external order code
- vínculo com `orders.id`
- dados básicos da ordem, se encontrados
- endereço
- tipo de trabalho, se existir

### 2. Metadados do escopo

- kind
- loss reason
- route point
- visibility
- observações gerais, se necessário

### 3. Estrutura do escopo

- categorias
- itens por categoria
- ordenação visual
- subitens

### 4. Pré-visualização

- visual textual do escopo
- visual de checklist
- organização semelhante ao uso operacional real

### 5. Ações

- salvar
- salvar alterações
- cancelar
- arquivar
- duplicar no futuro, se fizer sentido

---

## Estrutura mínima esperada

### Entidade principal

`scopes`

### Itens

`scope_items`

### Relação central

Cada escopo pertence a uma ordem.

---

## Informações mínimas do escopo

- order id
- external id
- kind
- created by
- created at
- archived at, quando aplicável

## Informações mínimas dos itens

- scope id
- sort order
- area
- label
- notes
- required
- done apenas para uso interno do assistant, se mantido
- created at
- updated at

---

## Fluxo esperado

### Criar

1. assistant acessa a tela
2. informa o código da ordem ou abre a partir da própria order
3. o sistema tenta localizar dados básicos
4. assistant adiciona categorias
5. assistant adiciona itens
6. assistant revisa a prévia
7. salva

### Editar

1. assistant abre escopo já existente
2. altera estrutura ou metadados
3. revisa
4. salva novamente

### Arquivar

1. assistant ou admin abre escopo concluído
2. arquiva manualmente
3. sistema registra `archived_at`

---

## Regras de UX importantes

- o assistant deve conseguir montar o escopo sem sofrimento
- subitem precisa ser fácil de entender visualmente
- a tela deve priorizar velocidade operacional
- a prévia precisa ficar sempre visível ou fácil de alternar
- itens vazios não devem poluir o escopo salvo
- deve ficar claro o vínculo com a ordem

---

## Suporte a subcômodos

O sistema precisa suportar itens hierárquicos como:

- quarto
- closet do quarto
- retreat
- pantry
- linen closet

A UX deve permitir isso de forma clara, sem exigir gambiarra do usuário.

Pode existir:

- botão de adicionar subitem
  ou
- estrutura de indentação simples no editor

---

## Regras de visibilidade

### Assistant

- cria
- edita
- organiza
- arquiva

### Inspector

- não edita
- só visualiza a versão pronta
- usa checklist local em tela própria

### Admin/Master

- leitura
- eventual intervenção administrativa no futuro

---

## Regras de negócio que impactam a UX

- escopo pertence a uma ordem
- nem toda ordem precisa ter escopo
- escopo pode ter tipos como `default`, `partial`, `follow-up`
- checklist do inspetor não deve alterar a estrutura salva
- observações do inspetor não fazem parte desta tela no primeiro momento
- arquivamento precisa ser explícito ou claramente automatizado

---

## Estados da tela

### Loading

- carregamento do escopo
- carregamento dos dados da ordem

### Escopo inexistente

- para `/scopes/:id`, mostrar erro claro

### Ordem não encontrada

- ao buscar por código, informar ausência de ordem

### Vazio inicial

- tela pronta para novo escopo

### Erro ao salvar

- mensagem clara
- manter conteúdo digitado

### Sucesso ao salvar

- feedback claro
- permitir seguir editando ou voltar para listagem

---

## Dependências de backend

### Futuras

- `GET /scopes`
- `GET /scopes/:id`
- `POST /scopes`
- `PATCH /scopes/:id`
- `POST /scopes/:id/archive`
- `GET /orders/:id`
- busca por order via código externo, se necessário

---

## Componentes principais

- busca de ordem
- formulário de metadados
- editor de categorias
- editor de itens
- ordenação simples
- prévia formatada
- botões de salvar e arquivar

---

## Prioridade de implementação

Média para alta.

É um módulo importante do legado e tem valor operacional claro, mas depende da consolidação mínima da camada de orders.

---

## Observações

Este editor não deve nascer como construtor genérico demais.

A primeira versão deve ser:

- simples
- rápida
- fortemente orientada ao uso real do assistant
- pronta para gerar uma visualização limpa para o inspetor depois

O foco não é criar um “page builder”.
O foco é criar um escopo operacional útil.
