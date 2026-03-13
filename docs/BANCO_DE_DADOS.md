
# ATA Portal — Banco de Dados

## Objetivo

Este documento define a estrutura inicial do banco de dados do **ATA Portal**.

Ele serve como referência para:

- criação das migrations
- implementação da API
- validação das regras de integridade
- definição de relacionamentos
- padronização de nomes
- mapeamento entre o fluxo operacional do portal e os dados importados do `.xlsx`

---

# Princípios de modelagem

## 1. Banco em inglês e `snake_case`

### Padrão:

- tabelas em plural
- colunas em `snake_case`
- chaves primárias como `id`
- chaves estrangeiras com nome explícito

### Exemplos:

- `users`
- `user_roles`
- `team_assignments`
- `inspector_accounts`
- `order_events`

---

## 2. Toda tabela principal deve ter auditoria mínima

Campos padrão recomendados:

- `id`
- `created_at`
- `updated_at`

Quando fizer sentido, incluir também:

- `created_by_user_id`
- `updated_by_user_id`

---

## 3. Status de origem e status interno são coisas diferentes

O arquivo `.xlsx` contém um **status de origem** (`STATUS`) que representa o estado vindo do sistema externo.

O portal também possui um **status operacional interno**, usado no workflow do time.

Esses dois conceitos **não devem ser misturados**.

### Exemplo:

- `source_status = Assigned`
- `internal_status = in_progress`

---

## 4. Conta externa não é pessoa

O campo `INSPECTOR` do `.xlsx` representa a **conta externa** onde a ordem está alocada, como:

- `ATAVEND07`
- `ATAVEND04`
- `RZALF`

Isso **não é necessariamente o inspetor como pessoa física**.

Por isso o banco precisa separar:

- **conta externa**
- **inspetor/pessoa**
- **histórico de vínculo entre conta e pessoa**

---

## 5. A tabela central do sistema é `orders`

O restante do banco existe para sustentar:

- acesso
- operação
- importação
- histórico
- financeiro

---

# Mapeamento do XLSX para o banco

## Colunas observadas no arquivo de importação

- `STATUS`
- `WORDER`
- `INSPECTOR`
- `CLIENT`
- `NAME`
- `ADDRESS1`
- `ADDRESS2`
- `CITY`
- `ZIP`
- `OTYPE`
- `DUEDATE`
- `WINDOW`
- `START DATE`
- `NEGLECT`
- `RUSH`
- `FOLLOWUP`
- `VACANT`
- `MORTGAGE`
- `VANDALISM`
- `FREEZE`
- `STORM`
- `ROOF`
- `WATER`
- `NATURAL`
- `FIRE`
- `HAZARD`
- `STRUCTURE`
- `MOLD`
- `PUMP`

---

## Interpretação oficial dessas colunas

### `STATUS`

Status vindo do sistema externo.

Exemplos observados:

- `Assigned`
- `Canceled`
- `Received`

Esse valor será salvo como **`source_status`**.

---

### `WORDER`

Código externo da ordem.

Esse valor será salvo como:

- `orders.external_order_code`

---

### `INSPECTOR`

Conta externa onde a ordem está alocada.

Exemplos:

- `ATAVEND07`
- `ATAVEND04`
- `RZALF`

Esse valor será salvo via FK para:

- `inspector_accounts`

---

### `CLIENT`

Cliente contratante do serviço.

Exemplos:

- banco
- seguradora
- empresa
- seguradora atendendo pessoa física

Esse valor será salvo via FK para:

- `clients`

---

### `NAME`

Nome do morador/residente associado à ordem.

Esse valor será salvo como:

- `orders.resident_name`

---

### `ADDRESS1`

Endereço principal.

### `ADDRESS2`

Complemento.
É opcional e normalmente nulo.

---

### `OTYPE`

Tipo de ordem.

Esse campo é **extremamente importante** porque influencia:

- classificação do trabalho
- regras operacionais
- cálculo de pagamento

Esse valor será salvo via FK para:

- `work_types`

---

### `DUEDATE`

No arquivo de origem, representa a **data limite final** da ordem.

No sistema novo, o nome interno sugerido é:

- `deadline_date`

---

### `START DATE`

No arquivo de origem, representa o **dia em que a ordem abre para resposta**.

