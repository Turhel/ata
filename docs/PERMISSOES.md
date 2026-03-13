# ATA Portal — Permissões e Controle de Acesso

## Objetivo

Este documento define a matriz oficial de permissões do **ATA Portal**.

Ele serve para:

- orientar a implementação de autorização na API
- orientar o bloqueio de ações no frontend
- padronizar o que cada role pode visualizar ou modificar
- evitar conflito de interpretação entre módulos
- impedir acesso indevido a dados ou ações sensíveis

> Regra principal:
> a autorização real é decidida na **API**.
> O frontend apenas reflete e esconde ações que já seriam barradas no backend.

---

# Roles oficiais

As roles do sistema são:

- `master`
- `admin`
- `assistant`
- `inspector`

---

# Princípios de autorização

## 1. Role sozinha não basta

A permissão pode depender de:

- role do usuário
- status da ordem
- vínculo do usuário com a ordem
- vínculo do assistente com o admin responsável
- estado da conta do usuário
- integridade dos dados necessários para a ação

---

## 2. Menor privilégio possível

Cada role deve ter apenas o acesso necessário para executar seu trabalho.

---

## 3. Leitura e escrita são diferentes

Visualizar um dado não implica permissão para alterá-lo.

---

## 4. Ações críticas devem ser explícitas

Aprovar, rejeitar, pedir follow-up, pagar lote e alterar role são ações críticas.
Elas exigem regra específica, histórico e autorização rígida.

---

## 5. Pending e blocked não operam

Usuários com status:

- `pending`
- `blocked`
- `inactive`

não executam ações operacionais.

---

# Estados do usuário e efeito nas permissões

## `pending`

### Pode

- autenticar, se o fluxo permitir sessão mínima
- visualizar tela de aguardando aprovação

### Não pode

- acessar módulos operacionais
- assumir ordens
- revisar ordens
- ver dashboards internos completos
- mexer em pagamentos

---

## `active`

### Pode

- agir de acordo com sua role

---

## `blocked`

### Não pode

- iniciar nova sessão operacional
- executar ações operacionais
- atuar em ordens ou lotes

---

## `inactive`

### Não pode

- operar normalmente no sistema

---

# Escopos de recursos

Para este documento, os recursos do sistema são:

- usuários
- roles
- times
- inspetores
- contas de inspetor
- clientes
- tipos de trabalho
- importações
- ordens
- eventos de ordem
- notas de ordem
- lotes de pagamento
- itens de lote
- dashboards
- configurações estruturais

---

# Matriz geral por recurso

## 1. Usuários

### `master`

Pode:

- listar usuários
- visualizar detalhes
- aprovar
- bloquear
- desbloquear
- editar informações administrativas
- redefinir role
- ver histórico relevante

### `admin`

Pode:

- listar usuários
- visualizar detalhes
- aprovar
- bloquear
- desbloquear
- editar informações operacionais permitidas
- solicitar/definir role conforme política do sistema

### `assistant`

Pode:

- visualizar o próprio perfil
- editar apenas dados próprios permitidos no futuro

Não pode:

- listar todos os usuários
- aprovar
- bloquear
- alterar role

### `inspector`

Pode:

- visualizar o próprio perfil, se aplicável

Não pode:

- listar usuários
- aprovar
- bloquear
- alterar role

---

## 2. Roles

### `master`

Pode:

- atribuir role
- alterar role
- revogar role
- visualizar histórico de role

### `admin`

Pode:

- atribuir role operacional, se essa política for mantida
- visualizar role de usuários sob sua gestão operacional

Restrições:

- não deve promover outro usuário a `master`
- não deve alterar privilégios estruturais sem regra explícita

### `assistant`

Não pode gerenciar roles

### `inspector`

Não pode gerenciar roles

---

## 3. Team assignments

### `master`

Pode:

- criar
- editar
- encerrar
- visualizar todos

### `admin`

Pode:

- visualizar seus vínculos
- vincular assistentes, se a política permitir
- solicitar ajuste organizacional
- visualizar assistentes do próprio time

### `assistant`

Pode:

- visualizar seu admin responsável
- visualizar seus próprios vínculos

Não pode:

- criar ou alterar vínculo

### `inspector`

Normalmente sem acesso relevante

---

## 4. Inspetores (`inspectors`)

### `master`

Pode:

- criar
- editar
- ativar/inativar
- visualizar todos

### `admin`

Pode:

- criar
- editar
- ativar/inativar
- visualizar todos

