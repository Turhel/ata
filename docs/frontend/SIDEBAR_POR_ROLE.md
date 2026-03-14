# Sidebar por Role

## Objetivo

Definir a estrutura oficial do menu lateral do ATA Portal por role.

Este documento existe para:

- padronizar navegação
- evitar menus diferentes para a mesma role em telas diferentes
- reduzir improviso na implementação do frontend
- separar claramente operação, administração e estrutura
- impedir que o usuário veja módulos que não fazem parte do seu trabalho

---

## Princípios gerais

### 1. O menu deve refletir o trabalho real

Cada role deve ver apenas o que realmente usa.

### 2. Menu não é segurança

Esconder item não substitui autorização da API.

### 3. Menos itens, mais clareza

Não transformar a sidebar em uma lista telefônica de decisões mal resolvidas.

### 4. Ordem importa

Itens mais usados devem aparecer primeiro.

### 5. Agrupamento sem exagero

Usar grupos claros, mas sem criar 12 seções para parecer “enterprise”.

---

## Convenções

### Estrutura de cada item

- `label`: texto visível
- `route`: rota canônica
- `icon`: ícone sugerido
- `visibleFor`: roles que veem
- `notes`: observações de UX ou negócio

### Ícones

Os nomes abaixo são apenas sugestões conceituais.
A implementação pode usar Heroicons, Lucide ou equivalente.

---

# Sidebar do Assistant

## Objetivo da role

Executar o trabalho operacional do dia a dia.

## Ordem recomendada

### Grupo: Principal

| Label      | Route              | Icon           | Visible for | Notes                           |
| ---------- | ------------------ | -------------- | ----------- | ------------------------------- |
| Dashboard  | `/dashboard`     | home           | assistant   | visão pessoal                  |
| Orders     | `/orders`        | clipboard-list | assistant   | lista principal de ordens       |
| Inserção | `/orders/insert` | plus-square    | assistant   | inserção operacional          |
| Scopes     | `/scopes`        | file-text      | assistant   | geração e consulta de escopos |

### Grupo: Financeiro

| Label           | Route                  | Icon    | Visible for | Notes                   |
| --------------- | ---------------------- | ------- | ----------- | ----------------------- |
| Meus pagamentos | `/mypayment`         | wallet  | assistant   | visão financeira atual |
| Histórico      | `/mypayment/history` | history | assistant   | pagamentos passados     |

### Grupo: Suporte

| Label           | Route         | Icon      | Visible for | Notes              |
| --------------- | ------------- | --------- | ----------- | ------------------ |
| Manuais         | `/manuals`  | book-open | assistant   | materiais de apoio |
| Configurações | `/settings` | settings  | assistant   | ajustes pessoais   |

---

## Observações de UX

- `Orders` deve ser o item central do assistant.
- `Inserção` pode virar ação secundária se depois vocês concluírem que deve morar dentro de `Orders`.
- `Scopes` merece destaque porque é parte real da operação.
- Não mostrar nada de approval, pool, payments administrativos ou master.

---

# Sidebar do Inspector

## Objetivo da role

Consultar escopos e acompanhar o que for estritamente necessário ao trabalho de campo.

## Ordem recomendada

### Grupo: Principal

| Label     | Route                 | Icon        | Visible for | Notes             |
| --------- | --------------------- | ----------- | ----------- | ----------------- |
| Dashboard | `/dashboard`        | home        | inspector   | visão simples    |
| Scopes    | `/scopes/inspector` | file-search | inspector   | busca e checklist |

### Grupo: Financeiro

| Label           | Route                  | Icon    | Visible for | Notes                         |
| --------------- | ---------------------- | ------- | ----------- | ----------------------------- |
| Meus pagamentos | `/mypayment`         | wallet  | inspector   | se aplicável no modelo final |
| Histórico      | `/mypayment/history` | history | inspector   | pagamentos passados           |

### Grupo: Suporte

