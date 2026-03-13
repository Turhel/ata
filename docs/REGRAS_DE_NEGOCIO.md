# ATA Portal — Regras de Negócio

## Objetivo

Este documento define as regras de negócio oficiais do **ATA Portal**.

Ele serve para:

- orientar a implementação da API
- orientar validações do frontend
- evitar interpretações diferentes da mesma regra
- centralizar as decisões operacionais do sistema
- impedir duplicação de comportamento em telas diferentes

> Regra geral:
> o **frontend nunca decide a regra de negócio**.
> Ele apenas reflete regras definidas na API.

---

# Princípios gerais

## 1. O sistema é orientado por workflow

O portal existe para conduzir uma ordem pelo ciclo:

**importação → disponibilidade → posse → preparação → envio → revisão → aprovação/follow-up/rejeição → pagamento**

---

## 2. Toda ação importante deve ser explícita

Mudanças críticas nunca devem acontecer “automaticamente e silenciosamente” sem histórico.

Exemplos de ações críticas:

- assumir ordem
- enviar ordem
- pedir follow-up
- rejeitar
- aprovar
- retornar ao pool
- incluir em lote
- marcar como paga
- cancelar por status externo

Essas ações devem gerar:

- atualização na tabela principal
- registro em `order_events`
- motivo obrigatório quando aplicável

---

## 3. Status externo e status interno não são a mesma coisa

A ordem pode vir do arquivo externo com um `source_status`, mas o portal opera com seu próprio `status`.

### Exemplo

- `source_status = Assigned`
- `status = available`

ou

- `source_status = Assigned`
- `status = submitted`

ou

- `source_status = Canceled`
- `status = cancelled`

A API deve tratar esses conceitos separadamente.

---

## 4. Permissão é decidida no backend

Ações permitidas dependem de:

- role do usuário
- vínculo do usuário com a ordem
- status atual da ordem
- integridade dos dados obrigatórios

---

## 5. Pagamento exige congelamento

Cálculo financeiro não pode depender de leitura solta da ordem em tempo real depois do fechamento.

Ao entrar em lote, os dados financeiros devem ser congelados em:

- `payment_batch_items`

---

# Regras de usuários e acesso

## 1. Criação de conta

### Regra

Qualquer usuário que se cadastre entra inicialmente como:

- `users.status = pending`

### Consequência

Enquanto estiver `pending`, o usuário:

- não acessa funcionalidades operacionais
- vê apenas página de boas-vindas / aguardando aprovação

---

## 2. Aprovação de usuário

### Quem pode

- `admin`
- `master`

### O que acontece

Ao aprovar:

- `users.status` passa para `active`
- `approved_at` é preenchido
- `approved_by_user_id` é preenchido
- o usuário deve ter uma role ativa em `user_roles`

### Regra

Não existe usuário ativo sem role operacional definida.

---

## 3. Bloqueio de usuário

### Quem pode

- `admin`
- `master`

### O que acontece

Ao bloquear:

- `users.status = blocked`
- `blocked_at` é preenchido
- `blocked_by_user_id` é preenchido

### Consequência

Usuário bloqueado:

- não cria sessão nova
- não executa ações no sistema
- não aparece como elegível para novas atribuições operacionais

---

## 4. Roles do sistema

Roles oficiais:

- `master`
- `admin`
- `assistant`
- `inspector`

### Regra

Uma role ativa por usuário, salvo evolução futura formalizada.

---

## 5. Team assignments

### Regra

Um `assistant` pode ter um `admin` responsável ativo por vez, salvo futura mudança explícita.

### Consequência

Dashboards e visões operacionais podem ser segmentados por time.

---

# Regras de inspetores e contas

## 1. Conta externa é independente da pessoa

### Regra

Uma conta como `ATAVEND07` ou `RZALF` não representa necessariamente uma pessoa específica.

### Consequência

O sistema deve separar:

- pessoa (`inspectors`)
- conta (`inspector_accounts`)
- histórico de vínculo (`inspector_account_assignments`)

---

## 2. Mudança de titularidade de conta

### Regra

