# Inserção de Ordens

## Objetivo

Permitir ao assistant inserir ou registrar ordens operacionalmente a partir do fluxo de trabalho real, antes do envio para revisão.

Esta tela existe para o trabalho manual que não nasce exclusivamente do pool e para edição estruturada do que o assistant está preparando.

---

## Rota

`/orders/insert`

---

## Perfis com acesso

- assistant
- admin, se houver uso administrativo excepcional
- master, para auditoria ou intervenção

---

## Quando o usuário chega aqui

O usuário chega aqui:

- quando precisa registrar ordem manualmente
- quando está montando lote de trabalho operacional
- quando precisa completar dados antes do submit
- quando precisa transformar informação bruta em ordem utilizável

---

## Objetivo do usuário nesta tela

- localizar ou iniciar uma ordem
- preencher dados operacionais essenciais
- preparar ordem para revisão
- reduzir erro antes do submit

---

## Papel desta tela

Esta tela não é um cadastro genérico sem regra.

Ela existe para:

- apoiar o trabalho do assistant
- garantir consistência mínima antes do submit
- reduzir erro de revisão
- servir como preparação operacional

---

## Conteúdo principal

### 1. Busca inicial

- buscar por external order code
- detectar se a ordem já existe
- decidir se vai continuar editando uma existente ou iniciar manualmente

### 2. Formulário principal

Campos esperados:

- external order code
- endereço
- cidade
- estado
- zip code
- resident name
- work type
- inspector account, quando aplicável
- flags operacionais mínimas
- observações, se houver no futuro

### 3. Contexto da ordem

- source status
- status interno
- assistant responsável
- datas relevantes

### 4. Ações

- salvar rascunho operacional
- continuar depois
- enviar para revisão, se tudo estiver válido

---

## Fluxo esperado

### Caso 1: ordem já existe

1. usuário busca pelo código
2. sistema encontra a ordem
3. abre a ordem para edição permitida
4. usuário completa dados
5. salva ou envia

### Caso 2: ordem não existe

1. usuário busca pelo código
2. sistema informa que não encontrou
3. usuário inicia inserção manual
4. preenche o mínimo
5. salva ordem em estado apropriado

---

## Regras de negócio que impactam a UX

- assistant só deve editar campos operacionais permitidos
- submit exige dados mínimos
- ordem cancelada não pode seguir fluxo normal
- ordem batched ou paid não entra em edição operacional livre
- frontend não decide regra, só ajuda a preencher corretamente
- work type é importante para revisão e futuro pagamento

---

## Regras de visibilidade

### Assistant

- acesso principal
- edição de ordens em `in_progress` ou `follow_up`
- sem poderes administrativos

### Admin

- acesso eventual de exceção
- pode revisar ou intervir

### Master

- acesso eventual de auditoria/intervenção

### Inspector

- não acessa esta tela

---

## Estados da tela

### Vazio inicial

- campo de busca
- explicação curta

### Ordem encontrada

- formulário preenchido parcial ou totalmente

### Ordem não encontrada

- opção de iniciar nova inserção

### Incompleta

- destacar campos faltantes

### Loading

- busca e salvamento com feedback claro

### Erro

- mensagem clara sem apagar tudo à toa

---

## Dependências de backend

### Futuro mínimo

- `GET /orders/:id`
- busca por `external_order_code`
- `PATCH /orders/:id`
- eventualmente `POST /orders`
- `POST /orders/:id/submit`

---

## Componentes principais

- campo de busca
- formulário principal
- resumo de status
- validação visual de obrigatórios
- botão de salvar
- botão de submit

---

## Prioridade de implementação

Média.

É importante para o fluxo do assistant, mas pode vir depois que a leitura, claim, submit e aprovação já estiverem minimamente sólidas.

---

## Observações

Essa tela precisa ser rápida e pragmática.

Se o assistant tiver que abrir três páginas para preencher cidade, estado e work type, o sistema já nasceu querendo apanhar.
