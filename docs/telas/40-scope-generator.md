# Gerador de Escopo

## Objetivo
## ReferÃªncia visual do site antigo

- Fonte visual principal: `docs/telas/.old_site/src/pages/dashboard/ScopeGenerator.tsx`
- A tela nova deve herdar a estrutura em duas Ã¡reas do gerador antigo: formulÃ¡rio operacional + prÃ©via/saÃ­da
- Ajustes devem ser restritos a bugs, nomenclatura e integraÃ§Ã£o com os dados atuais do projeto


Permitir que o assistant gere, edite e salve escopos de inspeção a partir da ordem e do material recebido.

O foco é transformar informação bruta em checklist operacional claro para uso interno e visualização pelo inspetor.

---

## Rota

`/scope`

---

## Perfis com acesso

- assistant
- admin, em caso de intervenção operacional
- master, para auditoria ou suporte

---

## Quando o usuário chega aqui

O usuário chega aqui:

- quando precisa montar um escopo novo
- quando precisa editar um escopo existente
- quando precisa revisar um escopo antes de salvar
- quando precisa corrigir um escopo após follow-up operacional

---

## Objetivo do usuário nesta tela

- localizar a ordem
- preencher os dados básicos do escopo
- listar ambientes e itens
- organizar interior/exterior
- gerar estrutura clara para inspeção
- salvar escopo de forma reutilizável

---

## Papel desta tela

Esta tela não é um editor genérico sem contexto.

Ela existe para:

- padronizar geração de escopos
- reduzir erro manual
- manter rastreabilidade
- servir de base para o inspetor consultar depois

---

## Conteúdo principal

### 1. Busca da ordem

- busca por `external_order_code`
- leitura do endereço e contexto básico
- indicação se já existe escopo salvo

### 2. Cabeçalho do escopo

Campos esperados:

- código externo
- endereço
- loss reason
- route point
- tipo do escopo
- visibilidade
- observações gerais, se necessário

### 3. Estrutura do escopo

- categorias
- itens do checklist
- ordenação
- suporte a sub-itens
- separação visual entre interior e exterior

### 4. Prévia textual

- renderização legível do escopo
- formato próximo do uso operacional real
- ajuda visual para conferir se o escopo faz sentido

### 5. Ações

- salvar
- atualizar
- limpar rascunho local
- eventualmente duplicar escopo no futuro

---

## Regras de negócio que impactam a UX

- assistant cria e edita escopos
- inspetor não edita conteúdo salvo
- escopo deve estar vinculado a uma order
- checklist salvo deve ser padronizado
- marcações do inspetor não devem sobrescrever o escopo salvo
- categorias e sub-itens precisam ser claros na visualização

---

## Fluxo esperado

### Criar escopo novo

1. usuário busca a ordem
2. sistema preenche contexto básico disponível
3. usuário monta categorias e itens
4. revisa a prévia
5. salva

### Editar escopo existente

1. usuário busca ordem ou escopo existente
2. sistema carrega conteúdo salvo
3. usuário ajusta
4. salva nova versão ou atualização

---

## Regras de visibilidade

### Assistant

- acesso principal
- cria e edita

### Admin

- acesso de suporte/intervenção

### Master

- acesso de auditoria

### Inspector

- não acessa esta tela de edição

---

## Estados da tela

### Vazio inicial

- busca da ordem
- orientação curta

### Escopo carregado

- formulário preenchido
- lista editável
- prévia disponível

### Sem escopo existente

- opção clara de iniciar novo

### Loading

- feedback durante busca e salvamento

### Erro

- mensagem clara
- não apagar tudo desnecessariamente

---

## Dependências de backend

### Futuro mínimo

- leitura da order
- leitura de escopo por order
- criação de escopo
- atualização de escopo
- listagem dos itens do escopo

---

## Componentes principais

- campo de busca
- formulário de cabeçalho
- editor de categorias/itens
- prévia textual
- botões de salvar/atualizar

---

## Prioridade de implementação

Alta.

O escopo faz parte do trabalho real. Sem ele, o sistema perde uma peça operacional que já existia no processo antigo e que claramente não era enfeite.

---

## Observações

A primeira versão não precisa ser bonita.
Ela precisa ser rápida, legível e confiável.

Se gerar escopo virar uma experiência irritante, o usuário volta a fazer no braço e o sistema perde a briga em dois dias.
