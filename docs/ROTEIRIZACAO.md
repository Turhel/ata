# ATA Portal — Roteirização (Router próprio)

## Objetivo

Definir o desenho do **módulo de roteirização** do ATA Portal, inspirado no fluxo de ferramentas como routing24 e inRoute, mas **adaptado ao nosso trabalho** para ajudar:

- **Admin/Master** a criar/publicar rotas do dia (planejamento)
- **Inspector** a executar a rota (execução)
- **Assistant** a acompanhar e fechar o dia (suporte/controle)

Este documento descreve **decisões de produto + desenho técnico mínimo** para evitar caos de lógica entre:

- pool import (workflow de orders)
- roteirização (plano do dia)
- execução real e divergências do dia

## Princípios (anti-caos)

1. **Roteirização não é o workflow de orders.**
   - Rotas não devem “puxar status vivo” de `orders` como fonte de verdade para existir.
   - Rotas usam um **snapshot do dia** e geram exportações/visões para execução.

2. **Snapshot do dia é obrigatório para criar rota.**
   - A rota do dia nasce de um **XLSX do dia** (mesmo que o admin use GPX do inRoute).

3. **1 rota ativa por inspetor por dia.**
   - Em casos raros de refação, a rota anterior é **substituída** (não apagada).

4. **Sem automação excessiva.**
   - Mudanças posteriores em `orders` (canceladas, pagas, etc.) geram **diferenças/alertas**,
     mas não reescrevem a rota automaticamente.

5. **Auditoria sempre.**
   - Toda ação relevante (criar, publicar, reordenar, importar GPX, substituir rota) gera histórico.

## Papéis e permissões

### Admin e Master

- **Únicos** que podem: criar, editar, otimizar, publicar, substituir rota, importar GPX, gerar/exportar.

### Assistant

- Não cria rotas.
- Acompanha rota publicada (visão operacional) e fecha o dia (relatórios OK/OKE).

### Inspector

- Não cria rotas.
- Executa a rota publicada (visão simples), com status mínimo por ponto quando existir.

## Entradas “reais” (arquivos do legado)

### XLSX (pool/inspections)

O XLSX é a entrada do pool e também a base do snapshot do dia para roteirização.

Campos reais observados (exemplos):

- `STATUS`
- `WORDER` (código externo/natural)
- `INSPECTOR` (conta externa, ex.: ATAVENDxx / ATATESTE)
- `CLIENT`
- `OTYPE`
- `DUEDATE`
- `WINDOW` (no arquivo real aparece como `Y`/`N`)
- endereço (`ADDRESS1`, `ADDRESS2`, `CITY`, `ZIP`)
- flags como `RUSH`, `FOLLOWUP`, `VACANT`

**Observação importante:** colunas de condição/risco (ex.: `NEGLECT`, `MORTGAGE`, `FREEZE`, etc.)
existem no XLSX, mas no arquivo real analisado estão **vazias**. Portanto:

- não basear regra de negócio nelas
- não basear classificação de rota nelas

### GPX (inRoute)

O GPX é uma exportação do inRoute e carrega:

- waypoints ordenados (lat/lon + endereço textual)
- sequência de rota (`<rtept>`)
- marcações por cor (`<sym>`) usadas como hack de categoria no inRoute

No ATA Portal, GPX pode ser suportado como **fonte de sequência** (para admins que preferem continuar
gerando no inRoute), mas precisa de uma etapa de linkagem com o snapshot do dia.

### EML (email do inRoute)

O email do inRoute é um “pacote” operacional (texto + aviso + imagem + GPX). No nosso sistema, ele será:

- **gerado por nós** (para reduzir ambiguidade e melhorar utilidade)
- derivado do modelo interno de rota

## Categorias visuais (cores) — do hack para o semântico

Hoje as cores são usadas por limitação do inRoute:

- regular (amarelas)
- exterior (verde)
- interior (rosa)
- fint (marrom)
- atrasadas (vermelho)

No ATA Portal:

- a rota usa um campo **semântico** `route_category` por stop
- a cor é só renderização

Regras mínimas:

- `overdue` (vermelho) deve ser **objetivo**: `due_date < route_date`
- demais categorias (`regular`, `exterior`, `interior`, `fint`) devem vir de:
  - catálogo (`work_types.route_category`), e/ou
  - override manual do admin por stop, e/ou
  - mapeamento do `sym` do GPX quando a rota vier do inRoute

