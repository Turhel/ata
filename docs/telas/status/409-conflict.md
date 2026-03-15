# 409 — Conflito (Conflict) / concorrência de workflow

## Objetivo

Definir a UX quando a ação falha por **conflito operacional**, e não por “formulário inválido”.

## Quando usar

Conflitos comuns no ATA Portal:

- order já foi assumida por outra pessoa (concorrência de claim)
- status inválido para a ação (a ordem mudou desde que a tela carregou)
- estado desatualizado na tela (dados antigos)
- duas ações administrativas quase simultâneas

## Papel do estado

Orientar o usuário a **sincronizar estado** e tentar a próxima ação correta, sem culpa/tecnicismo.

## Estrutura recomendada da interface

Como **alert contextual** (preferido):

- mensagem curta do conflito
- CTA primário: “Recarregar”
- CTA secundário: “Voltar para lista”

Como **tela cheia** (quando não há contexto suficiente):

- título: “O estado mudou”
- explicar que alguém agiu antes / a ordem mudou
- CTAs: recarregar / voltar

## Mensagens recomendadas

- “O estado desta order mudou enquanto você estava nela.”
- “Esta order já foi assumida por outra pessoa.”
- “A ação não é válida para o status atual. Atualize a tela.”

## CTAs recomendados

- “Recarregar dados” (refetch do item/lista)
- “Voltar para lista”
- opcional: “Abrir estado atual” (se existir navegação para o detalhe)

## Estados/variações importantes

- **Conflito recuperável**: recarregar resolve (ex.: claim perdeu corrida).
- **Conflito não recuperável**: a ordem saiu do escopo (ex.: foi aprovada/paga).

## Notas de UX

- Diferenciar de 422 (validação): aqui o usuário não errou campo; o sistema mudou.
- Evitar mensagens genéricas: preferir indicar a ação mais provável (“recarregar”).

## Primeira versão mínima recomendada

- Banner/alert de conflito com botão “Recarregar”.

## Objetivo final

- UX rápida para “estado mudou” sem frustração.
- Atualização automática do painel/lista quando for seguro.

