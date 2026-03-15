# Offline ou reconectando

## Objetivo

Definir a UX quando o **cliente** perde conectividade (ou parece perder) e/ou quando o app está tentando reconectar.

## Quando usar

- perda temporária de internet do usuário
- Wi‑Fi instável
- notebook em modo offline
- API caiu e voltou (percebido como “sem resposta”)

## Papel do estado

Evitar ações frustrantes (cliques que falham em série) e preservar o trabalho.

## Estrutura recomendada da interface

Preferir **banner** quando o usuário ainda pode ler/navegar:

- banner fixo no topo: “Sem conexão. Tentando reconectar…”
- indicador de reconexão
- ação “Tentar agora” (opcional)

Usar **tela cheia** quando o app não consegue operar (ex.: primeira carga):

- título: “Sem conexão”
- texto: “Verifique sua internet e tente novamente.”
- CTA: “Tentar novamente”

## Mensagens recomendadas

- “Você está offline. Algumas ações foram desativadas.”
- “Reconectando…”
- “Conexão restabelecida.” (feedback breve)

## CTAs recomendados

- “Tentar novamente”
- “Recarregar”

## Estados/variações importantes

- **Leitura pode continuar**: permitir navegar em dados já carregados, mas bloquear ações que salvam.
- **Ações bloqueadas**: desabilitar botões destrutivos/submit e explicar com tooltip/alert.

## Notas de UX

- Não transformar “offline” em erro interno.
- Evitar “polling agressivo” que drena rede; retry simples e progressivo.

## Primeira versão mínima recomendada

- Banner offline + desabilitar CTAs de escrita enquanto offline.

## Objetivo final

- Reconnect suave com feedback claro e sem perda de contexto.

