# 422 — Validação (Validation error)

## Objetivo

Definir a UX para erros de validação em:

- formulários
- ações que exigem campos obrigatórios
- fluxos com “motivo obrigatório” (follow-up, reject, return-to-pool)

## Quando usar

- campos obrigatórios ausentes
- formato inválido (ex.: data)
- API retorna “faltando campos” para uma ação (sem ser concorrência)

## Papel do estado

Ajudar o usuário a **corrigir** e concluir a ação.

## Estrutura recomendada da interface

Formulário:

- erro por campo (perto do campo)
- erro geral no topo quando necessário
- manter o conteúdo digitado (não limpar)

Ação crítica (modal):

- destacar campos faltantes (ex.: “reason”)
- manter modal aberto e foco no campo

## Mensagens recomendadas

- “Preencha os campos obrigatórios antes de continuar.”
- “Motivo é obrigatório para concluir esta ação.”

Quando houver lista de campos:

- “Faltando: work type, endereço, cidade…”

## CTAs recomendados

- “Corrigir e tentar novamente”
- “Cancelar” (sem perder texto, se possível)

## Estados/variações importantes

- **Validação de formulário**: campos de input.
- **Validação de ação**: bloqueio por dados mínimos (ex.: submit/approve de order incompleta).
- **Não confundir com 409**: validação = “faltou dado”, conflito = “estado mudou”.

## Notas de UX

- Evitar traduzir 422 como “erro interno”.
- Se a API devolver lista de campos faltantes, mostrar de forma legível (não como JSON cru).

## Primeira versão mínima recomendada

- Exibir mensagem curta + lista simples de campos faltantes (quando disponível).

## Objetivo final

- Feedback por campo consistente e acessível (ver `docs/frontend/ACESSIBILIDADE_E_FEEDBACK.md`).

