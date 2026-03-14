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
# Orders Insert

## Objetivo

Definir a tela de inserÃ§Ã£o operacional de ordens pelo assistant.

Este mÃ³dulo existe para:

- permitir entrada manual ou semiautomatizada de ordens em contexto operacional
- apoiar o fluxo em que o assistant recebe caminhos ou dados e precisa localizar/preparar ordens
- evitar improviso fora do sistema

---

## Rota principal

- `/orders/insert`

---

## Roles atendidas

- `assistant`
- `admin` apenas em cenÃ¡rio excepcional futuro, se a polÃ­tica permitir

---

## Papel da tela

Esta tela nÃ£o substitui importaÃ§Ã£o de pool.
Ela atende um fluxo operacional do assistant.

Ou seja:

- pool import Ã© entrada administrativa do sistema
- orders insert Ã© entrada operacional controlada para o trabalho do assistant

---

# 1. Objetivo da experiÃªncia

O assistant deve conseguir:

- colar ou inserir dados recebidos
- tentar localizar ordens no banco
- identificar ordens vÃ¡lidas
- ver problemas antes do envio
- preparar o conjunto para seguir fluxo

---

# 2. Estrutura recomendada

## Bloco 1. Header

- tÃ­tulo: `Inserir Orders`
- descriÃ§Ã£o curta

## Bloco 2. Entrada principal

Dependendo da implementaÃ§Ã£o:

- textarea para colar linhas
- input por cÃ³digo externo
- lote pequeno manual
- importaÃ§Ã£o operacional leve

## Bloco 3. Resultado da anÃ¡lise

- encontradas
- nÃ£o encontradas
- conflitantes
- invÃ¡lidas

## Bloco 4. Lista de trabalho

- orders vÃ¡lidas
- problemas por item
- aÃ§Ãµes possÃ­veis

---

# 3. Estados possÃ­veis por item inserido

## Encontrada e vÃ¡lida

Pode seguir para preparaÃ§Ã£o

## NÃ£o encontrada

Precisa correÃ§Ã£o manual, remoÃ§Ã£o ou revisÃ£o

## Duplicada/conflitante

Precisa anÃ¡lise administrativa

## Incompleta

Precisa ajuste antes de seguir

---

# 4. Regras importantes

- assistant nÃ£o deve criar caos estrutural na base
- ordem inexistente nÃ£o deve seguir silenciosamente
- duplicidade deve ser tratada como exceÃ§Ã£o
- botÃ£o de seguir/enviar sÃ³ deve ser liberado quando o conjunto estiver vÃ¡lido

---

# 5. UX importante

- o resultado da anÃ¡lise precisa ser imediato e legÃ­vel
- item invÃ¡lido nÃ£o pode parecer item vÃ¡lido
- contadores ajudam muito
- erros devem apontar exatamente qual item falhou

---

# 6. Estrutura visual recomendada

## Resumo superior

- total inserido
- vÃ¡lidas
- invÃ¡lidas
- nÃ£o encontradas
- duplicadas

## Lista por item

Cada linha deve mostrar:

- cÃ³digo externo
- status da anÃ¡lise
- motivo do problema
- aÃ§Ã£o possÃ­vel

---

# 7. AÃ§Ãµes possÃ­veis

## Por item

- remover da lista
- tentar corrigir
- abrir detalhe da order encontrada
- sinalizar para revisÃ£o administrativa, no futuro

## No conjunto

- limpar tudo
- reprocessar
- seguir apenas com vÃ¡lidas, se a polÃ­tica permitir
- bloquear envio total, se a regra exigir lote totalmente vÃ¡lido

---

# 8. Estados da tela

## Loading

- loading localizado no processamento

## Empty

- nenhum item inserido ainda

## Error

- falha de validaÃ§Ã£o
- falha de processamento
- retry claro

---

# 9. Primeira versÃ£o mÃ­nima recomendada

- textarea ou input simples
- anÃ¡lise bÃ¡sica por cÃ³digo externo
- lista com status dos itens
- contadores por resultado
- bloqueio de avanÃ§o quando houver erro crÃ­tico

---

# 10. EvoluÃ§Ã£o futura possÃ­vel

- leitura de mÃºltiplas linhas com parsing mais robusto
- agrupamento por lote local
- integraÃ§Ã£o com scopes
- assistente salvar rascunho do conjunto

---

# Objetivo final

A tela de inserÃ§Ã£o deve ajudar o assistant a transformar entrada operacional crua em material confiÃ¡vel para o fluxo, sem empurrar erro escondido para frente.