No sistema novo, o nome interno sugerido é:

- `available_date`

> Observação importante:
> no uso operacional de vocês, quando se fala em “due date” na pasta (`!DUE DATE 03-10`), isso costuma se referir ao **`START DATE`** do arquivo, ou seja, ao dia em que a ordem ficou disponível.Para evitar confusão futura, o banco não deve usar os nomes ambíguos `due_date` e `start_date` como nomes centrais do domínio.O banco deve preferir:
>
> - `available_date`
> - `deadline_date`

---

### `WINDOW`

Considerado desnecessário para o novo sistema.
Se `available_date` e `deadline_date` existem, `WINDOW` não precisa dirigir a modelagem.

Não será armazenado em coluna dedicada do domínio principal.

Se necessário, ficará apenas em `raw_payload`.

---

### `FOLLOWUP`

Considerado inútil para o novo sistema.

Não será armazenado como campo de negócio.

Se necessário para auditoria de importação, ficará apenas em `raw_payload`.

---

### `VACANT`

Pode continuar útil operacionalmente.
Será armazenado como:

- `orders.is_vacant`

---

### `RUSH`

Pode ser útil operacionalmente.
Será armazenado como:

- `orders.is_rush`

---

### Flags após `VACANT`

Campos:

- `MORTGAGE`
- `VANDALISM`
- `FREEZE`
- `STORM`
- `ROOF`
- `WATER`
- `NATURAL`
- `FIRE`
- `HAZARD`
- `STRUCTURE`
- `MOLD`
- `PUMP`

Segundo a regra atual, esses campos **não têm uso prático**.

Não serão modelados como colunas dedicadas.

Se necessário, ficam apenas em `raw_payload`.

---

# Enums oficiais

## `user_status`

- `pending`
- `active`
- `blocked`
- `inactive`

---

## `role_code`

- `master`
- `admin`
- `assistant`
- `inspector`

---

## `inspector_account_type`

- `field`
- `master`
- `shared`
- `inactive`

### Significado

- `field`: conta normal de operação de um inspetor
- `master`: conta com visão ampla/global
- `shared`: conta compartilhada ou especial
- `inactive`: conta desativada

---

## `source_order_status`

Status importado do sistema externo.

Valores iniciais observados:

- `Assigned`
- `Received`
- `Canceled`

Esse enum pode crescer conforme novos arquivos forem aparecendo.

---

## `order_status`

Status interno do workflow do portal.

- `available`
- `in_progress`
- `submitted`
- `follow_up`
- `rejected`
- `approved`
- `batched`
- `paid`
- `cancelled`
- `archived`

---

## `order_event_type`

- `created`
- `claimed`
- `updated`
- `submitted`
- `follow_up_requested`
- `resubmitted`
- `rejected`
- `approved`
- `returned_to_pool`
- `batched`
- `paid`
- `cancelled_from_source`
- `archived`

---

## `payment_batch_status`

- `open`
- `closed`
- `paid`
- `cancelled`

---

## `import_batch_status`

- `processing`
- `completed`
- `failed`
- `partially_completed`

---

# Tabelas principais

---

# 1. `users`

## Finalidade

Armazena os usuários internos do sistema.

## Colunas

- `id` UUID PK
- `email` VARCHAR(255) NOT NULL UNIQUE
- `full_name` VARCHAR(255) NOT NULL
- `status` VARCHAR(30) NOT NULL DEFAULT `pending`
- `auth_user_id` VARCHAR(255) UNIQUE NULL
- `last_login_at` TIMESTAMP NULL
- `approved_at` TIMESTAMP NULL
- `approved_by_user_id` UUID NULL
- `blocked_at` TIMESTAMP NULL
- `blocked_by_user_id` UUID NULL
- `notes` TEXT NULL
- `created_at` TIMESTAMP NOT NULL
- `updated_at` TIMESTAMP NOT NULL

## Regras

- `email` deve ser único
- `status` deve respeitar `user_status`
- usuário novo entra como `pending`
- aprovação é manual
- `auth_user_id` é o vínculo com o usuário do **Better Auth** (identidade/sessão), enquanto `users` permanece como perfil operacional interno

## FKs

- `approved_by_user_id` → `users.id`
- `blocked_by_user_id` → `users.id`

