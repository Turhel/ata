# ATA Portal - Checklist Mestre do Projeto

> Estado consolidado com base no que já foi validado e implementado ao longo desta conversa.
>
> Convenção:
>
> - `[x]` concluído
> - `[ ]` pendente
> - `[-]` parcialmente iniciado / precisa evoluir

---

## 1. Fundação do projeto

### 1.1 Monorepo e estrutura

- [X] Monorepo com `pnpm`
- [X] Estrutura principal criada:
  - [X] `apps/api`
  - [X] `apps/web`
  - [X] `packages/contracts`
  - [X] `packages/shared`
  - [X] `infra/docker`
  - [X] `infra/caddy`
  - [X] `infra/scripts`
- [X] `pnpm-workspace.yaml` coerente
- [X] `tsconfig.base.json` coerente
- [X] `packageManager` definido
- [X] Scripts raiz básicos funcionando (`dev`, `dev:web`, `dev:api`, `build`, `typecheck`)

### 1.2 Higiene do repositório

- [X] `.gitignore` protegendo artefatos locais essenciais
- [X] `node_modules` fora do versionamento
- [X] `dist` fora do versionamento
- [X] `.env` fora do versionamento
- [X] `README.md` ajustado para refletir o bootstrap atual
- [ ] Revisar periodicamente documentação para acompanhar evolução real do código

---

## 2. Infraestrutura local

### 2.1 Banco e ambiente local

- [X] PostgreSQL via Docker
- [X] `docker-compose.dev.yml` funcional
- [X] Banco local sobe corretamente
- [X] Healthcheck do banco funcional
- [X] `GET /health` funcional

### 2.2 Ambiente de desenvolvimento

- [X] API sobe em modo dev
- [X] Web sobe em modo dev
- [X] Typecheck geral funcionando (`pnpm -r typecheck`)
- [X] Build geral funcionando (`pnpm -r build`)
- [ ] Endurecer setup para onboarding mais automático
- [ ] Definir fluxo mais robusto para preview / produção

---

## 3. Banco de dados e migrations

### 3.1 Schema operacional (`public.*`)

- [X] Drizzle configurado para o schema operacional
- [X] Migrations operacionais funcionando
- [X] Seed operacional funcionando

### 3.2 Schema de autenticação (`auth.*`)

- [X] Better Auth separado do Drizzle operacional
- [X] Migração do Better Auth funcionando via CLI própria
- [X] Separação entre auth e domínio operacional consolidada

### 3.3 Modelagem inicial do domínio

- [X] `users`
- [X] `user_roles`
- [X] `team_assignments`
- [X] `pool_import_batches`
- [X] `pool_import_items`
- [X] `orders`
- [X] `order_events`
- [X] `order_notes`
- [X] `inspectors`
- [X] `inspector_accounts`
- [X] `inspector_account_assignments`
- [X] `clients`
- [X] `work_types`
- [X] `payment_batches`
- [X] `payment_batch_items`

---

## 4. Autenticação, sessão e acesso

### 4.1 Better Auth

- [X] Better Auth embutida na API
- [X] Fluxo básico de `sign-up`
- [X] Fluxo básico de `sign-in`
- [X] `get-session` funcional
- [X] Cookies de sessão funcionando

### 4.2 Integração auth + usuário operacional

- [X] Vínculo `public.users.auth_user_id`
- [X] Helper `dev:link-auth-user`
- [X] `/me` usando sessão real + perfil operacional

### 4.3 CORS e comunicação frontend/backend

- [X] CORS mínimo em development
- [X] Credenciais/sessão funcionando em dev
- [ ] Revisar estratégia final de CORS / domínio real em produção

---

## 5. Usuários, roles e autorização

### 5.1 Base de autorização

- [X] Helper para exigir autenticação
- [X] Helper para exigir usuário operacional vinculado
- [X] Helper para exigir usuário ativo
- [X] Helper para exigir role

### 5.2 Gestão administrativa mínima de usuários