### `assistant`

Pode:

- visualizar dados necessários ao fluxo operacional

Não pode:

- criar
- editar
- ativar/inativar

### `inspector`

Pode:

- visualizar dados próprios ou estritamente relacionados à sua atuação

---

## 5. Contas de inspetor (`inspector_accounts`)

### `master`

Pode:

- criar
- editar
- ativar/inativar
- alterar tipo de conta
- alterar vínculo atual
- consultar histórico

### `admin`

Pode:

- criar
- editar
- ativar/inativar
- alterar vínculo operacional
- consultar histórico

### `assistant`

Pode:

- visualizar conta vinculada à ordem quando necessário

Não pode:

- criar
- editar
- reatribuir

### `inspector`

Pode:

- visualizar a própria conta operacional, quando fizer sentido

---

## 6. Clientes (`clients`)

### `master`

Pode:

- criar
- editar
- ativar/inativar
- visualizar todos

### `admin`

Pode:

- criar
- editar
- ativar/inativar
- visualizar todos

### `assistant`

Pode:

- visualizar clientes presentes em suas ordens

Não pode:

- criar
- editar
- inativar

### `inspector`

Normalmente sem necessidade de acesso direto, salvo leitura limitada em módulo futuro

---

## 7. Tipos de trabalho (`work_types`)

### `master`

Pode:

- criar
- editar
- ativar/inativar
- definir valores padrão
- visualizar todos

### `admin`

Pode:

- visualizar todos
- editar se a política permitir
- sugerir/ajustar classificação operacional

Restrições:

- alteração de valores padrão deve ser controlada com cuidado

### `assistant`

Pode:

- visualizar
- selecionar onde permitido pelo fluxo

Não pode:

- criar
- editar valor
- inativar

### `inspector`

Pode:

- visualizar tipos relevantes à sua operação, quando necessário

---

## 8. Importações (`pool_import_batches`, `pool_import_items`)

### `master`

Pode:

- visualizar todos os batches
- importar arquivo
- consultar itens importados
- revisar falhas

### `admin`

Pode:

- importar arquivo
- visualizar batches
- consultar itens importados
- revisar falhas
- acompanhar impacto no pool

### `assistant`

Normalmente não deve importar o pool principal

Pode, no máximo:

- visualizar resultados relevantes se houver tela específica de conferência

### `inspector`

Sem acesso

---

## 9. Ordens (`orders`)

### `master`

Pode:

- visualizar todas
- editar
- assumir administrativamente
- reatribuir
- aprovar
- rejeitar
- pedir follow-up
- retornar ao pool
- cancelar
- arquivar

### `admin`

Pode:

- visualizar ordens sob sua alçada e, conforme política, todas as ordens operacionais
- editar dados administrativos e operacionais permitidos
- reatribuir
- aprovar
- rejeitar
- pedir follow-up
- retornar ao pool
- incluir em fluxo financeiro
- tratar conflitos e duplicidades

### `assistant`

Pode:

- visualizar ordens permitidas
- assumir ordem disponível
- editar sua ordem em `in_progress`
- editar sua ordem em `follow_up`
- enviar para revisão
- reenviar correção
- visualizar histórico permitido
- visualizar motivo de follow-up ou rejeição

Não pode:

- aprovar
- rejeitar
- pedir follow-up
- alterar pagamento
- forçar retorno ao pool sem regra
- editar ordem `batched` ou `paid`

### `inspector`

Pode:

- visualizar dados limitados relacionados à sua atuação
- consultar ordens vinculadas à sua conta/pessoa, quando essa funcionalidade existir

Não pode:

- assumir como assistant
- aprovar
- rejeitar
- pagar
- gerenciar workflow administrativo

---

## 10. Eventos de ordem (`order_events`)

### `master`

Pode:

- visualizar todos

### `admin`

Pode:

- visualizar todos os eventos necessários à gestão
- gerar eventos por ações administrativas na API

### `assistant`

Pode:

- visualizar eventos da própria ordem, conforme filtro de visibilidade

Não pode:

- escrever diretamente no recurso de eventos
- criar evento fora do fluxo da API

### `inspector`

Apenas leitura limitada, se necessário

> Regra:
> ninguém escreve diretamente em `order_events` por tela genérica.
> Eventos são criados por ações de negócio na API.

---

## 11. Notas de ordem (`order_notes`)

### `master`

Pode:

- visualizar
- criar
- editar conforme política
- marcar interna/administrativa

### `admin`