## Índices

- índice único em `email`
- índice em `status`

---

# 2. `user_roles`

## Finalidade

Define a role do usuário no sistema.

## Colunas

- `id` UUID PK
- `user_id` UUID NOT NULL
- `role_code` VARCHAR(30) NOT NULL
- `assigned_at` TIMESTAMP NOT NULL
- `assigned_by_user_id` UUID NOT NULL
- `is_active` BOOLEAN NOT NULL DEFAULT TRUE
- `created_at` TIMESTAMP NOT NULL
- `updated_at` TIMESTAMP NOT NULL

## Regras

- `role_code` deve respeitar `role_code`
- inicialmente, considerar **uma role ativa por usuário**
- histórico de troca de role pode ser preservado via `is_active`

## FKs

- `user_id` → `users.id`
- `assigned_by_user_id` → `users.id`

## Índices

- índice em `user_id`
- índice em `role_code`
- índice composto em (`user_id`, `is_active`)

---

# 3. `team_assignments`

## Finalidade

Define a relação entre admins e assistentes.

## Colunas

- `id` UUID PK
- `admin_user_id` UUID NOT NULL
- `assistant_user_id` UUID NOT NULL
- `is_active` BOOLEAN NOT NULL DEFAULT TRUE
- `start_date` DATE NOT NULL
- `end_date` DATE NULL
- `created_at` TIMESTAMP NOT NULL
- `updated_at` TIMESTAMP NOT NULL

## Regras

- um assistente pode ter um admin responsável por vez, salvo futura regra diferente
- histórico deve ser preservado

## FKs

- `admin_user_id` → `users.id`
- `assistant_user_id` → `users.id`

## Índices

- índice em `admin_user_id`
- índice em `assistant_user_id`
- índice em `is_active`

## Constraints

- impedir `admin_user_id = assistant_user_id`

---

# 4. `inspectors`

## Finalidade

Cadastro da pessoa real do inspetor.

## Colunas

- `id` UUID PK
- `full_name` VARCHAR(255) NOT NULL
- `email` VARCHAR(255) NULL
- `phone` VARCHAR(50) NULL
- `status` VARCHAR(30) NOT NULL DEFAULT `active`
- `notes` TEXT NULL
- `created_at` TIMESTAMP NOT NULL
- `updated_at` TIMESTAMP NOT NULL

## Regras

- representa a pessoa física/operacional
- não representa a conta externa do sistema de origem

## Índices

- índice em `status`
- índice em `full_name`

---

# 5. `inspector_accounts`

## Finalidade

Cadastro das contas externas de trabalho.

## Exemplos

- `ATAVEND07`
- `ATAVEND04`
- `RZALF`

## Colunas

- `id` UUID PK
- `account_code` VARCHAR(50) NOT NULL UNIQUE
- `account_type` VARCHAR(30) NOT NULL DEFAULT `field`
- `description` VARCHAR(255) NULL
- `current_inspector_id` UUID NULL
- `is_active` BOOLEAN NOT NULL DEFAULT TRUE
- `created_at` TIMESTAMP NOT NULL
- `updated_at` TIMESTAMP NOT NULL

## Regras

- `account_code` deve ser único
- a conta pode ser reutilizada por outro inspetor no futuro
- `current_inspector_id` representa o vínculo atual, não o histórico completo
- contas do tipo `master` podem não ter inspetor de campo vinculado

## FKs

- `current_inspector_id` → `inspectors.id`

## Índices

- índice único em `account_code`
- índice em `account_type`
- índice em `current_inspector_id`

---

# 6. `inspector_account_assignments`

## Finalidade

Histórico de vínculo entre uma conta externa e um inspetor.

## Colunas

- `id` UUID PK
- `inspector_account_id` UUID NOT NULL
- `inspector_id` UUID NOT NULL
- `start_date` DATE NOT NULL
- `end_date` DATE NULL
- `is_active` BOOLEAN NOT NULL DEFAULT TRUE
- `notes` TEXT NULL
- `created_at` TIMESTAMP NOT NULL
- `updated_at` TIMESTAMP NOT NULL

## Regras

- preserva histórico de quem estava usando cada conta em cada período
- essencial porque `ATAVENDXX` pode mudar de dono no tempo

## FKs