Uma conta externa pode passar de um inspetor para outro ao longo do tempo.

### Consequência

O histórico deve ser preservado.
Nunca sobrescrever o passado financeiro ou operacional como se a conta sempre tivesse pertencido à mesma pessoa.

---

## 3. Conta master

### Regra

Contas como `RZALF` podem existir como contas especiais com visibilidade ampla.

### Consequência

Essas contas não precisam estar vinculadas a um inspetor operacional comum.

---

# Regras de importação do pool

## 1. Toda importação gera batch

Ao importar um arquivo `.xlsx`, o sistema deve criar:

- um registro em `pool_import_batches`
- múltiplos registros em `pool_import_items`

---

## 2. Toda linha importada deve preservar o bruto

### Regra

Cada linha relevante do arquivo deve ser armazenada com:

- campos extraídos úteis
- `raw_payload`

### Consequência

Mesmo campos hoje considerados inúteis podem ser auditados futuramente sem quebrar rastreabilidade.

---

## 3. Chave principal de correspondência da ordem

### Regra

A chave principal para localizar ordem já existente é:

- `external_order_code` (`WORDER`)

### Consequência

A API deve usar esse valor como principal critério de match.

---

## 4. Importação pode criar ou atualizar

### Regra

Ao importar uma linha:

- se a ordem não existe, cria
- se a ordem já existe, atualiza apenas campos permitidos
- se a linha falha, registra erro no item
- se a linha for irrelevante ou inválida, pode ser ignorada com justificativa

### Regra adicional

A importação nunca deve destruir histórico operacional.

---

## 5. Campos do arquivo com uso irrelevante

### Regra

Os campos abaixo não devem dirigir a modelagem principal do sistema:

- `FOLLOWUP`
- `WINDOW`
- flags após `VACANT` sem uso real atual

### Consequência

Esses dados ficam, no máximo, em `raw_payload`.

---

## 6. Datas do arquivo

### Regra oficial do novo sistema

- `START DATE` → `available_date`
- `DUEDATE` → `deadline_date`

### Observação

Mesmo que a operação antiga chame informalmente de “due date” o dia da abertura, o sistema novo deve usar nomes sem ambiguidade.

---

## 7. Cancelamento vindo do sistema externo

### Regra

Se a linha importada vier com `source_status = Canceled`, a API deve avaliar a ordem e aplicar uma transição explícita.

### Comportamento esperado

- registrar mudança relevante em `order_events`
- impedir fluxo normal de posse/envio
- marcar `status = cancelled`, se aplicável

### Regra importante

Essa transição nunca deve ser silenciosa.

---

# Regras do ciclo da ordem

## Status internos oficiais

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

## 1. Ordem disponível

### Definição

Uma ordem em `available`:

- está apta para ser assumida
- ainda não está em execução ativa por um assistente
- não foi bloqueada por rejeição sem resolução
- não está cancelada

### Regras

- `assistant_user_id` pode ser nulo
- pode ser listada como disponível para posse
- não pode ser paga
- não pode ser aprovada sem passar pelo fluxo

---

## 2. Assumir ordem

### Quem pode

- `assistant`
- opcionalmente `admin`, se a regra administrativa permitir ação manual excepcional

### Pré-condições

- `status = available`
- ordem não cancelada
- ordem não paga
- ordem não loteada
- usuário ativo e autorizado

### O que acontece

- `assistant_user_id` é preenchido
- `claimed_at` é preenchido
- `status` muda para `in_progress`
- cria evento `claimed`

### Regras

- uma ordem não pode ser assumida por dois assistentes ao mesmo tempo
- a API deve impedir corrida de concorrência

---

## 3. Edição de ordem em andamento

### Quem pode

- o `assistant` responsável
- `admin`
- `master`

### Quando

Principalmente enquanto a ordem está:

- `in_progress`
- `follow_up`

### Restrições

- `assistant` edita apenas campos operacionais permitidos
- `assistant` não altera dados administrativos sensíveis
- `assistant` não altera pagamento
- `assistant` não aprova
- `assistant` não altera role, vínculo ou catálogo

