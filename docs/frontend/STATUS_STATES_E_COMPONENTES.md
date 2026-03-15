# Status states e componentes (erros/contingência)

## Objetivo

Este documento define **padrões reutilizáveis** para implementar estados críticos do app (erro, bloqueio, indisponibilidade, offline e manutenção) de forma consistente.

A ideia é evitar que cada tela de erro vire um layout/CTA/linguagem diferente.

## Quando usar este documento

Use este documento ao implementar:

- telas/estados descritos em `docs/telas/status/`
- componentes de estado (tela cheia, banner, erro inline) usados em múltiplas telas reais

Relação com outros documentos:

- `docs/telas/status/`: define **o que** cada estado deve comunicar e quais CTAs fazem sentido.
- `docs/frontend/ESTADOS_GERAIS.md`: define padrões gerais (loading/empty/error/success/disabled).
- `docs/frontend/COMPONENTES_BASE.md`: define componentes base (ex.: `CenteredPage`, `EmptyState`, `ErrorState`, `InlineAlert`).

Este arquivo **complementa** os acima focando em **composição** e **decisão de UX**.

---

## Componentes reutilizáveis recomendados

### `FullPageStatus`

Uso típico:

- 401 (não autenticado)
- 403 (sem permissão)
- 404 (não encontrado)
- 500 (erro interno)
- `maintenance`
- indisponibilidade total (502/503 quando impede o app inteiro)

Estrutura esperada:

- opcional: ícone/ilustração simples (não obrigatório)
- **título** curto e direto
- **descrição** curta (1–3 linhas)
- **ação principal** (CTA primário)
- **ação secundária** opcional (voltar/lista/dashboard)
- opcional em dev: “mostrar detalhes” (sem expor para usuário final)

Quando usar tela cheia:

- primeira carga do app falhou
- rota inteira não consegue operar sem o backend
- contexto não existe (ex.: URL direta) e o usuário precisa de um caminho de retorno

Observação:

`FullPageStatus` é normalmente uma composição de layout tipo `CenteredPage` + um bloco de status (não precisa de “design system” novo).

---

### `InlineErrorState`

Uso típico:

- erro localizado em card, lista, widget ou bloco interno
- falha ao carregar uma seção da tela, mantendo o resto utilizável

Estrutura:

- mensagem curta
- botão “Tentar novamente” (retry local)
- opcional: link “Voltar” / “Ver detalhes” (somente em dev)

Quando **não** usar tela cheia:

- quando apenas um bloco falhou e a tela ainda ajuda o usuário
- quando é melhor preservar contexto e permitir retry local

---

### `EmptyState`

Uso típico:

- listas/tabelas vazias (não é erro)

Diferença entre vazio e falha:

- **vazio**: requisição funcionou; não há itens
- **falha**: requisição não funcionou; usuário não sabe o estado real

Estrutura:

- título curto
- explicação curta
- CTA opcional (ex.: “Importar pool”, “Limpar filtros”)

Referência:

`docs/frontend/ESTADOS_GERAIS.md` e `docs/frontend/COMPONENTES_BASE.md` já definem `EmptyState`; aqui o foco é padronizar o uso.

---

### `ValidationSummary`

Uso típico:

- formulários inválidos
- erro geral de submissão com campos específicos (ex.: API devolveu campos faltantes)

Estrutura recomendada:

- resumo no topo (“Corrija os campos destacados”)
- lista de campos com problema (quando disponível)
- manter erro por campo (próximo ao input)

Foco e acessibilidade:

- foco ir para o primeiro campo inválido (ou para o resumo com link âncora)
- erro associado ao campo (label + mensagem)

---

### `RetryBanner`

Uso típico:

- erro temporário **não bloqueante**
- indisponibilidade parcial (apenas uma área falhou)
- avisos recuperáveis

Estrutura:

- texto curto (“Falha ao carregar X”)
- CTA “Tentar novamente”
- opcional: “Recarregar tudo” (usar com cuidado)

Quando usar banner em vez de tela inteira:

- quando o usuário ainda pode trabalhar em partes da tela
- quando o retry local é suficiente

---

### `ReconnectBanner`

Uso típico:

- app offline
- reconexão em andamento
- backend caiu e voltou (percebido como “sem resposta”)

Estrutura:

- estado: “Offline” / “Reconectando…” / “Conectado”
- mensagem curta e não técnica
- opcional: “Tentar agora”

Quando mostrar:

- perda de conectividade detectada
- falhas repetidas de rede indicando instabilidade

Quando esconder:

- conexão restabelecida e ações voltaram a funcionar (pode mostrar “Conectado” brevemente)

---

## Regras de decisão: banner vs bloco vs tela cheia

Use **tela cheia** quando:

- a tela inteira depende de dados que não carregaram
- a primeira carga do app falhou
- o usuário não tem contexto (URL direta) e precisa de um caminho

Use **erro inline/bloco** quando:

- apenas uma seção falhou
- o restante da tela ainda é útil
- é possível retry local

Use **banner** quando:

- o problema é transversal, mas o usuário ainda pode ler/esperar
- há reconexão/instabilidade temporária

Use **toast**:

- para feedback curto de ação (sucesso/erro leve)
- **não** para erro crítico que exige decisão (401/403/503): nesses casos, preferir estado visível na tela

Evitar exagero visual:

- não “gritar” com modal/toast/banner ao mesmo tempo
- priorizar uma mensagem principal por falha

---

## Estrutura padrão de conteúdo (padrão de copy)

Para estados críticos, manter sempre:

1. **Título** (curto)
2. **Explicação curta** (o que aconteceu + por que importa)
3. **Ação principal** (o que fazer agora)
4. **Ação secundária** (opcional, caminho alternativo)

Regras:

- não expor mensagem técnica bruta do backend para usuário final
- se existir “código de suporte/log”, mostrar apenas em contexto interno/dev

---

## Padrões de CTA (recomendados)

- **Tentar novamente**: falha recuperável (lista/bloco/tela cheia)
- **Voltar**: navegação interna
- **Ir para dashboard**: saída segura quando o usuário se perdeu
- **Entrar novamente**: 401 (sessão ausente/expirada) → `/auth`
- **Recarregar página**: último recurso (usar com cuidado)
- **Voltar para lista**: quando veio de um detalhe/ação
- **Aguardar reconexão**: offline/reconectando (normalmente junto com banner)

---

## Regras de linguagem

- linguagem clara, direta e operacional
- não culpar o usuário
- evitar mensagens vagas (“erro desconhecido”) sem orientação
- diferenciar:
  - não autenticado (401)
  - sem permissão (403)
  - validação (422)
  - conflito/concorrência (409)
  - erro interno (500)
  - indisponibilidade (502/503)
  - offline/reconectando
  - manutenção

---

## Acessibilidade (mínimo)

Baseado em `docs/frontend/ACESSIBILIDADE_E_FEEDBACK.md`:

- foco visível em CTAs
- contraste suficiente em títulos/alertas/banners
- não depender só de cor (status deve ter texto)
- banner deve ser legível e não bloquear teclado
- validação associada ao campo (label + mensagem)

---

## Primeira versão mínima recomendada

Para começar sem complexidade:

- `FullPageStatus`
- `InlineErrorState`
- `ValidationSummary`
- `RetryBanner`
- `ReconnectBanner`

---

## Objetivo final

Estados críticos devem parecer parte do mesmo sistema:

- mesma estrutura
- mesma linguagem
- CTAs previsíveis
- decisões coerentes (banner vs bloco vs tela cheia)

Se cada erro parecer uma tela improvisada, a UX perde confiança rapidamente.