- `inspector_account_id` → `inspector_accounts.id`
- `inspector_id` → `inspectors.id`

## Índices

- índice em `inspector_account_id`
- índice em `inspector_id`
- índice em `is_active`

---

# 7. `clients`

## Finalidade

Catálogo de clientes contratantes.

## Exemplos

- banco
- seguradora
- empresa
- outros contratantes

## Colunas

- `id` UUID PK
- `client_code` VARCHAR(80) NOT NULL UNIQUE
- `name` VARCHAR(255) NULL
- `description` TEXT NULL
- `is_active` BOOLEAN NOT NULL DEFAULT TRUE
- `created_at` TIMESTAMP NOT NULL
- `updated_at` TIMESTAMP NOT NULL

## Regras

- o arquivo traz `CLIENT` como código operacional
- inicialmente, `client_code` é o campo mais importante
- `name` pode ser preenchido depois, caso exista nome amigável

## Índices

- índice único em `client_code`
- índice em `is_active`

---

# 8. `work_types`

## Finalidade

Catálogo dos tipos de ordem/trabalho.

## Colunas

- `id` UUID PK
- `code` VARCHAR(50) NOT NULL UNIQUE
- `name` VARCHAR(120) NULL
- `description` TEXT NULL
- `is_active` BOOLEAN NOT NULL DEFAULT TRUE
- `default_payment_amount_assistant` NUMERIC(12,2) NULL
- `default_payment_amount_inspector` NUMERIC(12,2) NULL
- `created_at` TIMESTAMP NOT NULL
- `updated_at` TIMESTAMP NOT NULL

## Regras

- `code` deve ser único
- `OTYPE` do arquivo mapeia para `code`
- esse catálogo é crítico para cálculo de pagamento

## Índices

- índice único em `code`
- índice em `is_active`

---

# 9. `pool_import_batches`

## Finalidade

Representa cada importação de arquivo `.xlsx`.

## Colunas

- `id` UUID PK
- `file_name` VARCHAR(255) NOT NULL
- `status` VARCHAR(30) NOT NULL
- `total_rows` INTEGER NOT NULL DEFAULT 0
- `inserted_rows` INTEGER NOT NULL DEFAULT 0
- `updated_rows` INTEGER NOT NULL DEFAULT 0
- `ignored_rows` INTEGER NOT NULL DEFAULT 0
- `error_rows` INTEGER NOT NULL DEFAULT 0
- `started_at` TIMESTAMP NOT NULL
- `finished_at` TIMESTAMP NULL
- `imported_by_user_id` UUID NOT NULL
- `notes` TEXT NULL
- `created_at` TIMESTAMP NOT NULL
- `updated_at` TIMESTAMP NOT NULL

## Regras

- `status` deve respeitar `import_batch_status`
- cada arquivo importado gera um batch

## FKs

- `imported_by_user_id` → `users.id`

## Índices

- índice em `status`
- índice em `imported_by_user_id`
- índice em `started_at`

---

# 10. `pool_import_items`

## Finalidade

Guarda cada linha importada do arquivo de pool.

## Colunas

- `id` UUID PK
- `batch_id` UUID NOT NULL
- `external_order_code` VARCHAR(120) NOT NULL
- `source_status` VARCHAR(30) NOT NULL
- `source_inspector_account_code` VARCHAR(50) NULL
- `source_client_code` VARCHAR(80) NULL
- `source_work_type_code` VARCHAR(50) NULL
- `raw_payload` JSONB NOT NULL
- `matched_order_id` UUID NULL
- `import_action` VARCHAR(30) NOT NULL
- `line_number` INTEGER NOT NULL
- `error_message` TEXT NULL
- `created_at` TIMESTAMP NOT NULL
- `updated_at` TIMESTAMP NOT NULL

## Regras

- `import_action` pode ser:
  - `created`
  - `updated`
  - `ignored`
  - `failed`
- `raw_payload` preserva o conteúdo bruto da linha
- campos inúteis hoje podem permanecer só em `raw_payload`

## FKs

- `batch_id` → `pool_import_batches.id`
- `matched_order_id` → `orders.id`

## Índices

- índice em `batch_id`
- índice em `external_order_code`
- índice em `matched_order_id`
- índice em `source_status`

---