| Label           | Route         | Icon      | Visible for | Notes                |
| --------------- | ------------- | --------- | ----------- | -------------------- |
| Manuais         | `/manuals`  | book-open | inspector   | instruções e apoio |
| Configurações | `/settings` | settings  | inspector   | ajustes pessoais     |

---

## Observações de UX

- O menu do inspector deve ser o mais enxuto de todos.
- Não mostrar orders, pool, approvals, payments administrativos, performance ou estrutura.
- Se o dashboard do inspector ficar muito pobre, ele pode até virar redirecionamento direto para `Scopes` no começo.

---

# Sidebar do Admin

## Objetivo da role

Revisar o fluxo operacional, importar pool, acompanhar equipe e organizar pagamento.

## Ordem recomendada

### Grupo: Principal

| Label           | Route                   | Icon             | Visible for | Notes                      |
| --------------- | ----------------------- | ---------------- | ----------- | -------------------------- |
| Dashboard Admin | `/admin`              | layout-dashboard | admin       | visão principal da role   |
| Aprovações    | `/approval`           | check-check      | admin       | fila principal de revisão |
| Orders          | `/orders`             | clipboard-list   | admin       | visão geral de ordens     |
| Duplicatas      | `/approval/duplicate` | copy-warning     | admin       | conflitos operacionais     |

### Grupo: Entrada de dados

| Label         | Route                  | Icon     | Visible for | Notes                      |
| ------------- | ---------------------- | -------- | ----------- | -------------------------- |
| Pool          | `/admin/pool`        | database | admin       | visão dos batches/imports |
| Importar Pool | `/admin/pool/import` | upload   | admin       | ação operacional clara   |

### Grupo: Operação e análise

| Label       | Route            | Icon        | Visible for | Notes                           |
| ----------- | ---------------- | ----------- | ----------- | ------------------------------- |
| Scopes      | `/scopes`      | file-text   | admin       | suporte e auditoria operacional |
| Pagamentos  | `/payments`    | banknote    | admin       | lotes e fechamento              |
| Performance | `/performance` | bar-chart-3 | admin       | equipe e indicadores            |

### Grupo: Suporte

| Label           | Route         | Icon      | Visible for | Notes       |
| --------------- | ------------- | --------- | ----------- | ----------- |
| Manuais         | `/manuals`  | book-open | admin       | referência |
| Configurações | `/settings` | settings  | admin       | pessoais    |

---

## Observações de UX

- `Aprovações` deve aparecer acima de `Orders`, porque é a ação mais crítica do admin.
- `Importar Pool` pode ficar dentro da tela de Pool no futuro, mas no começo pode existir como item separado.
- Não mostrar módulos exclusivos do master.
- Se a sidebar ficar grande demais, juntar `Duplicatas` dentro de `Aprovações` mais tarde pode ser uma boa.

---

# Sidebar do Master

## Objetivo da role

Estruturar o sistema, acompanhar a operação global e intervir administrativamente quando necessário.

## Ordem recomendada

### Grupo: Principal

| Label            | Route                   | Icon             | Visible for | Notes                       |
| ---------------- | ----------------------- | ---------------- | ----------- | --------------------------- |
| Dashboard Master | `/master`             | layout-dashboard | master      | visão global               |
| Aprovações     | `/approval`           | check-check      | master      | acesso administrativo amplo |
| Orders           | `/orders`             | clipboard-list   | master      | leitura/intervenção       |
| Duplicatas       | `/approval/duplicate` | copy-warning     | master      | conflitos relevantes        |

### Grupo: Estrutura

| Label     | Route                     | Icon              | Visible for | Notes                              |
| --------- | ------------------------- | ----------------- | ----------- | ---------------------------------- |
| Times     | `/master/teams`         | users             | master      | gestão de team assignments        |
| Usuários | `/master/invitations`   | user-cog          | master      | contas, aprovação e reativação |
| Tipos     | `/master/types`         | tags              | master      | work types                         |
| Pricing   | `/master/types/pricing` | badge-dollar-sign | master      | valores por tipo                   |

