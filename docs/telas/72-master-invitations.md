# Aprovação e Gestão de Contas

## Objetivo
## ReferÃªncia visual do site antigo

- Fonte visual principal: `docs/telas/.old_site/src/pages/dashboard/master/MasterInvitations.tsx`
- Apoio complementar: `docs/telas/.old_site/src/pages/dashboard/master/MasterInspectors.tsx`
- A implementaÃ§Ã£o nova deve manter a leitura antiga de convites, contas pendentes e aÃ§Ãµes administrativas diretas


Permitir ao master gerenciar a entrada e o ciclo de vida dos usuários internos:

- aprovar contas novas
- bloquear
- reativar
- atribuir ou ajustar roles conforme política
- acompanhar usuários pendentes e antigos

---

## Rota

`/master/invitations`

> Observação:
> o nome pode mudar para algo mais claro no futuro, como `/master/users`.
> “Invitations” é aceitável por enquanto, mas a tela na prática é de gestão de contas.

---

## Perfis com acesso

- master

---

## Quando o usuário chega aqui

O usuário chega aqui:

- quando existe usuário novo aguardando aprovação
- quando precisa bloquear ou reativar alguém
- quando precisa ajustar role
- quando precisa revisar contas antigas

---

## Objetivo do usuário nesta tela

- ver quem entrou recentemente
- aprovar novos usuários
- bloquear usuários indevidos ou inativos
- reativar contas antigas
- definir role operacional correta
- evitar usuários ativos sem role

---

## Papel desta tela

Esta tela controla entrada e manutenção do acesso operacional.

Ela existe para:

- manter o sistema governado
- impedir que pending opere
- garantir consistência entre status e role
- centralizar gestão de contas

---

## Conteúdo principal

### 1. Resumo de usuários

- total de pending
- total de active
- total de blocked
- total de inactive

### 2. Lista principal

Campos úteis:

- nome
- email
- status
- role ativa
- data de criação
- data de aprovação
- auth vinculada ou não

### 3. Filtros

- pending
- active
- blocked
- inactive
- por role
- busca por nome/email

### 4. Ações

- aprovar
- bloquear
- reativar
- ajustar role
- ver detalhes do usuário

---

## Fluxo esperado

### Aprovar usuário

1. master abre lista de pending
2. escolhe a conta
3. define ou confirma role
4. aprova
5. sistema marca active e registra auditoria

### Bloquear usuário

1. master seleciona conta ativa
2. confirma bloqueio
3. sistema muda status para blocked

### Reativar usuário

1. master seleciona conta blocked ou inactive
2. confirma reativação
3. sistema volta para active, se as regras permitirem

### Ajustar role

1. master abre usuário
2. vê role atual
3. troca para nova role permitida
4. sistema preserva histórico da anterior

---

## Regras de negócio que impactam a UX

- pending não opera
- blocked não opera
- inactive não opera
- não existe usuário ativo sem role operacional definida
- master pode promover a master
- admin não deve promover alguém a master, salvo regra futura explícita
- status e role precisam aparecer juntos de forma clara

---

## Regras de visibilidade

### Master

- acesso total

### Admin

- esta tela global não é do admin
- admin pode ter tela operacional separada de aprovação mais limitada, se a política mantiver isso

### Assistant

- não acessa

### Inspector

- não acessa

---

## Estados da tela

### Loading

- skeleton da tabela e resumo

### Sem resultados

- mensagem clara conforme filtro

### Erro

- erro com retry

### Ação em andamento

- loading no botão
- evitar clique duplo

---

## Dependências de backend

### Já existe parcialmente

- `GET /users`
- endpoints de approve/block/reactivate
- helpers de role

### Futuro desejável

- `PATCH /users/:id/role`
- detalhe do usuário
- filtros por status e role
- eventual trilha de auditoria de conta

---

## Componentes principais

- cards de resumo
- tabela de usuários
- filtros
- modal de aprovação
- modal de troca de role
- confirmação de bloqueio/reativação

---

## Prioridade de implementação

Alta para governança.

Sem essa tela, o sistema começa a depender de scripts e gambiarra operacional, que é sempre o jeito mais elegante de cultivar problema escondido.
