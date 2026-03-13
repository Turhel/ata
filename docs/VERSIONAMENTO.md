# ATA Portal — Versionamento do Projeto

Este documento registra o histórico de versões do sistema  **ATA Portal** .

Formato de versão utilizado:

```
vMAJOR.MINOR.PATCH-DATA
```

Exemplo:

```
v1.0.0-2026-03-09
```

Onde:

* **MAJOR** — mudanças grandes ou incompatíveis
* **MINOR** — novas funcionalidades
* **PATCH** — correções ou ajustes

---

# Estrutura de registro

Cada versão deve registrar:

* Adicionado
* Modificado
* Corrigido
* Removido

---

# v0.1.0-2026-03-09

Primeira estrutura do novo projeto ATA Portal.

## Adicionado

* documentação inicial do projeto
* documento de arquitetura
* registro de decisões técnicas
* plano de desenvolvimento
* estrutura inicial do repositório

## Modificado

* nenhum

## Corrigido

* nenhum

## Removido

* dependências externas do sistema anterior (Supabase, Turso, Clerk)

---

# Como registrar novas versões

Sempre que uma nova versão for criada, adicionar uma nova seção neste documento.

Exemplo:

```
# v0.2.0-2026-04-01

## Adicionado
- sistema de autenticação

## Modificado
- estrutura de usuários

## Corrigido
- erro de validação no login
```

---

# Boas práticas

* cada release deve atualizar este documento
* commits importantes devem referenciar a versão
* manter histórico claro de mudanças

---

# Objetivo

Manter um histórico transparente da evolução do sistema e facilitar:

* manutenção
* auditoria de mudanças
* rollback de versões
