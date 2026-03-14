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
# Home

## Objetivo

Definir a home pÃºblica do ATA Portal.

Esta tela existe para:

- apresentar o sistema de forma simples
- servir como ponto de entrada pÃºblico
- encaminhar rapidamente para autenticaÃ§Ã£o
- evitar que a pÃ¡gina inicial pareÃ§a um panfleto confuso ou um dashboard disfarÃ§ado

---

## Rota principal

- `/`

---

## PÃºblico da tela

- usuÃ¡rios nÃ£o autenticados
- usuÃ¡rios que acessam o sistema pela primeira vez
- usuÃ¡rios que precisam reencontrar o ponto de entrada

---

## Papel da tela

A home pÃºblica nÃ£o Ã© o centro operacional do sistema.

Ela existe para:

- explicar o que Ã© o ATA Portal
- indicar que o sistema Ã© interno
- direcionar o usuÃ¡rio para login
- passar sensaÃ§Ã£o de clareza e organizaÃ§Ã£o

---

# 1. Objetivo da experiÃªncia

Ao abrir a home, a pessoa deve entender em poucos segundos:

- que sistema Ã© esse
- para quem ele existe
- que o uso Ã© interno
- onde clicar para entrar

---

# 2. Estrutura recomendada

## Bloco 1. Hero principal

- nome do sistema
- descriÃ§Ã£o curta
- botÃ£o principal: `Entrar`
- botÃ£o secundÃ¡rio opcional: `Saiba mais`, se realmente existir conteÃºdo Ãºtil

## Bloco 2. Resumo do sistema

- orders
- escopos
- revisÃ£o
- pagamentos
- operaÃ§Ã£o interna

## Bloco 3. PÃºblico e propÃ³sito

- uso interno
- controle por login
- acesso por role

## Bloco 4. RodapÃ© simples

- nome do projeto
- versÃ£o, se fizer sentido
- links Ãºteis mÃ­nimos

---

# 3. ConteÃºdo recomendado

## Headline sugerida

Algo na linha de:

- sistema interno de operaÃ§Ã£o e revisÃ£o
- plataforma interna de ordens, escopos e pagamentos

## Texto curto

A home deve explicar sem exagero:

- o portal centraliza fluxo operacional
- o acesso Ã© autenticado
- cada usuÃ¡rio vÃª o que sua role permite

---

# 4. O que evitar

- tentar colocar o sistema inteiro na home
- excesso de texto institucional
- animaÃ§Ã£o inÃºtil
- componentes de dashboard para usuÃ¡rio deslogado
- prometer recursos que ainda nem existem, aquele esporte clÃ¡ssico do software

---

# 5. UX importante

- botÃ£o de login precisa estar evidente
- layout precisa ser limpo
- a pÃ¡gina deve carregar rÃ¡pido
- a leitura precisa funcionar bem em desktop e mobile

---

# 6. Estados da tela

## UsuÃ¡rio nÃ£o autenticado

Mostra a home normal

## UsuÃ¡rio autenticado

Pode:

- redirecionar para a Ã¡rea correta
  ou
- mostrar CTA claro para entrar no dashboard

### RecomendaÃ§Ã£o

Se a sessÃ£o estiver vÃ¡lida, o melhor costuma ser redirecionar logo para a Ã¡rea Ãºtil.

---

# 7. Primeira versÃ£o mÃ­nima recomendada

- branding simples
- texto curto
- botÃ£o `Entrar`
- breve descriÃ§Ã£o do sistema

---

# 8. EvoluÃ§Ã£o futura possÃ­vel

- bloco de notÃ­cias internas ou avisos
- status de ambiente
- link para manuais pÃºblicos internos, se fizer sentido
- release notes simples

---

# Objetivo final

A home deve ser curta, clara e Ãºtil.

Ela nÃ£o existe para impressionar.
Ela existe para colocar a pessoa certa no lugar certo o mais rÃ¡pido possÃ­vel.