Pode:

- visualizar
- criar
- editar conforme política
- adicionar justificativas e observações

### `assistant`

Pode:

- visualizar notas permitidas
- criar notas operacionais quando o fluxo permitir

Não pode:

- editar nota administrativa restrita
- apagar trilha crítica sem política específica

### `inspector`

Sem acesso ou acesso extremamente limitado, conforme módulo futuro

---

## 12. Lotes de pagamento (`payment_batches`)

### `master`

Pode:

- visualizar todos
- criar
- editar enquanto abertos
- fechar
- marcar como pagos
- cancelar
- revisar histórico

### `admin`

Pode:

- visualizar todos os lotes relevantes
- criar
- editar enquanto abertos
- fechar
- marcar como pagos
- revisar histórico

### `assistant`

Pode:

- visualizar apenas informações resumidas do próprio pagamento, se a funcionalidade existir no futuro

Não pode:

- criar lote
- editar lote
- fechar lote
- marcar lote como pago

### `inspector`

Pode:

- visualizar informações resumidas próprias, se a funcionalidade existir no futuro

Não pode:

- criar
- editar
- fechar
- pagar

---

## 13. Itens de lote (`payment_batch_items`)

### `master`

Pode:

- visualizar todos
- ajustar enquanto o lote estiver aberto, se permitido pelo fluxo

### `admin`

Pode:

- visualizar todos os itens relevantes
- ajustar enquanto o lote estiver aberto, conforme regra financeira

### `assistant`

Pode:

- visualizar apenas o próprio resumo financeiro, se liberado no futuro

Não pode:

- editar
- excluir
- inserir manualmente

### `inspector`

Pode:

- visualizar apenas o próprio resumo financeiro, se liberado no futuro

---

## 14. Dashboards

### `master`

Pode:

- ver dashboards globais
- ver visão estrutural e administrativa completa

### `admin`

Pode:

- ver dashboards administrativos
- ver produtividade por time
- ver pendências
- ver status de ordens
- ver indicadores de pagamento

### `assistant`

Pode:

- ver dashboard pessoal
- ver pendências próprias
- ver follow-ups
- ver métricas próprias

### `inspector`

Pode:

- ver painel limitado ao seu escopo, caso esse módulo exista

---

## 15. Configurações estruturais

Inclui:

- parâmetros globais
- catálogos sensíveis
- políticas estruturais
- decisões administrativas amplas

### `master`

Pode:

- acesso total

### `admin`

Pode:

- acesso parcial, se definido explicitamente
- nunca com amplitude equivalente a `master` sem regra formal

### `assistant`

Sem acesso

### `inspector`

Sem acesso

---

# Regras por ação de negócio

## `POST /orders/:id/claim`

### Permitido para

- `assistant`
- `admin` em caso excepcional, se permitido pela política

### Exige

- usuário `active`
- ordem em `available`
- ordem não cancelada
- ordem não batched
- ordem não paid

---

## `PATCH /orders/:id`

### Permitido para

- `assistant` responsável, com campos limitados
- `admin`
- `master`

### Regras

- `assistant` só edita em `in_progress` ou `follow_up`
- `assistant` não altera campos administrativos/financeiros
- `batched`, `paid` e `cancelled` têm edição fortemente restrita

---

## `POST /orders/:id/submit`

### Permitido para

- `assistant` responsável
- `admin`, em cenário excepcional formalizado

### Exige

- ordem em `in_progress` ou `follow_up`
- dados mínimos completos
- ordem não cancelada

---

## `POST /orders/:id/follow-up`

### Permitido para

- `admin`
- `master`

### Exige

- ordem em `submitted`
- motivo obrigatório

---

## `POST /orders/:id/resubmit`

### Permitido para

- `assistant` responsável

### Exige

- ordem em `follow_up`

---

## `POST /orders/:id/reject`

### Permitido para

- `admin`
- `master`

### Exige

- ordem em `submitted` ou `follow_up`
- motivo obrigatório

---

## `POST /orders/:id/approve`

### Permitido para

- `admin`
- `master`

### Exige

- ordem em `submitted`
- dados válidos para aprovação
- ordem não cancelada

---

## `POST /orders/:id/return-to-pool`

### Permitido para

- `admin`
- `master`

### Exige

- contexto administrativo válido
- histórico da ação
- motivo quando aplicável

---

## `POST /pool-import`

### Permitido para

- `admin`
- `master`

### Não permitido para

- `assistant`
- `inspector`

