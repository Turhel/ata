# Navegação por Role

## Objetivo

Definir o que cada tipo de usuário deve ver no sistema, evitando:

- navegação confusa
- rotas inúteis para certas roles
- duplicação de telas
- mistura entre operação, gestão e estrutura

---

## Perfis principais

- visitante
- usuário autenticado pendente
- assistant
- inspector
- admin
- master

---

# 1. Visitante

Usuário sem sessão.

## Pode acessar

- `/`
- `/auth`

## Não pode acessar

- qualquer rota interna do sistema

## Objetivo do fluxo

- entender o sistema
- fazer login

---

# 2. Usuário autenticado pendente

Usuário com conta autenticada, mas ainda sem liberação operacional.

## Pode acessar

- `/welcome`
- `/settings`
- `/manuals` apenas se a política permitir materiais públicos internos

## Não pode acessar

- dashboard operacional
- orders
- pool
- approvals
- payments
- gestão estrutural

## Objetivo do fluxo

- entender que está aguardando aprovação
- não ficar perdido achando que o sistema quebrou

---

# 3. Assistant

## Rotas principais

- `/dashboard`
- `/orders`
- `/orders/insert`
- `/scopes`
- `/mypayment`
- `/mypayment/history`
- `/settings`
- `/manuals`

## Pode executar

- ver suas ordens
- assumir ordens disponíveis
- editar ordens permitidas
- enviar ordens para revisão
- responder follow-up
- gerar e revisar escopos
- consultar seus pagamentos

## Não deve ver como navegação principal

- `/admin`
- `/master`
- `/admin/pool`
- `/approval`
- `/approval/duplicate`
- `/master/teams`
- `/master/invitations`
- `/master/types`

---

# 4. Inspector

## Rotas principais

- `/dashboard`
- `/scopes/inspector`
- `/mypayment`
- `/mypayment/history`
- `/settings`
- `/manuals`

## Pode executar

- buscar escopo
- visualizar checklist
- usar marcações locais no checklist
- consultar informações próprias de pagamento, quando existir
- acessar materiais e manuais

## Não deve ver como navegação principal

- `/orders`
- `/orders/insert`
- `/admin`
- `/master`
- `/admin/pool`
- `/approval`
- `/payments`

---

# 5. Admin

## Rotas principais

- `/admin`
- `/orders`
- `/approval`
- `/approval/duplicate`
- `/admin/pool`
- `/admin/pool/import`
- `/scopes`
- `/payments`
- `/performance`
- `/settings`
- `/manuals`

## Pode executar

- revisar ordens
- aprovar
- rejeitar
- pedir follow-up
- devolver ao pool
- importar pool
- acompanhar performance do time
- operar pagamentos
- visualizar escopos
- gerir usuários dentro da política permitida

## Não deve ver como navegação principal

- `/master`
- `/master/teams`
- `/master/invitations`
- `/master/types`

---

# 6. Master

## Rotas principais

- `/master`
- `/orders`
- `/approval`
- `/approval/duplicate`
- `/admin/pool`
- `/admin/pool/import`
- `/master/teams`
- `/master/invitations`
- `/master/types`
- `/master/types/pricing`
- `/payments`
- `/performance/master`
- `/settings`
- `/manuals`

## Pode executar

- ver visão global
- organizar times
- aprovar e reativar usuários
- ajustar roles dentro da política
- estruturar tipos e pricing
- acessar visão ampla da operação
- intervir administrativamente quando necessário

---

# Navegação principal sugerida por role

## Assistant

### Menu principal

- Dashboard
- Orders
- Inserção
- Escopos
- Meus pagamentos
- Manuais
- Configurações

---

## Inspector

### Menu principal

- Dashboard
- Escopos
- Meus pagamentos
- Manuais
- Configurações

---

## Admin

### Menu principal

- Dashboard Admin
- Aprovações
- Orders
- Pool
- Importar Pool
- Pagamentos
- Performance
- Escopos
- Manuais
- Configurações

---

## Master

### Menu principal

- Dashboard Master
- Aprovações
- Orders
- Pool
- Times
- Usuários
- Tipos
- Pricing
- Pagamentos
- Performance Global
- Manuais
- Configurações

---

# Redirecionamento recomendado após login

## Se não autenticado

- vai para `/auth`

## Se autenticado e pending

- vai para `/welcome`

## Se assistant

- vai para `/dashboard`

## Se inspector

- vai para `/dashboard`

## Se admin

- vai para `/admin`

## Se master

- vai para `/master`

---

# Rotas que merecem revisão de naming

## Melhor padronizar assim

### Atual → sugerido

- `/scope` → `/scopes`
- `/scope-insp` → `/scopes/inspector`
- `/pool` → `/admin/pool`
- `/pool/import` → `/admin/pool/import`
- `/setting` → `/settings`
- `/performance-master` → `/performance/master`
- `/master/invitation` → `/master/invitations`
- `/mypayment` → `/mypayment`
- `/mypayment/history` → `/mypayment/history`

---

# Regras importantes

## 1. Menu não é segurança

Mesmo escondendo rota da navegação, a API continua sendo a autoridade real.

## 2. Cada role deve ter menu compatível com seu trabalho

Se o usuário abre o menu e vê metade das coisas sem poder usar, o sistema já começou errado.

## 3. Admin e master não são a mesma coisa

O master estrutura.
O admin opera o fluxo.
A navegação deve refletir isso.

---

# Objetivo final

A navegação do sistema deve parecer óbvia para cada role.

Se o usuário precisar adivinhar para onde ir, a navegação falhou.
Se uma role vê módulos que nunca deveria usar, a arquitetura falhou.
