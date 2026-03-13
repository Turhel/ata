# ATA Portal — Migração do Legado

## Objetivo

Este documento define a estratégia oficial de migração do sistema antigo (**ata-production**) para o novo sistema (**ata-portal**).

Ele serve para:

- decidir o que será reaproveitado
- decidir o que será refeito
- decidir o que será descartado
- orientar a ordem correta da migração
- evitar copiar problemas antigos para a nova base
- transformar o legado em fonte de regra de negócio, não em fonte de arquitetura

---

# Princípio central da migração

## Regra de ouro

O sistema antigo será usado para extrair:

- regras de negócio reais
- entidades e fluxos que já existem na operação
- nomenclaturas operacionais
- comportamento esperado das telas
- validações importantes

O sistema antigo **não** será usado como referência obrigatória de:

- arquitetura
- autenticação
- modelagem final do banco
- organização de pastas
- estilo de código
- padrões de integração

---

# Diagnóstico do legado

## O que o legado já provou

O projeto antigo já prova que o domínio principal do negócio existe e é válido:

- ordens
- usuários
- times
- inspetores
- tipos de trabalho
- importação de pool
- pagamentos
- métricas
- escopos/checklists
- requests administrativas

Esses domínios aparecem tanto na estrutura do repositório quanto na organização da API e da documentação operacional.

---

## O que o legado não deve arrastar para o novo projeto

O legado foi fortemente moldado por restrições de custo e egress, o que levou a uma arquitetura de transição com:

- Clerk
- Supabase HOT
- Turso COLD
- Vercel Functions
- camada `legacy/*`
- compatibilidade com IDs antigos
- normalizações e remendos de `clerk_user_id` para `users.id`
- coexistência de formatos novos e antigos de resposta

Essa realidade foi útil para sobreviver no projeto anterior, mas não deve ser reproduzida no novo sistema.

---

# Fontes de verdade do legado

## Fontes confiáveis para extração de regra

Ao migrar, considerar como fontes úteis:

### 1. Documentação do legado

- `README.md`
- `docs/README-HANDOFF.md`
- `docs/README-objetivos.md`
- demais documentos operacionais relevantes

### 2. Estrutura de API do legado

Domínios observados na pasta `api/`:

- `inspectors`
- `orders`
- `payments`
- `pool`
- `requests`
- `scopes`
- `users`
- `work-types`
- `legacy`

### 3. Estrutura de frontend do legado

Pastas observadas em `src/`:

- `components`
- `hooks`
- `pages`
- `lib`

### 4. Fluxos reais do negócio

Especialmente:

- assistente
- admin
- importação do pool
- aprovação
- follow-up
- rejeição
- pagamentos
- métricas por time

---

# Regras da migração

## 1. Não fazer “port” cego de código

Nenhum módulo do legado deve ser simplesmente copiado para o novo projeto sem reavaliação.

### Motivo

O código antigo contém:

- compatibilidades temporárias
- dependências de serviços removidos do novo plano
- formatos de resposta moldados por transição
- lógica de remendo para IDs e rotas

---

## 2. Reaproveitar regra, não gambiarra

Sempre que houver dúvida entre:

- copiar implementação antiga
- reimplementar com base na regra de negócio

a escolha padrão deve ser:

**reimplementar com base na regra de negócio**

---

## 3. Assistente vem primeiro

A migração do novo sistema deve priorizar o fluxo do **Assistant** antes de Admin/Master.

### Motivo

É o fluxo mais crítico para a operação diária:

- assumir ordem
- trabalhar ordem
- enviar
- responder follow-up
- acompanhar pendências

Se o fluxo do assistente estiver sólido, o núcleo operacional do sistema estará de pé.

---

## 4. O novo sistema não terá camada `legacy`

No `ata-portal`, não devemos criar:

- `/api/legacy/*`
- tabelas de compatibilidade sem necessidade real
- payloads híbridos para agradar código antigo

### Regra

O novo projeto deve nascer limpo.

Compatibilidade com o passado só deve existir:

- em scripts de migração
- em importadores
- em leitura controlada de dados antigos
- em documentação de transição

---

# Classificação dos módulos do legado

## Critério de classificação

Cada módulo legado deve cair em uma das categorias:

- **Reaproveitar conceito**
- **Refazer**
- **Descartar por enquanto**
- **Descartar definitivamente**

---

# Inventário de migração

## 1. Auth / identidade

### No legado

- Clerk
- `clerk_user_id`
- resolução para `users.id`
- várias adaptações para compatibilidade de identidade

### Decisão

**Refazer**

### No novo sistema

- Better Auth
- identidade interna própria
- `users.id` como identidade operacional desde o início
- sem herança de `clerk_user_id`

### Motivo

A arquitetura antiga foi condicionada por Clerk e por migração de IDs.
No novo projeto, isso deve nascer limpo.

---

## 2. Users / profiles / roles

### No legado

Existe base sólida de:

- usuários
- roles
- profiles
- team assignments
- normalização de IDs internos

### Decisão

**Reaproveitar conceito e refazer implementação**

### Reaproveitar

- ideia de `users.id` como identidade interna
- segmentação por roles
- aprovação manual
- vínculos de time

### Refazer

- tabelas
- API
- autorização
- shape das respostas
- fluxo de cadastro/aprovação

---

## 3. Team assignments

### No legado

Time admin → assistentes já existe e é central para visão operacional.

### Decisão

**Reaproveitar conceito e refazer implementação**

### Motivo

É domínio real do negócio.
Mas o novo projeto deve modelar isso de forma direta, sem compatibilidade com payload antigo.

---

## 4. Orders

### No legado

`legacy/orders` foi explicitamente congelado e a documentação registra migração gradual para `/api/orders`.

### Decisão

**Reaproveitar regra e refazer totalmente**

### Reaproveitar

- fluxo de ciclo de vida da ordem
- campos operacionais relevantes
- importância da tabela central de ordens
- associação com pool, follow-up, aprovação e pagamento

### Refazer

- modelagem da tabela
- endpoints
- regras de status
- histórico
- visibilidade por role
- acoplamento com auth

### Regra

O módulo de ordens do novo projeto não deve carregar nenhuma dependência da camada `legacy`.

---

## 5. Pool import

### No legado

Há domínio próprio de `pool` e batches de importação.

### Decisão

**Reaproveitar conceito e refazer implementação**

### Reaproveitar

- ideia de batch
- rastreabilidade por arquivo
- vínculo da ordem com importação
- parse do `.xlsx`
- importância de preservar payload bruto

### Refazer

- schema
- validações
- status de importação
- estratégia de update
- tratamento de colunas inúteis

---

## 6. Work types

### No legado

Existe domínio específico de `work-types`.

### Decisão

**Reaproveitar conceito e refazer implementação**

### Motivo

`OTYPE` é crítico para:

- classificação operacional
- pagamento
- filtros
- relatórios

Isso precisa existir no novo sistema como catálogo formal.

---

## 7. Inspectors

### No legado

Existe domínio próprio de `inspectors`.

### Decisão

**Reaproveitar conceito e ampliar modelagem**

### Reaproveitar

- gestão de inspetores
- necessidade operacional do cadastro

### Ajustar no novo sistema

- separar `inspectors` de `inspector_accounts`
- permitir histórico de vínculo entre pessoa e conta
- tratar contas como `ATAVENDXX` e `RZALF` como entidades próprias

### Motivo

O XLSX mostrou que conta e pessoa não são a mesma coisa.

---

## 8. Payments

### No legado

Há domínio próprio de `payments` e também itens/lotes de pagamento no handoff.

### Decisão

**Reaproveitar conceito e refazer implementação**

### Reaproveitar

- loteamento
- necessidade de congelar snapshot
- visões administrativas
- relação com assistente e tipo de trabalho

### Refazer

- schema
- cálculo
- fechamento de lote
- trilha de auditoria
- regra de travamento financeiro