---

## `POST /payment-batches`

### Permitido para

- `admin`
- `master`

### Exige

- usuário ativo
- contexto financeiro válido

---

## `POST /payment-batches/:id/close`

### Permitido para

- `admin`
- `master`

### Exige

- lote em `open`
- validações concluídas

---

## `POST /payment-batches/:id/pay`

### Permitido para

- `admin`
- `master`

### Exige

- lote em `closed`
- autorização financeira válida

---

## `PATCH /users/:id/approve`

### Permitido para

- `admin`
- `master`

---

## `PATCH /users/:id/block`

### Permitido para

- `admin`
- `master`

---

## `PATCH /users/:id/role`

### Permitido para

- `master`
- `admin` apenas dentro dos limites definidos pela política

---

# Regras por status da ordem

## Ordem `available`

### `assistant`

Pode:

- visualizar
- assumir

Não pode:

- aprovar
- rejeitar
- pagar

### `admin`

Pode:

- visualizar
- reatribuir/gerenciar administrativamente

---

## Ordem `in_progress`

### `assistant` responsável

Pode:

- editar campos operacionais
- preparar envio

Não pode:

- aprovar
- rejeitar
- lotear

### `admin`

Pode:

- visualizar
- intervir administrativamente

---

## Ordem `submitted`

### `assistant`

Pode:

- visualizar
- aguardar decisão
- não editar livremente, salvo regra específica

### `admin`

Pode:

- aprovar
- rejeitar
- pedir follow-up

---

## Ordem `follow_up`

### `assistant` responsável

Pode:

- corrigir
- reenviar
- ver motivo

### `admin`

Pode:

- acompanhar
- rejeitar depois, se necessário

---

## Ordem `rejected`

### `assistant`

Pode:

- visualizar histórico e motivo, conforme política

### `admin`

Pode:

- devolver ao pool
- reatribuir
- analisar reaproveitamento

---

## Ordem `approved`

### `assistant`

Apenas leitura

### `admin`

Pode:

- incluir em lote
- revisar elegibilidade financeira

---

## Ordem `batched`

### `assistant`

Somente leitura

### `admin`

Pode:

- visualizar
- ajustar apenas se o lote ainda permitir e houver política clara

---

## Ordem `paid`

### Todos

Leitura controlada

### Regra

Sem edição operacional normal

---

## Ordem `cancelled`

### Regra

Sem fluxo operacional normal

---

# Visibilidade de dados sensíveis

## 1. Valores financeiros

- visibilidade completa: `admin`, `master`
- visibilidade resumida própria: `assistant` e `inspector`, apenas se essa funcionalidade existir formalmente

---

## 2. Roles e estrutura interna

- visibilidade completa: `master`
- visibilidade administrativa: `admin`
- visibilidade restrita do próprio contexto: `assistant`, `inspector`

---

## 3. Notas internas

- podem ser ocultadas de `assistant` e `inspector` se forem estritamente administrativas

---

# Regras de implementação

## 1. Middleware por autenticação

Toda rota protegida deve exigir usuário autenticado e ativo.

---

## 2. Middleware por role

A role deve ser verificada na API antes da ação.

---

## 3. Verificação contextual

Mesmo com role válida, a API deve verificar:

- se o usuário é responsável pela ordem
- se a ordem está no status correto
- se o recurso pertence ao escopo do usuário

---

## 4. O frontend não é segurança

Esconder botão não é autorização.
A API continua obrigada a negar a ação.

---

# Casos especiais

## Admin tentando promover alguém a master

### Regra sugerida

Negado por padrão.
Somente `master` pode criar outro `master`, salvo política futura explicitamente definida.

---

## Assistant tentando editar ordem aprovada

### Regra

Negado.

---

## Assistant tentando assumir ordem cancelada

### Regra

Negado.

---

## Usuário pending tentando acessar dashboard

### Regra

Negado.

---

## Usuário blocked com sessão antiga

### Regra

A API deve invalidar ou barrar ações subsequentes.

---

# Conclusão

As permissões do ATA Portal seguem a lógica:

- o **Master** estrutura e controla
- o **Admin** supervisiona, decide e fecha fluxo
- o **Assistant** executa e envia
- o **Inspector** tem acesso limitado ao que for necessário

A autorização real depende de:

- role
- status do usuário
- status da ordem
- contexto da ação
- escopo do recurso

Se uma ação puder ser feita por quem não deveria, a regra está errada ou foi implementada no lugar errado.