- [X] Listagem de usuários operacionais
- [X] Aprovação de usuário `pending -> active`
- [X] Bloqueio de usuário
- [X] Reativação de usuário
- [ ] Alteração de role com regras formais
- [ ] Regras mais completas para promoção/rebaixamento
- [ ] Gestão estrutural mais fina de permissões

### 5.3 Team assignments

- [-] Estrutura de banco existe

- [ ] Endpoints de team assignments
- [ ] CRUD mínimo de team assignments
- [ ] Visões por time
- [ ] Regras operacionais por time no workflow

---

## 6. Frontend mínimo atual

### 6.1 Interface dev existente

- [X] UI mínima de autenticação
- [X] Sign-in via Better Auth
- [X] Consulta a `/me`
- [X] Exibição de estados:
  - [X] deslogado
  - [X] autenticado sem profile operacional
  - [X] autenticado com profile operacional

### 6.2 Gestão mínima de usuários no frontend

- [X] Tela simples para listagem de usuários
- [X] Ações simples de aprovação/bloqueio/reativação

### 6.3 O que ainda falta no frontend

- [ ] Estrutura real de telas e rotas do app
- [ ] Views por role mais completas
- [-] Tela de detalhe de order (dev UI existente, n?o tela final)
- [-] Tela de hist?rico da order (dev UI existente, n?o tela final)
- [-] Tela de importa??o de pool (leitura/reprocessamento no dev UI, n?o fluxo final)
- [ ] Tela financeira
- [ ] Dashboard do assistant
- [ ] Dashboard administrativo
- [ ] UX de produção
- [ ] Tratamento melhor de loading/erro

---

## 7. Orders - base estrutural

### 7.1 Modelagem principal

- [X] `orders`
- [X] `order_events`
- [X] `pool_import_batches`
- [X] `pool_import_items`
- [X] `source_status` separado de `status`
- [X] enums principais do workflow de orders

### 7.2 Regras arquiteturais já respeitadas

- [X] Sem endpoint genérico para trocar status crítico
- [X] Workflow guiado por endpoints explícitos de negócio
- [X] Eventos críticos registrados em `order_events`
- [X] Permissão decidida na API

---

## 8. Orders - importação do pool

### 8.1 Import inicial já concluído

- [X] `POST /pool-import`
- [X] `GET /pool-import/batches/:id`
- [X] Criação de batch de importação
- [X] Criação de itens de importação
- [X] Criação de novas orders pelo import
- [X] Atualização básica de orders existentes pelo import
- [X] `raw_payload` preservado
- [X] Histórico inicial em `order_events`

### 8.2 O que ainda falta na importação

- [ ] Import real de `.xlsx`
- [ ] Parser robusto do arquivo real
- [ ] Política mais madura para `ignored` / `failed`
- [ ] Regras mais seguras para update sem destruir histórico operacional
- [X] Tratamento expl?cito para `source_status = Canceled`
- [ ] Melhor auditoria de mudanças entre batches
- [X] Resolu??o real para cat?logos (`client`, `work_type`, `inspector_account`)
- [X] Leitura administrativa de falhas por batch
- [X] Reprocessamento expl?cito de item falho

---

## 9. Orders - leitura administrativa

### 9.1 Já feito

- [X] `GET /orders` para `admin/master`
- [X] `GET /orders/:id` para `admin/master`
- [X] Contratos compartilhados em `packages/contracts`

### 9.2 Ainda falta

- [ ] Paginação
- [ ] Filtros básicos
- [ ] Ordenação controlada
- [X] Leitura de histórico por endpoint
- [X] Leitura de notas por endpoint
- [ ] Visões segmentadas por time

---

## 10. Orders - workflow do Assistant

### 10.1 Já implementado

- [X] `POST /orders/:id/claim`
- [X] `POST /orders/:id/submit`
- [X] Proteção de concorrência no `claim`
- [X] Validação mínima para `submit`
- [X] Bloqueio de `submit` em order cancelada

### 10.2 Ainda falta

- [X] `GET /orders` com visão real para assistant
- [X] Lista de ordens disponíveis
- [X] Lista de minhas ordens
- [X] Lista de meus follow-ups
- [X] `POST /orders/:id/resubmit`
- [X] `PATCH /orders/:id` com whitelist clara de campos permitidos
- [X] Regras de edição em `in_progress`
- [X] Regras de edição em `follow_up`
- [X] Bloqueios fortes em `approved`, `batched`, `paid`, `cancelled`
- [X] Tela m?nima dessas filas no frontend

