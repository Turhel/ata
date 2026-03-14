# Configurações

## Objetivo

Dar ao usuário um espaço claro para configurações pessoais e preferências operacionais que não alteram regras centrais do sistema.

Esta tela não deve virar “admin escondido em roupa de usuário”.

---

## Rota

`/setting`

> Observação:
> o ideal futuro é padronizar como `/settings`.

---

## Perfis com acesso

- assistant
- inspector
- admin
- master

Cada role vê apenas o que fizer sentido no próprio contexto.

---

## Quando o usuário chega aqui

O usuário chega aqui:

- para revisar dados próprios
- para ver informações da conta
- para ajustar preferências simples
- para acessar ações pessoais seguras

---

## Objetivo do usuário nesta tela

- ver dados básicos da conta
- entender seu status e role
- ajustar preferências pessoais
- acessar ajuda ou ações de suporte
- eventualmente configurar notificações ou idioma no futuro

---

## Papel desta tela

Esta tela é pessoal, não estrutural.

Ela existe para:

- centralizar ajustes individuais
- reduzir confusão entre “perfil pessoal” e “administração do sistema”
- dar transparência sobre conta, role e status

---

## Conteúdo principal

### 1. Conta

- nome
- email
- role ativa
- status da conta
- data de criação, se útil

### 2. Preferências

Possíveis itens futuros:

- tema
- idioma
- formato de data
- preferências visuais
- notificações

### 3. Segurança e sessão

Possíveis itens:

- sair
- visualizar sessão atual
- orientação para trocar senha, se o fluxo de auth permitir

### 4. Suporte

- link para manuais
- contato interno
- informações básicas do ambiente

---

## Regras de negócio que impactam a UX

- usuário comum não altera role aqui
- usuário comum não altera status aqui
- preferências pessoais não podem afetar regra central da operação
- dados sensíveis administrativos não devem aparecer para role errada

---

## Regras de visibilidade

### Todos

- podem ver sua própria conta
- podem ajustar preferências pessoais permitidas

### Admin/Master

- continuam sem usar esta tela para gestão estrutural
- gestão estrutural fica em rotas próprias

---

## Estados da tela

### Loading

- skeleton simples

### Erro

- mensagem clara

### Sem preferências configuradas

- mostrar defaults com clareza

---

## Dependências de backend

### Futuro mínimo

- `GET /me`
- endpoint de atualização de preferências pessoais, quando existir
- eventual endpoint de sessão atual

---

## Componentes principais

- card de perfil
- card de preferências
- seção de suporte
- ações de sessão

---

## Prioridade de implementação

Baixa a média no começo.

Útil, mas não precisa competir com ordens, aprovação e financeiro. Usuário sobrevive um tempo sem tema escuro customizado. Sem fluxo operacional, não.

---

## Observações

A primeira versão pode ser bem simples:

- dados da conta
- role
- status
- sair
- link para manuais

Já resolve bastante sem inventar “painel de preferências” de nave espacial.