# 11. `orders`

## Finalidade

Tabela central do sistema.

## Colunas

- `id` UUID PK
- `external_order_code` VARCHAR(120) NOT NULL UNIQUE
- `source_status` VARCHAR(30) NOT NULL
- `status` VARCHAR(30) NOT NULL DEFAULT `available`
- `client_id` UUID NULL
- `resident_name` VARCHAR(255) NULL
- `address_line_1` VARCHAR(255) NULL
- `address_line_2` VARCHAR(255) NULL
- `city` VARCHAR(120) NULL
- `state` VARCHAR(50) NULL
- `zip_code` VARCHAR(30) NULL
- `work_type_id` UUID NULL
- `inspector_account_id` UUID NULL
- `assigned_inspector_id` UUID NULL
- `assistant_user_id` UUID NULL
- `source_import_batch_id` UUID NULL
- `available_date` DATE NULL
- `deadline_date` DATE NULL
- `is_rush` BOOLEAN NOT NULL DEFAULT FALSE
- `is_vacant` BOOLEAN NOT NULL DEFAULT FALSE
- `claimed_at` TIMESTAMP NULL
- `submitted_at` TIMESTAMP NULL
- `approved_at` TIMESTAMP NULL
- `rejected_at` TIMESTAMP NULL
- `follow_up_at` TIMESTAMP NULL
- `returned_to_pool_at` TIMESTAMP NULL
- `batched_at` TIMESTAMP NULL
- `paid_at` TIMESTAMP NULL
- `cancelled_at` TIMESTAMP NULL
- `completed_at` TIMESTAMP NULL
- `payment_locked` BOOLEAN NOT NULL DEFAULT FALSE
- `current_payment_batch_item_id` UUID NULL
- `created_at` TIMESTAMP NOT NULL
- `updated_at` TIMESTAMP NOT NULL

## Regras

- `external_order_code` deve ser único
- `source_status` deve respeitar `source_order_status` inicial
- `status` deve respeitar `order_status`
- `assistant_user_id` pode ser nulo quando a ordem estiver no pool
- `address_line_2` é opcional
- `available_date` representa a data de abertura operacional da ordem
- `deadline_date` representa a data limite final da ordem
- `FOLLOWUP` vindo do arquivo não define o workflow interno
- `WINDOW` não precisa ser coluna do domínio
- `assigned_inspector_id` é opcional, mas útil para histórico operacional e financeiro
- ordens aprovadas, loteadas ou pagas devem ter restrições fortes de edição

## FKs

- `client_id` → `clients.id`
- `work_type_id` → `work_types.id`
- `inspector_account_id` → `inspector_accounts.id`
- `assigned_inspector_id` → `inspectors.id`
- `assistant_user_id` → `users.id`
- `source_import_batch_id` → `pool_import_batches.id`
- `current_payment_batch_item_id` → `payment_batch_items.id`

## Índices

- índice único em `external_order_code`
- índice em `source_status`
- índice em `status`
- índice em `client_id`
- índice em `work_type_id`
- índice em `inspector_account_id`
- índice em `assigned_inspector_id`
- índice em `assistant_user_id`
- índice em `available_date`
- índice em `deadline_date`
- índice composto em (`status`, `assistant_user_id`)
- índice composto em (`status`, `inspector_account_id`)

---

# 12. `order_events`

## Finalidade

Histórico estruturado da ordem.

## Colunas

- `id` UUID PK
- `order_id` UUID NOT NULL
- `event_type` VARCHAR(50) NOT NULL
- `from_status` VARCHAR(30) NULL
- `to_status` VARCHAR(30) NULL
- `performed_by_user_id` UUID NOT NULL
- `reason` TEXT NULL
- `metadata` JSONB NULL
- `created_at` TIMESTAMP NOT NULL

## Regras

- todo evento relevante deve ser registrado aqui
- `event_type` deve respeitar `order_event_type`
- `reason` é obrigatório em:
  - follow-up
  - reject
  - conflito de duplicidade
  - retorno ao pool por regra automática
  - cancelamento relevante vindo da origem, quando exigir explicação humana

## FKs

- `order_id` → `orders.id`
- `performed_by_user_id` → `users.id`

## Índices

- índice em `order_id`
- índice em `event_type`
- índice em `performed_by_user_id`
- índice em `created_at`

