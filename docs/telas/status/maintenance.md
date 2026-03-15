# Manutenção (indisponibilidade planejada)

## Objetivo

Definir a UX para manutenção planejada ou indisponibilidade controlada.

## Quando usar

- janela de manutenção comunicada
- deploy com downtime curto
- bloqueio proposital do sistema por segurança/operacional

## Papel do estado

Definir expectativa. O usuário precisa saber:

- que é planejado
- quanto tempo pode durar (quando houver informação)
- o que fazer enquanto isso

## Estrutura recomendada da interface

Versão mínima (tela cheia):

- título: “Em manutenção”
- texto curto: “O sistema está temporariamente indisponível.”
- informação opcional: previsão/horário
- CTA primário: “Tentar novamente”
- CTA secundário: “Voltar mais tarde”

## Mensagens recomendadas

- “Estamos em manutenção. Tente novamente em alguns minutos.”
- “Voltamos em breve.”

## CTAs recomendados

- “Tentar novamente”
- “Recarregar página”

## Estados/variações importantes

- **Manutenção curta**: UX parecida com 503, mas com tom “planejado”.
- **Manutenção longa**: incluir texto de orientação (ex.: “Retorne após HH:MM”).

## Notas de UX

- Diferenciar de falha inesperada (500/503): aqui o tom é “controlado”.
- Não prometer horário exato se não existir fonte confiável.

## Primeira versão mínima recomendada

- Página “Em manutenção” com retry manual.

## Objetivo final

- Mensagem consistente e previsível para toda a equipe quando o sistema estiver fora por motivo planejado.

