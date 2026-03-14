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
# Auth

## Objetivo

Definir as telas e o fluxo de autenticaÃ§Ã£o do ATA Portal.

Este mÃ³dulo existe para:

- permitir login seguro
- preparar escolha inicial de contexto de uso, quando aplicÃ¡vel
- controlar entrada no sistema sem misturar auth com autorizaÃ§Ã£o operacional

---

## Rotas principais

- `/auth`
- `/auth/role`

---

## Papel do mÃ³dulo

A autenticaÃ§Ã£o confirma identidade.
A autorizaÃ§Ã£o define o que o usuÃ¡rio pode fazer.

A interface precisa refletir essa separaÃ§Ã£o.

---

# 1. Tela `/auth`

## Objetivo

Permitir que o usuÃ¡rio faÃ§a login no sistema.

---

## Estrutura recomendada

## Bloco 1. Branding mÃ­nimo

- nome do sistema
- descriÃ§Ã£o curta

## Bloco 2. FormulÃ¡rio

- email
- senha
- botÃ£o principal: entrar

## Bloco 3. Feedback

- erro de login
- loading
- redirecionamento claro apÃ³s sucesso

---

# 2. Regras de UX

- tela limpa
- sem excesso de distraÃ§Ã£o
- foco total na aÃ§Ã£o de entrar
- erro claro quando credenciais falham
- loading visÃ­vel durante envio

---

# 3. Estados possÃ­veis apÃ³s login

## Sem profile operacional vinculado

Pode cair em fluxo de pending ou welcome

## UsuÃ¡rio `pending`

Vai para `/welcome`

## UsuÃ¡rio ativo com role Ãºnica operacional

Vai para a Ã¡rea principal correspondente

## UsuÃ¡rio com contexto que exige escolha

Pode ir para `/auth/role`, se essa decisÃ£o existir no produto final

---

# 4. Tela `/auth/role`

## Objetivo

Permitir escolha inicial de modo de navegaÃ§Ã£o quando isso fizer sentido no produto.

---

## ObservaÃ§Ã£o importante

Essa tela sÃ³ deve existir se houver motivo real.

Se o usuÃ¡rio jÃ¡ tem uma role operacional clara e Ãºnica, o ideal Ã© nÃ£o inventar mais uma etapa sÃ³ para dar sensaÃ§Ã£o de aplicativo importante.

---

## Quando usar

- quando o mesmo usuÃ¡rio puder acessar contexto de assistant e inspector
- quando houver escolha explÃ­cita de modo de trabalho
- quando isso simplificar a experiÃªncia

## Quando nÃ£o usar

- quando a role jÃ¡ define naturalmente o caminho
- quando sÃ³ servir para criar uma etapa extra inÃºtil

---

## Estrutura recomendada

- tÃ­tulo: `Escolha seu modo de acesso`
- cards simples de contexto
- cada card explica o que o usuÃ¡rio verÃ¡ naquele modo

---

# 5. Feedback do mÃ³dulo

## Sucesso

- redirecionamento claro

## Erro

- credenciais invÃ¡lidas
- conta sem acesso
- conta bloqueada
- sessÃ£o invÃ¡lida

---

# 6. Primeira versÃ£o mÃ­nima recomendada

- `/auth` com login funcional
- `/auth/role` sÃ³ se houver necessidade real confirmada

---

# Objetivo final

O mÃ³dulo de auth deve ser direto, estÃ¡vel e sem fricÃ§Ã£o desnecessÃ¡ria.

Entrar no sistema deve ser simples.
Entender por que nÃ£o entrou tambÃ©m.

