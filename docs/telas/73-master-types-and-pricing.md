# Tipos de Trabalho e Pricing

## Objetivo

Permitir ao master gerenciar:

- os tipos de trabalho (`work_types`)
- os valores padrão por tipo
- a base estrutural de cálculo para assistant e inspector

Esta tela sustenta classificação operacional e pagamento futuro.

---

## Rota

Sugestão de organização:

- `/master/types`
- `/master/types/pricing`

Ou, numa primeira versão simples:

- `/master/types` com duas abas internas:
  - Tipos
  - Pricing

---

## Perfis com acesso

- master

> Observação:
> admin pode futuramente ter leitura e talvez edição limitada, mas o controle estrutural principal é do master.

---

## Quando o usuário chega aqui

O usuário chega aqui:

- quando precisa cadastrar novo `OTYPE`
- quando precisa revisar tipos que vieram do pool
- quando precisa configurar valores padrão
- quando precisa ajustar classificação operacional/financeira

---

## Objetivo do usuário nesta tela

- visualizar todos os tipos de trabalho
- criar ou ativar novos tipos
- revisar tipos vindos da operação
- definir valor padrão do assistant
- definir valor padrão do inspector
- evitar que ordem fique sem classificação financeira

---

## Papel desta tela

Esta tela é parte do núcleo estrutural do sistema.

Ela existe para:

- transformar `OTYPE` em entidade controlada
- padronizar classificação
- preparar o sistema para loteamento e pagamento
- reduzir erro financeiro futuro

---

## Conteúdo principal

### Aba 1. Tipos de trabalho

Campos úteis:

- code
- name
- description
- isActive

Ações:

- criar
- editar
- ativar/inativar

### Aba 2. Pricing

Campos úteis:

- code
- nome
- valor padrão assistant
- valor padrão inspector
- status ativo

Ações:

- editar pricing
- salvar
- validar campos numéricos

### Bloco auxiliar

- tipos detectados no pool e ainda não cadastrados
- tipos ativos sem pricing definido
- tipos inativos ainda usados por ordens, se isso aparecer no futuro

---

## Fluxo esperado

### Cadastrar novo tipo

1. master vê tipo novo vindo da operação
2. cria o registro
3. define descrição mínima
4. ativa o tipo

### Configurar pricing

1. master abre aba de pricing
2. informa valor do assistant
3. informa valor do inspector
4. salva

### Revisar tipos faltantes

1. sistema exibe códigos vindos do pool ainda não mapeados
2. master decide se cadastra, ignora ou inativa depois

---

## Regras de negócio que impactam a UX

- `OTYPE` é determinante para pagamento
- tipo sem pricing pode bloquear ou prejudicar fluxo financeiro
- `code` precisa ser único
- tipo inativo não deve parecer opção normal para novas ordens
- a UI deve destacar tipos sem valor configurado
- tipos novos vindos do pool merecem destaque operacional

---

## Regras de visibilidade

### Master

- acesso total

### Admin

- leitura ou edição limitada, se a política futura permitir

### Assistant

- não acessa a gestão estrutural
- pode apenas selecionar tipos válidos onde o fluxo permitir

### Inspector

- não acessa

---

## Estados da tela

### Loading

- skeleton da lista e dos formulários

### Sem tipos

- mensagem clara incentivando cadastro inicial

### Sem pricing

- alerta forte, mas sem travar a tela

### Erro

- mensagem com retry

---

## Dependências de backend

### Futuro mínimo

- listagem de `work_types`
- criação de tipo
- edição de tipo
- ativação/inativação
- atualização de pricing
- detecção de códigos do pool ainda não catalogados

---

## Componentes principais

- tabela de tipos
- formulário de criação/edição
- tabela de pricing
- alertas de inconsistência
- abas ou subrotas

---

## Prioridade de implementação

Alta antes do módulo financeiro completo.

Sem isso, o pagamento vai acabar dependendo de improviso externo, que é exatamente o tipo de desgraça elegante que sistemas velhos adoram produzir.

---

## Observações

Na primeira versão:

- mantenha simples
- code, nome, ativo
- valor assistant
- valor inspector

Não precisa inventar vinte camadas de regra financeira antes da hora.
Primeiro o sistema precisa saber o que cada tipo é e quanto ele vale.