---

# 13. `order_notes`

## Finalidade

Armazena observações textuais da ordem.

## Colunas

- `id` UUID PK
- `order_id` UUID NOT NULL
- `author_user_id` UUID NOT NULL
- `note_type` VARCHAR(30) NOT NULL
- `content` TEXT NOT NULL
- `is_internal` BOOLEAN NOT NULL DEFAULT TRUE
- `created_at` TIMESTAMP NOT NULL
- `updated_at` TIMESTAMP NOT NULL

## Regras

- usar para contexto humano e observação complementar
- não substituir `order_events`

## FKs

- `order_id` → `orders.id`
- `author_user_id` → `users.id`

## Índices

- índice em `order_id`
- índice em `author_user_id`
- índice em `note_type`

---

# 14. `payment_batches`

## Finalidade

Representa um lote de pagamento.

## Colunas

- `id` UUID PK
- `reference_code` VARCHAR(80) NOT NULL UNIQUE
- `status` VARCHAR(30) NOT NULL DEFAULT `open`
- `period_start` DATE NOT NULL
- `period_end` DATE NOT NULL
- `total_items` INTEGER NOT NULL DEFAULT 0
- `total_amount` NUMERIC(14,2) NOT NULL DEFAULT 0
- `created_by_user_id` UUID NOT NULL
- `closed_by_user_id` UUID NULL
- `paid_by_user_id` UUID NULL
- `closed_at` TIMESTAMP NULL
- `paid_at` TIMESTAMP NULL
- `notes` TEXT NULL
- `created_at` TIMESTAMP NOT NULL
- `updated_at` TIMESTAMP NOT NULL

## Regras

- `status` deve respeitar `payment_batch_status`
- lote pago não deve ser editável
- `reference_code` deve ser único

## FKs

- `created_by_user_id` → `users.id`
- `closed_by_user_id` → `users.id`
- `paid_by_user_id` → `users.id`

## Índices

- índice único em `reference_code`
- índice em `status`
- índice em (`period_start`, `period_end`)

---

# 15. `payment_batch_items`

## Finalidade

Snapshot financeiro das ordens incluídas em um lote.

## Colunas

- `id` UUID PK
- `payment_batch_id` UUID NOT NULL
- `order_id` UUID NOT NULL
- `assistant_user_id` UUID NULL
- `inspector_id` UUID NULL
- `inspector_account_id` UUID NULL
- `client_id` UUID NULL
- `work_type_id` UUID NULL
- `external_order_code` VARCHAR(120) NOT NULL
- `amount_assistant` NUMERIC(12,2) NOT NULL DEFAULT 0
- `amount_inspector` NUMERIC(12,2) NOT NULL DEFAULT 0
- `quantity` INTEGER NOT NULL DEFAULT 1
- `snapshot_payload` JSONB NULL
- `created_at` TIMESTAMP NOT NULL
- `updated_at` TIMESTAMP NOT NULL

## Regras

- representa o valor congelado na data do lote
- mudanças futuras em `orders` não podem alterar retroativamente este registro
- guardar `inspector_account_id` aqui ajuda a preservar o contexto da conta usada na época
- guardar `inspector_id` aqui ajuda a preservar a pessoa que estava associada ao pagamento naquele momento

## FKs

- `payment_batch_id` → `payment_batches.id`
- `order_id` → `orders.id`
- `assistant_user_id` → `users.id`
- `inspector_id` → `inspectors.id`
- `inspector_account_id` → `inspector_accounts.id`
- `client_id` → `clients.id`
- `work_type_id` → `work_types.id`

## Índices

- índice em `payment_batch_id`
- índice em `order_id`
- índice em `assistant_user_id`
- índice em `inspector_id`
- índice em `inspector_account_id`

## Constraints

- idealmente, impedir que a mesma ordem entre duas vezes no mesmo lote

---

# Relacionamentos principais

## Acesso

- `users` 1:N `user_roles`
- `users` 1:N `team_assignments`

## Inspetores e contas

- `inspectors` 1:N `inspector_account_assignments`
- `inspector_accounts` 1:N `inspector_account_assignments`
- `inspector_accounts` 1:N `orders`
- `inspectors` 1:N `orders` como vínculo pessoal resolvido