---

## 4. Envio para revisão

### Quem pode

- `assistant` responsável
- `admin`, se houver ação administrativa excepcional

### Pré-condições

- `status = in_progress` ou `follow_up`
- ordem com dados mínimos obrigatórios preenchidos
- ordem não cancelada
- ordem não paga
- ordem não batched

### Dados mínimos sugeridos

- `external_order_code`
- `work_type_id`
- `inspector_account_id`, quando aplicável
- endereço suficiente
- vínculo do assistente responsável

### O que acontece

- `status = submitted`
- `submitted_at` é preenchido
- cria evento `submitted` ou `resubmitted`
- partes da ordem passam a ter edição restrita para o assistente

---

## 5. Ordem submetida

### Definição

A ordem foi enviada e agora depende de revisão administrativa.

### Regras

Enquanto estiver em `submitted`:

- o `assistant` não aprova nem rejeita
- o `assistant` não faz edição livre irrestrita
- `admin` ou `master` devem decidir o próximo passo

---

## 6. Follow-up

### Quem pode aplicar

- `admin`
- `master`

### Pré-condições

- `status = submitted`

### Motivo obrigatório

Sim.

### O que acontece

- `status = follow_up`
- `follow_up_at` é preenchido
- cria evento `follow_up_requested`
- registra motivo
- a ordem volta para o dashboard do assistente responsável

### Regra

Follow-up só deve ser usado quando existe correção plausível.
Se a ordem está estruturalmente inadequada ou precisa sair do fluxo do assistente, o correto é rejeitar.

---

## 7. Resposta ao follow-up

### Quem pode

- `assistant` responsável

### Pré-condições

- `status = follow_up`

### O que acontece

- o assistente corrige
- reenviando, a ordem volta para `submitted`
- cria evento `resubmitted`

### Regra

A ordem precisa continuar vinculada ao mesmo assistente enquanto estiver em correção, salvo intervenção administrativa.

---

## 8. Timeout de follow-up

### Regra recomendada

Se a ordem ficar em `follow_up` por tempo excessivo, o sistema pode:

- emitir alerta para admin
- permitir rejeição manual facilitada
- futuramente automatizar retorno/rejeição conforme política definida

### Regra atual sugerida

Não automatizar rejeição no primeiro momento sem validação administrativa.
Gerar alerta primeiro.

---

## 9. Rejeição

### Quem pode aplicar

- `admin`
- `master`

### Pré-condições

- `status = submitted` ou `follow_up`

### Motivo obrigatório

Sim.

### O que acontece

- `status = rejected`
- `rejected_at` é preenchido
- cria evento `rejected`
- registra motivo
- ordem sai do fluxo atual do assistente

### Regra complementar

Após rejeição, a API pode:

- limpar `assistant_user_id`
- registrar `returned_to_pool_at`
- devolver a ordem para reaproveitamento operacional

### Forma recomendada

A rejeição deve culminar em ordem reaproveitável, voltando à lógica de pool, mesmo que o status histórico continue registrando rejeição no evento.

---

## 10. Retorno ao pool

### Quando acontece

Após rejeição ou ação administrativa equivalente.

### O que acontece

- a ordem volta a ficar disponível para nova posse
- o vínculo ativo com o assistente anterior pode ser removido
- gera evento `returned_to_pool`

### Regra

A operação de retorno ao pool deve ser explícita na API, não um efeito colateral invisível.

---

## 11. Aprovação

### Quem pode

- `admin`
- `master`

### Pré-condições

- `status = submitted`
- dados mínimos completos
- ordem não cancelada
- ordem não batched
- ordem não paga

### O que acontece

- `status = approved`
- `approved_at` é preenchido
- cria evento `approved`

### Regra

Quem executa a ordem não deve ser quem a aprova, exceto exceção administrativa muito bem controlada no futuro.

---

## 12. Aprovação é elegibilidade financeira, não pagamento

### Regra

Ordem aprovada ainda não foi paga.
Ela apenas se torna candidata a entrar em lote financeiro.

---

## 13. Batched

### Definição

