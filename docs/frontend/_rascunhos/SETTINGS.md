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
# Settings

## Objetivo

Definir a tela de configuraÃ§Ãµes do ATA Portal.

Este mÃ³dulo existe para:

- concentrar ajustes do perfil e preferÃªncias do usuÃ¡rio
- manter configuraÃ§Ãµes pessoais fora das telas operacionais
- preparar o terreno para evoluÃ§Ãµes futuras sem poluir outras Ã¡reas

---

## Rota principal

- `/settings`

---

## Roles atendidas

- todas as roles autenticadas

---

## Papel da tela

A tela de configuraÃ§Ãµes Ã© pessoal.

Ela nÃ£o Ã© lugar para gestÃ£o estrutural do sistema.
Isso pertence Ã s telas administrativas do master e do admin.

---

# 1. Estrutura recomendada

## Bloco 1. Header

- tÃ­tulo: `ConfiguraÃ§Ãµes`
- descriÃ§Ã£o curta

## Bloco 2. SeÃ§Ãµes

- perfil
- conta
- aparÃªncia, se existir
- preferÃªncias operacionais
- seguranÃ§a, se fizer sentido

---

# 2. SeÃ§Ã£o de perfil

## Mostrar

- nome
- email
- role atual
- status da conta
- admin responsÃ¡vel, se fizer sentido para assistant

## Permitir depois

- editar nome exibido
- foto, se isso existir um dia
- dados pessoais complementares

---

# 3. SeÃ§Ã£o de conta

## Mostrar

- email de login
- vÃ­nculo com auth
- estado da conta

## Futuro possÃ­vel

- trocar senha
- encerrar sessÃ£o em outros dispositivos
- ver Ãºltimos acessos

---

# 4. SeÃ§Ã£o de preferÃªncias

## Ideias futuras

- densidade de tabela
- preferÃªncia de perÃ­odo padrÃ£o
- filtros salvos
- idioma, se um dia houver

---

# 5. O que nÃ£o pertence aqui

- gerenciamento de roles
- aprovaÃ§Ã£o de usuÃ¡rio
- times
- pricing
- tipos
- lotes
- qualquer aÃ§Ã£o estrutural

---

# 6. UX importante

- tela simples
- seÃ§Ãµes claras
- sem parecer painel de controle confuso
- nÃ£o encher de opÃ§Ã£o vazia sÃ³ para parecer â€œrobustoâ€

---

# 7. Estados da tela

## Loading

- skeleton simples

## Error

- erro localizado
- retry

---

# 8. Primeira versÃ£o mÃ­nima recomendada

- leitura do perfil
- leitura da role
- leitura do status
- bloco reservado para futuras preferÃªncias

---

# Objetivo final

A tela de configuraÃ§Ãµes deve ser o lugar onde o usuÃ¡rio entende sua prÃ³pria conta e ajusta preferÃªncias pessoais, sem misturar isso com administraÃ§Ã£o do sistema.

