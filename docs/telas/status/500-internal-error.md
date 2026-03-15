# 500 — Erro interno (Internal error)

## Objetivo

Definir a UX quando ocorre uma falha inesperada da aplicação (frontend ou backend) sem ação clara do usuário.

## Quando usar

- erro inesperado ao carregar uma tela essencial
- exceção não tratada
- API retornou 500 para uma operação

## Papel do estado

Proteger o usuário de mensagens técnicas e dar um caminho de recuperação mínimo.

## Estrutura recomendada da interface

Versão mínima:

- título: “Algo deu errado”
- texto curto: “Ocorreu um erro inesperado. Tente novamente.”
- CTA primário: “Tentar novamente”
- CTA secundário: “Voltar para lista” / “Ir para dashboard”
- detalhe técnico opcional (somente em dev): “Mostrar detalhes”

## Mensagens recomendadas

- “Ocorreu um erro inesperado.”
- “Tente novamente em alguns instantes.”

Evitar:

- stack trace direto na UI
- “Internal server error” cru sem contexto

## CTAs recomendados

- “Tentar novamente”
- “Voltar”

## Estados/variações importantes

- **Falha ao carregar lista**: erro localizado no bloco + retry.
- **Falha ao carregar app inteiro**: tela cheia.

## Notas de UX

- Não confundir com 503 (indisponível): 500 é “deu ruim”, 503 é “temporário fora/instável”.
- Em dev, logs detalhados podem ficar no console; na UI, mostrar só se solicitado.

## Primeira versão mínima recomendada

- Componente padrão “Erro inesperado” com botão retry.

## Objetivo final

- Recuperação rápida e mensagens consistentes em todo o app.