A ordem entrou em lote de pagamento.

### O que acontece

- `status = batched`
- `batched_at` é preenchido
- `payment_locked = true`
- cria evento `batched`

### Regra

Uma ordem em `batched` não pode ser livremente editada.
Se houver erro crítico, precisa de fluxo administrativo específico.

---

## 14. Paid

### Definição

A ordem já foi consolidada como paga.

### O que acontece

- `status = paid`
- `paid_at` é preenchido
- cria evento `paid`

### Regra

Ordem paga não volta para edição operacional normal.
Qualquer correção posterior exige trilha administrativa específica.

---

## 15. Cancelled

### Definição

A ordem foi cancelada no sistema de origem ou por decisão administrativa formal.

### Regras

- ordem cancelada não pode ser assumida
- ordem cancelada não pode ser enviada
- ordem cancelada não pode ser aprovada
- ordem cancelada não pode entrar em lote

### Exceção

Se o cancelamento foi importado tardiamente e a ordem já tiver histórico operacional, esse histórico deve ser preservado.

---

## 16. Archived

### Definição

Estado histórico final para visualização e retenção.

### Regra

Arquivo histórico não altera o passado financeiro ou operacional.
Serve para organização e retenção, não para reabrir fluxo.

---

# Regras de dados obrigatórios por etapa

## Para importar

Obrigatório por linha:

- `external_order_code`

Fortemente desejável:

- `source_status`
- `source_work_type_code`
- `source_inspector_account_code`

---

## Para assumir ordem

Obrigatório:

- ordem válida
- usuário ativo
- permissão adequada
- ordem em `available`

---

## Para enviar para revisão

Obrigatório:

- ordem em `in_progress` ou `follow_up`
- assistente responsável
- `work_type_id` preenchido
- dados essenciais da ordem presentes
- ordem não cancelada

---

## Para aprovar

Obrigatório:

- ordem em `submitted`
- `work_type_id`
- histórico coerente
- ordem sem bloqueio crítico
- ordem não cancelada

---

## Para incluir em lote

Obrigatório:

- ordem em `approved`
- pagamento não bloqueado por erro
- dados de pagamento resolvidos
- tipo de trabalho compatível com regra financeira

---

## Para marcar lote como pago

Obrigatório:

- lote fechado
- itens congelados
- validação administrativa concluída

---

# Regras de pagamento

## 1. OTYPE é determinante

### Regra

`OTYPE` define o tipo de trabalho e é base para cálculo de pagamento.

### Consequência

Se `work_type_id` estiver ausente ou inválido:

- a ordem pode ser bloqueada para pagamento
- a ordem pode exigir revisão administrativa

---

## 2. Pagamento é calculado sobre snapshot

### Regra

Ao entrar em lote, os valores devem ser copiados para `payment_batch_items`.

### Consequência

Mudança posterior em:

- `orders`
- `work_types`
- vínculo de inspetor
- vínculo de conta

não deve alterar retroativamente o lote já gerado.

---

## 3. Lote aberto

### Regras

Enquanto o lote estiver `open`:

- pode receber itens
- total pode ser recalculado
- ajustes ainda são permitidos por admin

---

## 4. Lote fechado

### Regras

Quando o lote vira `closed`:

- não deve receber novos itens
- não deve sofrer alteração normal
- deve ficar pronto para pagamento

---

## 5. Lote pago

### Regras

Quando o lote vira `paid`:

- seus itens são considerados definitivos
- ordens relacionadas podem ser marcadas como `paid`
- alterações exigem processo extraordinário e auditável

---

# Regras de visibilidade por role

## Master

### Pode

- ver tudo
- configurar tudo
- gerenciar usuários, roles, times, inspetores, contas e catálogos
- agir administrativamente em qualquer ordem

---

## Admin

### Pode

- aprovar usuários
- bloquear usuários
- gerenciar time
- importar pool
- revisar ordens
- aprovar
- rejeitar
- pedir follow-up
- gerar e fechar lotes
- marcar lotes como pagos
- ver dashboards administrativos

### Não deve

- assumir papel estrutural de master sem necessidade