### Grupo: Operação

| Label              | Route                   | Icon       | Visible for | Notes                   |
| ------------------ | ----------------------- | ---------- | ----------- | ----------------------- |
| Pool               | `/admin/pool`         | database   | master      | leitura e suporte       |
| Importar Pool      | `/admin/pool/import`  | upload     | master      | se a política permitir |
| Pagamentos         | `/payments`           | banknote   | master      | visão administrativa   |
| Performance Global | `/performance/master` | line-chart | master      | visão agregada         |

### Grupo: Suporte

| Label           | Route         | Icon      | Visible for | Notes       |
| --------------- | ------------- | --------- | ----------- | ----------- |
| Manuais         | `/manuals`  | book-open | master      | referência |
| Configurações | `/settings` | settings  | master      | pessoais    |

---

## Observações de UX

- `Times`, `Usuários`, `Tipos` e `Pricing` são o núcleo estrutural do master.
- `Aprovações` e `Orders` existem, mas não devem “roubar” o foco do papel estrutural da role.
- Se quiser reduzir tamanho, `Importar Pool` pode desaparecer do menu e virar ação interna de `Pool`.

---

# Itens que não devem aparecer na sidebar

## Para ninguém

Itens técnicos, utilitários ou estados de sistema não devem aparecer no menu principal.

Exemplos:

- páginas internas de callback
- detalhes utilitários temporários
- páginas de teste
- telas escondidas de debug
- rotas “work in progress”

---

# Itens que podem existir fora do menu

Algumas rotas existem, mas não precisam ficar visíveis o tempo todo.

## Exemplos

| Route                       | Reason             |
| --------------------------- | ------------------ |
| `/orders/:id`             | detalhe contextual |
| `/payments/:id`           | detalhe contextual |
| `/admin/pool/batches/:id` | detalhe contextual |
| `/scopes/:id`             | detalhe contextual |

Essas rotas devem ser acessadas por clique interno, não por item fixo da sidebar.

---

# Comportamentos recomendados da sidebar

## 1. Destacar rota ativa

O item atual deve ficar visualmente claro.

## 2. Colapsável

Em desktop, permitir colapso.
Em mobile, usar drawer.

## 3. Cabeçalho com contexto da role

Exemplo:

- Assistant
- Inspector
- Admin
- Master

Não precisa berrar isso o tempo todo, mas ajuda.

## 4. Rodapé útil

No rodapé da sidebar:

- nome do usuário
- role
- botão de sair

## 5. Não exagerar em badges

Usar badge só onde tiver valor real:

- aprovações pendentes
- usuários pendentes
- maybe follow-ups críticos

---

# Versão mínima recomendada da implementação

## Assistant

- Dashboard
- Orders
- Inserção
- Scopes
- Meus pagamentos
- Manuais
- Configurações

## Inspector

- Dashboard
- Scopes
- Meus pagamentos
- Manuais
- Configurações

## Admin

- Dashboard Admin
- Aprovações
- Orders
- Pool
- Importar Pool
- Pagamentos
- Performance
- Scopes
- Manuais
- Configurações

## Master

- Dashboard Master
- Aprovações
- Orders
- Times
- Usuários
- Tipos
- Pricing
- Pool
- Pagamentos
- Performance Global
- Manuais
- Configurações

---

# Ordem de refinamento futura

## Etapa 1

Implementar itens básicos por role.

## Etapa 2

Adicionar grupos visuais.

## Etapa 3

Adicionar badges relevantes.

## Etapa 4

Revisar redundâncias e remover o que estiver sobrando.

---

# Objetivo final

A sidebar deve fazer o usuário sentir que o sistema foi pensado para ele.

Não para a equipe que programou.
Nem para o entusiasmo passageiro de quem criou 19 rotas num sábado.