---

## 9. Requests

### No legado

Existe domínio `requests`, além de casos como:

- duplicate requests
- work type requests
- payment requests

### Decisão

**Descartar por enquanto no MVP**
com possibilidade de retorno futuro de forma redesenhada

### Motivo

O núcleo novo precisa primeiro resolver:

- auth
- users
- orders
- import
- payment
- dashboard

Requests especializados podem voltar depois como módulo formal, sem nascer acoplados ao legado.

---

## 10. Scopes / checklist

### No legado

O handoff mostra que `scopes` já opera em `public.scopes` + `public.scope_items`, e havia fluxo assistente → inspetor em estabilização.

### Decisão

**Adiar no MVP base, mas preservar como módulo futuro importante**

### Reaproveitar

- conceito de checklist/escopo
- lookup por ordem
- vínculo com inspeção

### Não priorizar agora

Porque o novo projeto primeiro precisa fechar o núcleo operacional e financeiro.

---

## 11. Notifications

### No legado

Existem endpoints e preferências de notificação.

### Decisão

**Descartar por enquanto**

### Motivo

Não é parte do núcleo mínimo do novo sistema.
Pode voltar depois, de forma muito mais simples, quando a operação base estiver estável.

---

## 12. Métricas e dashboards

### No legado

Existem métricas, stats e foco em visibilidade operacional.

### Decisão

**Reaproveitar conceito e refazer implementação**

### Reaproveitar

- necessidade de dashboards por role
- visão por time
- visão de follow-up
- produtividade e fechamento

### Refazer

- fontes de dados
- queries
- agregações
- cache
- layout das telas

---

## 13. HOT/COLD split

### No legado

A separação HOT/COLD existia por restrição de custo e egress.

### Decisão

**Descartar definitivamente no início do novo projeto**

### Novo sistema

- um PostgreSQL central
- sem Turso
- sem separação artificial de leitura fria/quente no day 1

### Motivo

A complexidade não se paga no cenário atual do time.

---

## 14. Supabase integration no frontend

### No legado

Ainda existe pasta `src/integrations/supabase`, mesmo com a diretriz de não usar Supabase no browser.

### Decisão

**Descartar definitivamente**

### Motivo

No novo projeto:

- frontend não fala com Supabase
- frontend não fala com banco
- frontend fala apenas com a API

---

# Ordem oficial da migração

## Fase 0 — Fundação

Objetivo: criar a base limpa do novo sistema.

### Entregas

- monorepo
- Docker Compose
- PostgreSQL
- Better Auth
- API base
- web base
- `/health`
- `.env.example`
- seed inicial

### Migração do legado

Nenhum código é trazido.
Apenas documentação e referência conceitual.

---

## Fase 1 — Auth + Users + Roles

Objetivo: identidade e acesso.

### Entregas

- login
- sessão
- `/me`
- aprovação manual
- roles
- users
- team assignments

### Base no legado

- conceito de IDs internos
- profiles/users/roles
- team assignments

### Não trazer

- Clerk
- `clerk_user_id`
- payloads híbridos

---

## Fase 2 — Orders núcleo

Objetivo: tabela central funcionando.

### Entregas

- listagem de ordens
- detalhes da ordem
- claim
- edição operacional
- submit
- follow-up
- reject
- approve
- return to pool
- order_events
- order_notes

### Base no legado

- fluxo de ordens
- campos operacionais relevantes
- visão assistente/admin

### Não trazer

- `legacy/orders`
- compatibilidade de shape antigo

---

## Fase 3 — Pool import

Objetivo: colocar ordens reais no sistema.

### Entregas

- upload `.xlsx`
- batch de importação
- items de importação
- parse
- preview
- create/update por `external_order_code`
- preservação de `raw_payload`

### Base no legado

- domínio de pool
- batches
- fluxo operacional de importação

---

## Fase 4 — Catálogos operacionais

Objetivo: estabilizar o domínio.

### Entregas