## Catálogos

- `clients` 1:N `orders`
- `work_types` 1:N `orders`

## Operação

- `users` 1:N `orders` como assistente responsável
- `orders` 1:N `order_events`
- `orders` 1:N `order_notes`

## Importação

- `pool_import_batches` 1:N `pool_import_items`
- `pool_import_batches` 1:N `orders` como origem da importação

## Financeiro

- `payment_batches` 1:N `payment_batch_items`
- `orders` 1:N `payment_batch_items`

---

# Constraints importantes

## `users`

- `email` único

## `inspector_accounts`

- `account_code` único

## `clients`

- `client_code` único

## `work_types`

- `code` único

## `orders`

- `external_order_code` único

## `payment_batches`

- `reference_code` único

## `payment_batch_items`

- recomendação de constraint única em (`payment_batch_id`, `order_id`)

## `team_assignments`

- impedir duplicação ativa do mesmo vínculo entre admin e assistant

---

# Regras de integridade do domínio

## 1. Status externo não manda sozinho no workflow interno

O valor de `source_status` é importante, mas o portal deve decidir o seu próprio `status`.

### Exemplo

- ordem pode vir como `Assigned`
- internamente ela pode estar `available`, `in_progress` ou `submitted`

---

## 2. Conta externa e inspetor real devem permanecer separados

Nunca tratar `ATAVEND07` como se fosse o nome da pessoa.

---

## 3. `OTYPE` é obrigatório para regra financeira

Se `work_type_id` estiver ausente, a ordem pode ser bloqueada para pagamento ou cair em revisão administrativa.

---

## 4. Rejeição exige motivo

Toda rejeição deve:

- atualizar `orders.status`
- preencher evento com `reason`
- opcionalmente adicionar `order_note`

---

## 5. Follow-up exige motivo

Não existe follow-up sem explicação.

---

## 6. Ordem paga não volta para edição livre

Ordens com status:

- `batched`
- `paid`

devem ter restrições fortes de edição.

---

## 7. Ordem rejeitada volta ao pool

Ao rejeitar:

- `assistant_user_id` pode ser limpo, conforme regra da API
- status volta para fluxo reaproveitável

---

## 8. Ordem cancelada na origem precisa de tratamento explícito

Se `source_status = Canceled`, a API deve decidir entre:

- marcar `status = cancelled`
- impedir posse
- esconder da fila normal
- preservar histórico

Essa transição nunca deve ser silenciosa.

---

## 9. `available_date` e `deadline_date` são os nomes oficiais do novo sistema

Mesmo que no uso diário antigo exista confusão com “due date”, o banco novo deve manter nomes sem ambiguidade.

---

# Índices prioritários para performance

Esses índices devem existir desde o início:

## `orders`

- `external_order_code`
- `source_status`
- `status`
- `client_id`
- `work_type_id`
- `inspector_account_id`
- `assigned_inspector_id`
- `assistant_user_id`
- (`status`, `assistant_user_id`)
- (`status`, `inspector_account_id`)
- `available_date`
- `deadline_date`

## `order_events`

- `order_id`
- `created_at`

## `pool_import_items`

- `batch_id`
- `external_order_code`
- `source_status`

## `payment_batch_items`

- `payment_batch_id`
- `order_id`

---

# Campos auditáveis recomendados no futuro

Se o sistema crescer, considerar adicionar em tabelas críticas:

- `created_by_user_id`
- `updated_by_user_id`
- `deleted_at` para soft delete
- `deleted_by_user_id`

No início, isso deve existir apenas onde fizer real diferença operacional.

---

# Observações finais

Este documento define a **estrutura inicial oficial do banco**, revisada com base no fluxo do projeto e no formato real do arquivo `.xlsx` de importação.

As principais decisões de modelagem desta revisão foram:

- separar **status externo** de **status interno**
- separar **conta externa** de **inspetor pessoa**
- criar catálogos próprios para **clientes** e **tipos de trabalho**
- usar os nomes:
  - `available_date`
  - `deadline_date`
- modelar apenas os campos realmente úteis do arquivo
- manter colunas inúteis apenas em `raw_payload`, sem contaminar o domínio

Se uma nova tabela não tiver função clara no workflow do sistema, ela não deve existir.