---

## Assistant

### Pode

- ver ordens permitidas
- assumir ordens
- editar ordens em fluxo operacional permitido
- enviar ordens
- responder follow-up
- ver suas próprias métricas

### Não pode

- aprovar
- rejeitar
- gerar lote
- pagar lote
- definir roles
- gerenciar estrutura do sistema

---

## Inspector

### Pode

- consultar dados limitados relacionados à sua operação
- visualizar itens pertinentes ao módulo de inspeção, quando esse módulo estiver ativo

### Não pode

- revisar ordens
- aprovar
- rejeitar
- gerenciar usuários
- gerenciar pagamento

---

# Regras de auditoria

## 1. Evento obrigatório

Toda mudança importante no ciclo da ordem gera registro em `order_events`.

---

## 2. Motivo obrigatório

Motivo é obrigatório em:

- follow-up
- rejeição
- retorno administrativo relevante
- conflito de duplicidade
- bloqueio/manual override relevante

---

## 3. Nota não substitui evento

`order_notes` complementa contexto humano.
Não substitui `order_events`.

---

## 4. Usuário autor deve ser preservado

Toda ação crítica deve registrar quem executou.

---

# Regras de concorrência

## 1. Dupla posse

A API deve impedir que dois usuários assumam a mesma ordem ao mesmo tempo.

### Estratégias possíveis

- transação com lock
- update condicional por status
- validação otimista com retry

---

## 2. Dupla aprovação

A API deve impedir que a mesma ordem seja aprovada/rejeitada simultaneamente por dois admins.

---

## 3. Inclusão duplicada em lote

A API deve impedir que a mesma ordem entre duas vezes no mesmo lote.

---

# Regras de endpoints de negócio

## Ações recomendadas

Estas ações devem ser modeladas como endpoints de negócio específicos, e não como updates genéricos de status.

### Exemplos

- `POST /orders/:id/claim`
- `POST /orders/:id/submit`
- `POST /orders/:id/follow-up`
- `POST /orders/:id/resubmit`
- `POST /orders/:id/reject`
- `POST /orders/:id/approve`
- `POST /orders/:id/return-to-pool`

### Regra

Evitar endpoint genérico como:

- `PATCH /orders/:id/status`

para ações críticas de workflow.

Isso é pedir para o caos entrar pela porta da frente.

---

# Regras para evitar repetição de função

## 1. Cada ação crítica tem um dono funcional

### Aprovar ordem

- dono: `admin`

### Rejeitar ordem

- dono: `admin`

### Pedir follow-up

- dono: `admin`

### Reenviar correção

- dono: `assistant`

### Gerar lote

- dono: `admin`

---

## 2. Uma mesma regra não deve morar em cinco lugares

A mesma validação de negócio não deve ser duplicada em:

- frontend
- controller
- service
- cron
- tela administrativa separada

### Regra

A regra deve existir principalmente na camada de serviço/domínio da API.

---

# Regras para evolução futura

## 1. PIX Key

No futuro, o sistema poderá armazenar uma chave PIX para pagamento do usuário.

### Regra sugerida desde já

Esse dado deve ficar em um contexto financeiro do usuário, e não misturado aleatoriamente com autenticação.

### Sugestão futura

- `user_payment_profiles`
  ou
- campos financeiros separados com auditoria adequada

---

## 2. Campos novos do XLSX

Novos campos só devem virar coluna dedicada se tiverem uso real no workflow ou no financeiro.

Caso contrário:

- ficam em `raw_payload`

---

## 3. Automação futura

Automação só deve ser adicionada quando a regra manual estiver estável e claramente entendida.

---

# Conclusão

O ATA Portal deve operar com regras claras:

- o **Assistant executa**
- o **Admin revisa e decide**
- o **Master estrutura**
- o **Inspector participa de forma limitada**
- a **API é a autoridade do fluxo**
- o **banco preserva histórico**
- o **financeiro trabalha com snapshot**
- o **status externo não substitui o workflow interno**

Se uma funcionalidade violar essas regras, ela está no lugar errado ou foi mal modelada.
