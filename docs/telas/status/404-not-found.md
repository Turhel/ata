# 404 — Não encontrado (Not Found)

## Objetivo

Definir a UX para:

- rotas inexistentes
- recursos inexistentes
- links quebrados

## Quando usar

- rota não existe (ex.: URL digitada errado)
- objeto não existe (ex.: order ID inválido / removido)
- link antigo/obsoleto

## Papel do estado

Evitar tela “morta”.
Dar caminhos rápidos de retorno para o usuário.

## Estrutura recomendada da interface

Versão mínima:

- título: “Não encontrado”
- mensagem curta
- CTA primário: “Voltar para a lista”
- CTA secundário: “Ir para o dashboard”

## Mensagens recomendadas

Para **rota**:

- “Esta página não existe.”

Para **recurso**:

- “Este item não foi encontrado ou não está mais disponível.”

## CTAs recomendados

- “Voltar para lista” (quando existe uma lista clara: `/orders`, `/users`, `/admin/pool`)
- “Ir para dashboard”

## Estados/variações importantes

- **Página não encontrada** (roteamento)
- **Objeto não encontrado** (backend retornou 404)

Não misturar os dois na mesma mensagem quando houver contexto.

## Notas de UX

- Em navegação interna, preferir manter a navegação do app e mostrar 404 dentro do layout (quando existir).
- Em link externo/URL direta, pode ser tela cheia.

## Primeira versão mínima recomendada

- Página 404 única com CTAs para dashboard e listas principais.

## Objetivo final

- Reduzir impacto de links quebrados e IDs inválidos sem “parecer bug”.

