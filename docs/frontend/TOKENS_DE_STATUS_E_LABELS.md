# Tokens de Status e Labels

## Objetivo

Padronizar os textos visíveis, badges e estados do sistema no frontend do ATA Portal.

Este documento existe para evitar:

- o mesmo status com nomes diferentes
- badges inconsistentes
- label técnica demais
- UI falando com o usuário em três idiomas e quatro humores diferentes

---

## Princípios gerais

### 1. O backend define o valor

O frontend define a apresentação.

Exemplo:

- valor técnico: `follow_up`
- label visual: `Follow-up`

### 2. Um valor técnico, uma apresentação padrão

Nada de:

- `follow_up`
- `FollowUp`
- `Em correção`
- `Retorno`
- `Correção pendente`

todos querendo ser a mesma coisa.

### 3. Linguagem clara

A UI deve usar labels legíveis para humano normal, cansado e pressionado.

---

# 1. Status de usuário

## Valores oficiais

| Value        | Label     | Tone    |
| ------------ | --------- | ------- |
| `pending`  | Pendente  | warning |
| `active`   | Ativo     | success |
| `blocked`  | Bloqueado | danger  |
| `inactive` | Inativo   | neutral |

## Regras

- `pending` indica aguardando aprovação
- `blocked` indica acesso bloqueado
- `inactive` indica fora de operação
- `active` indica apto a operar conforme role

---

# 2. Roles do sistema

## Valores oficiais

| Value         | Label     |
| ------------- | --------- |
| `master`    | Master    |
| `admin`     | Admin     |
| `assistant` | Assistant |
| `inspector` | Inspector |

## Regras

- usar sempre essa grafia na UI principal
- evitar inventar nomes alternativos no menu

### Observação

Se quiser localização futura para português completo:

- Master
- Administrador
- Assistente
- Inspetor

Mas isso precisa ser decisão global, não improviso por tela.

---

# 3. Source order status

## Valores oficiais

| Value        | Label    | Tone   |
| ------------ | -------- | ------ |
| `Assigned` | Assigned | info   |
| `Received` | Received | info   |
| `Canceled` | Canceled | danger |

## Regra

Como é status de origem, pode permanecer com label mais próxima do sistema externo.

### Observação

No detalhe da order, deixar claro que isso é:

- Status de origem
  e não o status interno do workflow.

---

# 4. Order status

## Valores oficiais

| Value           | Label        | Tone      |
| --------------- | ------------ | --------- |
| `available`   | Disponível  | info      |
| `in_progress` | Em andamento | warning   |
| `submitted`   | Enviada      | primary   |
| `follow_up`   | Follow-up    | warning   |
| `rejected`    | Rejeitada    | danger    |
| `approved`    | Aprovada     | success   |
| `batched`     | Em lote      | secondary |
| `paid`        | Paga         | success   |
| `cancelled`   | Cancelada    | danger    |
| `archived`    | Arquivada    | neutral   |

## Regras

- `submitted` pode usar label “Enviada” na UI do assistant/admin
- `follow_up` não deve virar mil sinônimos
- `batched` deve ser mostrado como etapa financeira intermediária
- `cancelled` deve ter destaque forte

---

# 5. Order event type

## Valores oficiais

| Value                     | Label                 |
| ------------------------- | --------------------- |
| `created`               | Criada                |
| `claimed`               | Assumida              |
| `updated`               | Atualizada            |
| `submitted`             | Enviada               |
| `follow_up_requested`   | Follow-up solicitado  |
| `resubmitted`           | Reenviada             |
| `rejected`              | Rejeitada             |
| `approved`              | Aprovada              |
| `returned_to_pool`      | Devolvida ao pool     |
| `batched`               | Incluída em lote     |
| `paid`                  | Marcada como paga     |
| `cancelled_from_source` | Cancelada pela origem |
| `archived`              | Arquivada             |

## Regra

Labels de evento devem soar como ação/histórico, não como estado atual.

---

# 6. Import batch status

## Valores oficiais

| Value                   | Label       | Tone    |
| ----------------------- | ----------- | ------- |
| `processing`          | Processando | info    |
| `completed`           | Concluído  | success |
| `failed`              | Falhou      | danger  |
| `partially_completed` | Parcial     | warning |

---

# 7. Import action

## Valores oficiais

| Value       | Label      | Tone    |
| ----------- | ---------- | ------- |
| `created` | Criada     | success |
| `updated` | Atualizada | info    |
| `ignored` | Ignorada   | neutral |
| `failed`  | Falhou     | danger  |

---

# 8. Payment batch status

## Valores oficiais

