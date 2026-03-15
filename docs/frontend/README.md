# Frontend (documentação global)

## Objetivo

Esta pasta (`docs/frontend/`) concentra **padrões globais de UI/frontend**: navegação, estados de interface, componentes base, responsividade e decisões que valem para múltiplas telas.

## Fonte de verdade das telas

As **telas reais** (fluxos e variações por role) vivem em `docs/telas/`, principalmente nos **arquivos numerados** (`00-...`, `10-...`, `20-...` etc.). Esses arquivos são a referência principal para implementação de páginas e fluxos.

## O que fica onde

- `docs/telas/`
  - telas reais e seus fluxos
  - variações por role quando fizer sentido na própria tela
  - índices e mapa de rotas focados em telas

- `docs/frontend/`
  - regras/padrões globais de UI
  - convenções de estados, feedback, tabelas/formulários e responsividade
  - rotas canônicas como referência global de navegação

## Rascunhos

`docs/frontend/_rascunhos/` preserva documentos antigos/duplicados (em consolidação). **Não é fonte de verdade** para implementação; use `docs/telas/` para telas reais.

## Como navegar

1. Comece por `docs/telas/INDEX.md` para achar a tela/fluxo.
2. Use `docs/frontend/` quando precisar de padrões globais (estados, tabelas, responsividade, etc.).

## Arquivos principais (globais)

- `ROTAS_CANONICAS.md`
- `SIDEBAR_POR_ROLE.md`
- `STATUS_STATES_E_COMPONENTES.md` (padronização de estados críticos: erro/contingência)