---

## 11. Orders - workflow administrativo

### 11.1 Já implementado

- [X] `POST /orders/:id/follow-up`
- [X] `POST /orders/:id/reject`
- [X] `POST /orders/:id/approve`
- [X] `POST /orders/:id/return-to-pool`
- [X] Motivo obrigatório em `follow-up`
- [X] Motivo obrigatório em `reject`
- [X] Motivo obrigatório em `return-to-pool`
- [X] `approve` validando dados mínimos
- [X] Bloqueio de `approve` para ordens canceladas
- [X] `return-to-pool` explícito e auditável

### 11.2 Ainda falta

- [ ] Revisão de consistência fina dos códigos de erro de validação
- [X] Endpoint para leitura de `order_events`
- [X] Endpoint para leitura/cria??o de `order_notes`
- [ ] Regras mais ricas para conflito de duplicidade
- [ ] Ações administrativas extras conforme evolução do fluxo

---

## 12. Orders - cancelamento e consistência de origem

### 12.1 Base já existente

- [X] `source_status` separado do workflow interno
- [X] `submit` bloqueia ordem cancelada
- [X] `approve` bloqueia ordem cancelada

### 12.2 Ainda falta

- [X] Fluxo explícito para `source_status = Canceled` vindo do import
- [X] Geração de evento `cancelled_from_source` quando aplicável
- [X] Política clara para esconder/remover essas ordens da fila normal
- [X] Regras para preservar histórico quando cancelamento chega tardiamente

---

## 13. order_events e order_notes

### 13.1 order_events

- [X] Escrita de eventos principais do workflow
- [X] Eventos de import
- [X] Eventos de claim / submit / follow-up / reject / approve / return-to-pool
- [X] Endpoint de leitura de histórico por order
- [X] Exibi??o de hist?rico no frontend (dev UI)

### 13.2 order_notes

- [X] Modelagem aplicada no c?digo/banco
- [X] Endpoints para notas
- [-] Tipos de nota
- [X] Regras de visibilidade por role
- [-] Uso em follow-up/rejei??o/contexto administrativo

---

## 14. Catálogos operacionais

### 14.1 Inspetores e contas

- [X] `inspectors`
- [X] `inspector_accounts`
- [X] `inspector_account_assignments`
- [X] CRUD m?nimo administrativo
- [X] Resolu??o correta entre conta externa e pessoa
- [X] Hist?rico de titularidade de conta

### 14.2 Clientes

- [X] `clients`
- [X] CRUD m?nimo administrativo
- [X] Resolu??o do c?digo importado para cat?logo real

### 14.3 Tipos de trabalho

- [X] `work_types`
- [X] CRUD m?nimo administrativo
- [ ] Uso em validação operacional
- [X] Uso em futura regra de pagamento

---

## 15. Financeiro

### 15.1 Estrutura financeira m?nima

- [X] `payment_batches`
- [X] `payment_batch_items`
- [X] Enums/status do financeiro aplicados no schema

### 15.2 Workflow financeiro

- [X] `GET /payment-batches`
- [X] `POST /payment-batches/:id/close`
- [X] `POST /payment-batches/:id/pay`
- [ ] `POST /payment-batches/:id/close`
- [ ] `POST /payment-batches/:id/pay`
- [X] Sele??o de ordens `approved`
- [X] Marcar orders como `paid`
- [X] Travar orders como `batched`
- [ ] Marcar orders como `paid`
- [X] Impedir duplicidade da mesma order no mesmo lote

### 15.3 Regras financeiras

- [X] C?lculo por `work_type`
- [X] Snapshot de valores no lote
- [ ] Bloqueios fortes após `closed` / `paid`
- [ ] Visão resumida futura para assistant/inspector

---

## 16. Dashboards e visões por role

### 16.1 Assistant

- [ ] Dashboard pessoal
- [ ] Pendências próprias
- [ ] Follow-ups próprios
- [ ] Métricas próprias