- `clients`
- `work_types`
- `inspectors`
- `inspector_accounts`
- `inspector_account_assignments`

### Base no legado

- work-types
- inspectors
- conhecimento operacional do time

---

## Fase 5 — Financeiro

Objetivo: fechar a parte que realmente economiza teu tempo.

### Entregas

- `payment_batches`
- `payment_batch_items`
- regras de elegibilidade
- snapshot financeiro
- fechamento
- marcação de pago

### Base no legado

- payments
- batch items
- open balance
- relação entre ordem e fechamento

---

## Fase 6 — Dashboards

Objetivo: visibilidade operacional.

### Entregas

- dashboard do assistant
- dashboard do admin
- pendências
- follow-ups
- produtividade
- pagamentos/resumos

### Base no legado

- stats
- métricas por time
- visão administrativa

---

## Fase 7 — Módulos futuros

Objetivo: reintroduzir apenas o que ainda fizer sentido.

### Possíveis candidatos

- scopes/checklists
- requests especializadas
- notificações
- painel do inspetor
- automações

### Regra

Só entram após o núcleo estar estável.

---

# O que pode ser consultado no legado durante a implementação

## Pode consultar sem medo

- nomes de telas
- nomes de fluxos
- payloads antigos para entender o negócio
- documentos operacionais
- casos de borda já descobertos
- listas de endpoints antigos

---

## Deve ser tratado com cautela

- formatos antigos de resposta
- qualquer coisa em `legacy/*`
- remendos de compatibilidade com IDs
- lógica condicionada por Clerk
- lógica condicionada por Supabase/Turso
- soluções feitas só para reduzir egress

---

# O que não migrar

## Não migrar para o novo projeto

- Clerk
- Supabase no browser
- Turso COLD
- arquitetura HOT/COLD
- `legacy/orders`
- `legacy/*` como padrão
- `clerk_user_id` como identidade operacional
- endpoints compatibilistas por tempo indeterminado
- duplicação de domínio em múltiplos namespaces
- qualquer regra feita só para contornar custo de egress

---

# Critérios de migração bem-sucedida

A migração do legado será considerada bem-sucedida quando:

- o fluxo do assistente estiver 100% funcional no novo sistema
- o admin conseguir revisar, aprovar, rejeitar e lotear sem depender do sistema antigo
- a importação `.xlsx` alimentar o novo banco diretamente
- pagamento puder ser fechado no novo sistema
- dashboards essenciais existirem no novo sistema
- o legado virar apenas referência histórica ou ferramenta temporária de consulta

---

# Sinais de que a migração está errada

## Alerta vermelho

- criar `/api/legacy` no projeto novo
- copiar tabela antiga sem revisar o domínio
- reintroduzir `clerk_user_id` como ID funcional
- manter duas fontes de verdade para ordens
- depender de payload híbrido “por compatibilidade”
- deixar módulo novo imitar bug antigo porque “já funcionava assim”
- modelar o banco novo ao redor da arquitetura antiga, e não do negócio

---

# Estratégia de desligamento do legado

## Etapa 1

Legado usado como referência e consulta.

## Etapa 2

Novo sistema assume o fluxo do assistente.

## Etapa 3

Novo sistema assume o fluxo administrativo principal.

## Etapa 4

Novo sistema assume financeiro.

## Etapa 5

Legado fica somente leitura, se necessário.

## Etapa 6

Legado pode ser arquivado.

---

# Conclusão

O sistema antigo é valioso como:

- memória operacional
- fonte de regra de negócio
- inventário de módulos
- registro de problemas já descobertos

Mas ele não deve ditar a arquitetura do novo projeto.

No **ATA Portal**, a política oficial de migração é:

- reaproveitar **domínio**
- reaproveitar **regras**
- reaproveitar **nomenclatura útil**
- refazer **arquitetura**
- refazer **auth**
- refazer **API**
- refazer **banco**
- descartar **compatibilidades temporárias**

Se o legado servir para ensinar, ótimo.
Se começar a mandar no projeto novo, ele vira doença crônica.