| Value         | Label     | Tone      |
| ------------- | --------- | --------- |
| `open`      | Aberto    | warning   |
| `closed`    | Fechado   | secondary |
| `paid`      | Pago      | success   |
| `cancelled` | Cancelado | danger    |

---

# 9. Profile status do `/me`

## Valores oficiais

| Value       | Label                  | Tone    |
| ----------- | ---------------------- | ------- |
| `linked`  | Vinculado              | success |
| `missing` | Sem perfil operacional | warning |

## Uso recomendado

Este token é mais técnico/diagnóstico.
Não precisa aparecer como badge em toda parte.
Serve muito para estado de sessão e onboarding.

---

# 10. Labels comuns de ação

## Ações principais

| Contexto       | Label recomendada    |
| -------------- | -------------------- |
| login          | Entrar               |
| claim          | Assumir              |
| submit         | Enviar para revisão |
| approve        | Aprovar              |
| follow-up      | Pedir follow-up      |
| reject         | Rejeitar             |
| return-to-pool | Devolver ao pool     |
| import pool    | Importar pool        |
| save           | Salvar               |
| update         | Atualizar            |
| close batch    | Fechar lote          |
| pay batch      | Marcar como pago     |

---

# 11. Labels comuns de navegação

| Contexto         | Label recomendada |
| ---------------- | ----------------- |
| dashboard user   | Dashboard         |
| admin dashboard  | Dashboard Admin   |
| master dashboard | Dashboard Master  |
| orders           | Orders            |
| pool             | Pool              |
| approvals        | Aprovações      |
| duplicates       | Duplicatas        |
| scopes           | Scopes            |
| payments         | Pagamentos        |
| performance      | Performance       |
| manuals          | Manuais           |
| settings         | Configurações   |

---

# 12. Labels comuns de feedback

## Sucesso

| Situação      | Label                   |
| --------------- | ----------------------- |
| salvo           | Salvo com sucesso       |
| atualizado      | Atualizado com sucesso  |
| importado       | Importação concluída |
| aprovado        | Order aprovada          |
| follow-up       | Follow-up solicitado    |
| rejeitado       | Order rejeitada         |
| retorno ao pool | Order devolvida ao pool |

## Erro

| Situação      | Label                                                               |
| --------------- | ------------------------------------------------------------------- |
| unauthorized    | Sessão inválida ou ausente                                        |
| forbidden       | Você não tem permissão para esta ação                          |
| not found       | Item não encontrado                                                |
| invalid status  | Ação não permitida no status atual                               |
| incomplete      | Dados obrigatórios ausentes                                        |
| cancelled order | Order cancelada não permite esta ação                            |
| concurrency     | O item mudou enquanto você agia. Atualize a tela e tente novamente |

---

# 13. Tons visuais recomendados

## Mapa de tone

| Tone          | Uso                                        |
| ------------- | ------------------------------------------ |
| `success`   | concluído, aprovado, ativo, pago          |
| `warning`   | pendência, atenção, follow-up, aberto   |
| `danger`    | erro, bloqueio, cancelamento, rejeição   |
| `info`      | estado neutro ativo, processamento, origem |
| `secondary` | estado intermediário administrativo       |
| `neutral`   | arquivado, inativo, ignorado               |

---

# 14. Regras de tradução e consistência

## Regra 1

Valor técnico fica em inglês/snake_case no código.

## Regra 2

Label visual fica padronizada na UI.

## Regra 3

Não traduzir parcialmente.
Exemplo ruim:

- `follow_up` em uma tela
- `Correção` em outra
- `Follow` em outra

## Regra 4

Mesmo status = mesma cor e mesmo label na maior parte do sistema.

---

# 15. Utilitário recomendado no frontend

## Ideia

Criar mapeamentos centrais como:

- `orderStatusMeta`
- `userStatusMeta`
- `batchStatusMeta`
- `roleMeta`

Cada um com:

- label
- tone
- descrição opcional

### Exemplo conceitual

- `available` → label `Disponível`, tone `info`
- `approved` → label `Aprovada`, tone `success`

Assim o sistema para de depender da criatividade momentânea de cada tela.

---

# 16. O que evitar

- label diferente para o mesmo status
- badge vermelha para algo que noutra tela é azul
- termos técnicos demais em tela operacional
- mistura inglês/português sem padrão
- sinônimo criado no impulso

---

# Objetivo final

Quando o usuário olhar para um badge ou um status, ele deve entender de imediato:

- o que aquilo significa
- o quão grave é
- se aquilo está bom, pendente ou problemático

Sem adivinhação.
Sem poesia.
Sem “acho que esse amarelo quer dizer quase aprovado”.