## Desenho do módulo (modelo interno)

### 1) Route Source Batch (snapshot do dia)

Um upload de XLSX do dia cria um **batch de snapshot**, que representa “o universo de ordens elegíveis do dia”.

Características:

- pode vir de uma conta master (todas as contas) **ou** da conta do inspetor (apenas aquela conta)
- sempre preserva `raw_payload` (auditoria e debug)
- tem hash/fingerprint para identificar reupload do mesmo arquivo

### 2) Candidates (linhas elegíveis)

Cada linha relevante do XLSX vira um candidate do dia:

- `external_order_code` (WORDER)
- `source_inspector_account_code` (INSPECTOR)
- `client_code` (CLIENT)
- `work_type_code` (OTYPE)
- endereço, cidade, zip
- `due_date`, `window`, `rush`, `followup`, `vacant`
- `raw_payload`

Opcionalmente, o sistema tenta linkar candidate → `orders` por `external_order_code` para enriquecer.

### 3) Route (plano publicado do dia)

Uma rota é criada para:

- `route_date`
- `inspector` (ou `inspector_account`)
- `assistant`

Estados mínimos sugeridos:

- `draft`
- `published`
- `superseded` (quando uma nova rota substitui a antiga)
- `cancelled`

### 4) Stops (pontos da rota)

Cada stop representa 1 ponto/ordem na sequência:

- `seq` (ordem)
- `candidate_id` opcional
- `order_id` opcional
- snapshot de endereço (não depender só de join)
- lat/lon (quando existir)
- `route_category`
- `stop_status` (quando implementarmos execução): `pending`, `done`, `skipped`

### 5) Eventos (auditoria)

O módulo precisa de trilha auditável:

- created
- imported_gpx
- reordered
- published
- superseded
- export_generated

## Como criar rota (fluxos suportados)

### Fluxo A — rota interna (estilo routing24)

1. Admin faz upload do XLSX do dia (Route Source Batch).
2. Admin seleciona a conta `INSPECTOR` (ex.: ATATESTE / ATAVENDxx).
3. O sistema lista candidates do dia daquela conta.
4. Admin ordena/ajusta (manual na primeira versão; otimização depois).
5. Admin publica a rota para inspector + assistant.
6. O sistema gera exportações (email próprio + GPX quando necessário).

### Fluxo B — importar rota do inRoute (GPX)

1. Admin faz upload do XLSX do dia (obrigatório, para snapshot/validação).
2. Admin faz upload do GPX do inRoute.
3. Admin seleciona inspector + assistant.
4. Sistema cria a rota com stops na ordem do GPX.
5. Sistema tenta linkar stops → candidates/orders.
6. Stops não linkados ficam como “pendentes de revisão” (admin resolve manualmente).
7. Admin publica (ou substitui a rota existente do dia).

## Substituir rota do dia (caso raro)

Quando precisar refazer a rota (ex.: cobrança de atrasada):

- cria nova rota com `version` maior
- marca a anterior como `superseded`
- mantém exportações e histórico da anterior
- inspector/assistant passam a ver a nova rota como ativa

## Fechamento do dia (OK/OKE e faltantes)

Objetivo: reduzir casos como “ponto 15 ficou para trás e ninguém viu”.

Entrada mínima (no fim do dia):

- assistant envia lista de `external_order_code` executadas (OK/OKE) para `route_id`

O sistema gera:

- `planned_not_done`: planejadas na rota mas não reportadas
- `done_not_planned`: reportadas mas fora da rota
- `ambiguous`: códigos não encontrados no snapshot do dia

Isso vira um relatório diário operacional.

## Milestones recomendados

### M1 — Base e publicação manual (admin-only)

- schema do snapshot, rota, stops, eventos
- upload do XLSX do dia (router)
- criar rota manual por conta INSPECTOR
- publicar e substituir rota (supersede)

### M2 — Importar GPX do inRoute

- upload GPX
- criação de stops pela sequência do GPX
- linkagem candidate/order com revisão para pendências

### M3 — Exportação própria (email/GPX)

- gerar email claro (inspetor + assistant)
- gerar GPX compatível quando necessário
- versionar exportações

### M4 — Execução + relatório OK/OKE

- status de stop
- entrada OK/OKE do assistant
- relatório de faltantes/extras

### M5 — Otimização real

- ordenação automática por heurística
- restrições por janela/prioridade
- acompanhamento do que foi planejado vs executado