### 16.2 Admin

- [ ] Dashboard administrativo
- [ ] Produtividade por time
- [ ] Pendências de revisão
- [ ] Visão de filas operacionais
- [ ] Indicadores financeiros

### 16.3 Master

- [ ] Visão estrutural global
- [ ] Painel de gestão ampla

### 16.4 Inspector

- [ ] Painel limitado ao escopo permitido

---

## 17. Testes

### 17.1 Ainda falta quase tudo aqui

- [ ] Testes unitários de regras de workflow
- [ ] Testes de integração da API
- [ ] Testes para auth + `/me`
- [ ] Testes para gestão de usuários
- [ ] Testes para importação do pool
- [ ] Testes para claim / submit / follow-up / reject / approve / return-to-pool
- [ ] Testes de concorrência em `claim`
- [ ] Testes básicos do frontend

---

## 18. Hardening da API

- [ ] Padronização melhor de erros
- [ ] Validação de payloads mais consistente
- [ ] Paginação nas listas principais
- [ ] Filtros e ordenação controlados
- [ ] Logs operacionais melhores
- [ ] Endurecimento de sessão e segurança conforme ambiente final
- [ ] Revisão de regras de autorização por contexto de recurso

---

## 19. Deploy, operação e produção

- [ ] Pipeline de deploy
- [ ] Estratégia clara para preview
- [ ] Estratégia clara para produção
- [ ] Configuração real de Caddy / reverse proxy
- [ ] Backup e restore realmente validados
- [ ] Runbook operacional mínimo
- [ ] Observabilidade mínima
- [ ] Checklist de recuperação de ambiente

---

## 20. Prioridade recomendada a partir de agora

### Próximos passos imediatos

- [X] Expandir `GET /orders` para visão do assistant
- [X] Criar UI m?nima para filas do assistant
- [X] Implementar `POST /orders/:id/resubmit`
- [X] Implementar `PATCH /orders/:id` com campos operacionais permitidos
- [X] Criar endpoint de leitura de `order_events`

### Próxima camada de domínio

- [X] Implementar `work_types`
- [X] Implementar `clients`
- [X] Implementar `inspectors`
- [X] Implementar `inspector_accounts`
- [X] Implementar `inspector_account_assignments`
- [X] Evoluir import do pool para resolver cat?logos

### Depois disso

- [X] Implementar financeiro
- [-] Implementar financeiro
- [ ] Implementar dashboards
- [ ] Adicionar testes
- [ ] Preparar produção

---

## 21. Resumo executivo

### Base já pronta

- [X] Fundação técnica do projeto
- [X] Banco local e migrations
- [X] Autenticação e sessão
- [X] Usuário operacional e roles básicas
- [X] Bootstrap local funcional
- [X] Núcleo inicial do workflow de orders
- [X] Cat?logos operacionais m?nimos
- [X] Base financeira m?nima de loteamento

### Meio do caminho

- [-] Frontend ainda é majoritariamente dev UI
- [-] Orders j? t?m workflow base, mas faltam refinamentos, time views e telas finais
- [-] Import j? existe, com falhas/reprocessamento e cat?logos, mas ainda n?o ? o import final do arquivo real

### Grandes blocos ainda faltando

- [-] Cat?logos operacionais completos
- [-] Financeiro completo (base pronta, faltam vis�es e endurecimento)
- [-] Financeiro completo
- [ ] Dashboards
- [ ] Testes automatizados
- [ ] Endurecimento e produção

---

## 22. Definição prática de "projeto finalizado"

Considerar o projeto realmente concluído quando, no mínimo, existir:

- [ ] fluxo completo de auth e acesso por role
- [ ] gestão administrativa básica estável
- [ ] import real do pool por `.xlsx`
- [ ] workflow completo de orders para assistant e admin
- [ ] histórico legível de orders
- [ ] catálogos operacionais completos
- [ ] financeiro com snapshot e lotes
- [ ] frontend utilizável além do modo dev
- [ ] testes cobrindo o núcleo crítico
- [ ] processo de deploy/restore/documentação operacional coerente
