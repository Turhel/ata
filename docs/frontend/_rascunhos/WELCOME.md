> **Rascunho (legado)**
> Este arquivo é uma consolidação antiga.
> A fonte de verdade para telas reais está em `docs/telas/` (arquivos numerados) e nos índices dessa pasta.
> Não use este arquivo como referência principal de implementação.
>
> Referências:
> - `docs/telas/README.md`
> - `docs/telas/INDEX.md`
> - `docs/frontend/README.md`

---
# Welcome

## Objetivo

Definir a tela de boas-vindas e espera de aprovaÃ§Ã£o do ATA Portal.

Este mÃ³dulo existe para:

- receber usuÃ¡rios autenticados que ainda nÃ£o podem operar
- deixar claro o estado da conta
- evitar que o usuÃ¡rio caia em tela vazia ou erro genÃ©rico
- separar â€œentrei no sistemaâ€ de â€œjÃ¡ fui aprovado para operarâ€

---

## Rota principal

- `/welcome`

---

## Roles atendidas

- usuÃ¡rios autenticados sem acesso operacional efetivo
- especialmente `pending`

---

## Papel da tela

Esta tela comunica:

- vocÃª entrou
- sua conta existe
- seu acesso operacional ainda nÃ£o foi liberado

Ela nÃ£o Ã© dashboard.
Ela nÃ£o Ã© erro.
Ela Ã© estado de espera.

---

# 1. Quando usar

## Casos principais

- usuÃ¡rio autenticado com `users.status = pending`
- usuÃ¡rio com vÃ­nculo ainda incompleto
- usuÃ¡rio aguardando decisÃ£o administrativa

---

# 2. Objetivo da experiÃªncia

O usuÃ¡rio deve entender:

- que a autenticaÃ§Ã£o funcionou
- que o problema nÃ£o Ã© a senha
- que o acesso depende de aprovaÃ§Ã£o
- que ainda nÃ£o pode operar no sistema

---

# 3. Estrutura recomendada

## Bloco 1. Mensagem principal

- boas-vindas
- estado atual da conta
- explicaÃ§Ã£o curta

## Bloco 2. InformaÃ§Ãµes Ãºteis

- email da conta
- status atual
- mensagem administrativa curta

## Bloco 3. PrÃ³ximos passos

- aguardar aprovaÃ§Ã£o
- contatar responsÃ¡vel, se aplicÃ¡vel
- voltar depois

---

# 4. UX importante

- a mensagem precisa tranquilizar
- nÃ£o pode parecer erro tÃ©cnico
- nÃ£o pode parecer tela quebrada
- nÃ£o deve prometer aprovaÃ§Ã£o automÃ¡tica

---

# 5. Estados relacionados

## Pending

Tela principal deste mÃ³dulo

## Blocked

Pode usar tela semelhante, mas com mensagem diferente e mais restritiva

## Inactive

Pode exigir mensagem prÃ³pria ou fallback controlado

---

# 6. Primeira versÃ£o mÃ­nima recomendada

- mensagem de aguardando aprovaÃ§Ã£o
- dados bÃ¡sicos do usuÃ¡rio
- botÃ£o de sair
- visual limpo e simples

---

# Objetivo final

A tela de welcome deve evitar confusÃ£o e deixar o usuÃ¡rio claramente informado sobre sua situaÃ§Ã£o no sistema.

