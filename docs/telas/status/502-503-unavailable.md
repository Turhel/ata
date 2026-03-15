# 502/503 — Indisponível (API/serviço fora)

## Objetivo

Definir a UX quando o app não consegue conversar com a API ou o ambiente está temporariamente indisponível.

## Quando usar

- backend fora / reiniciando
- API indisponível temporariamente
- falha de gateway/proxy (502)
- overload / manutenção não planejada (503)

> Observação: não transformar códigos HTTP em regra de negócio. Aqui tratamos como **sinais** de indisponibilidade.

## Papel do estado

Manter confiança: o usuário precisa entender que é **temporário** e o app pode voltar.

## Estrutura recomendada da interface

Versão mínima (tela cheia quando impede tudo):

- título: “Sistema indisponível no momento”
- texto curto: “Estamos tentando reconectar…”
- estado visual de retry (spinner / countdown simples)
- CTA primário: “Tentar novamente agora”
- CTA secundário: “Voltar mais tarde”

Versão em layout existente (quando só uma área falhou):

- alert no bloco
- botão retry

## Mensagens recomendadas

- “A API está temporariamente indisponível. Tente novamente em instantes.”
- “Estamos reconectando…”

## CTAs recomendados

- “Tentar novamente”
- “Recarregar página” (opcional)

## Estados/variações importantes

- **Falha curta** (segundos): retry automático discreto + botão “tentar agora”.
- **Falha longa** (minutos): sugerir voltar mais tarde e evitar retry agressivo.

## Notas de UX

- Diferenciar de “manutenção planejada” (ver `maintenance.md`).
- Evitar travar o usuário sem feedback; sempre mostrar que está tentando.

## Primeira versão mínima recomendada

- Tela “Indisponível” com retry manual + retry automático simples (ex.: intervalo crescente).

## Objetivo final

- Reconexão suave e mensagens consistentes em toda área crítica.

