# 403 — Sem permissão (Forbidden)

## Objetivo

Definir a UX quando o usuário está autenticado, mas **não pode executar** a ação ou acessar o recurso.

## Quando usar

- acesso indevido por role (assistant tentando rota/admin)
- acesso a recurso fora do escopo permitido (ex.: tentar agir em order de outro assistant)
- endpoints protegidos retornando 403

## Papel do estado

Deixar claro que **não é problema de login**.
Evitar que o usuário tente “reiniciar” achando que é erro técnico.

## Estrutura recomendada da interface

Versão mínima:

- título: “Acesso não permitido”
- texto curto: “Você está logado, mas não tem permissão para acessar esta área.”
- contexto opcional: mostrar o nome da área/ação (sem expor dados sensíveis)
- CTA primário: “Ir para meu dashboard”
- CTA secundário: “Voltar”

## Mensagens recomendadas

- “Você não tem permissão para acessar esta área.”
- “Esta ação não está disponível para sua role.”

## CTAs recomendados

- “Ir para o dashboard” (rota conforme role quando existir; em dev, pode ser um link genérico)
- “Voltar para lista” (quando veio de navegação interna)

## Estados/variações importantes

- **403 em página inteira**: usuário tentou abrir rota que não deveria ver → tela cheia.
- **403 em ação**: usuário clicou em um botão → alert contextual + manter a tela, sem quebrar tudo.

## Notas de UX

- Evitar sugerir que “trocar senha” resolve.
- Se existir equipe/suporte, incluir um texto curto: “Se você acha que deveria ter acesso, fale com um admin.”

## Primeira versão mínima recomendada

- Componente “Acesso não permitido” (tela cheia) + alert inline para ações.

## Objetivo final

- Mensagens consistentes e não acusatórias.
- Navegação segura para um lugar útil.

