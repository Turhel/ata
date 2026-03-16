# Diretriz de UI

## Objetivo

Registrar a diretriz visual principal do frontend para evitar redesign desnecessário e manter consistência entre telas novas e telas já conhecidas pela operação.

## Fonte visual principal

A referência visual principal do projeto é `docs/telas/.old_site/`.

Sempre que existir correspondência entre uma tela atual e uma tela/componente do site antigo, a implementação nova deve partir dessa base visual.

## Regra prática

- reaproveitar layout, hierarquia visual, organização de blocos e CTAs do site antigo
- preservar o padrão de shell com sidebar, header e área principal quando fizer sentido
- evitar criar um design novo se o antigo já resolvia bem a usabilidade
- adaptar apenas o necessário para:
  - remover bugs do sistema antigo
  - alinhar com a arquitetura atual
  - encaixar nos endpoints e contratos novos
  - melhorar responsividade e robustez

## O que não copiar cegamente

- bugs visuais ou fluxos quebrados do sistema antigo
- acoplamentos com backend/estado legado
- componentes que contradigam a documentação atual de negócio e permissões

## Relação com outras pastas

- `docs/telas/` continua sendo a fonte de verdade das telas reais e fluxos
- `docs/frontend/` continua sendo a fonte de verdade dos padrões globais
- `docs/telas/.old_site/` é a referência visual base para implementação

## Regra de decisão

Se houver dúvida entre:

- inventar um layout novo
- ou adaptar o layout antigo

prefira adaptar o layout antigo, salvo quando houver motivo objetivo para divergir.
