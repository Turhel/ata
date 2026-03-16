# Importação de Pool

## Objetivo
## ReferÃªncia visual do site antigo

- Fonte visual principal: `docs/telas/.old_site/src/pages/dashboard/admin/AdminPoolImport.tsx`
- PadrÃµes a preservar: card de upload, estado de progresso, resumo do resultado e histÃ³rico logo abaixo
- A implementaÃ§Ã£o nova deve manter a experiÃªncia antiga de importaÃ§Ã£o e sÃ³ simplificar o que antes era bugado ou acoplado demais


Permitir que admin ou master importe o pool de ordens para o sistema de forma auditável, controlada e rastreável.

Esta tela é a porta de entrada operacional das ordens vindas do arquivo externo.

---

## Rota

`/admin/pool/import`

---

## Perfis com acesso

- admin
- master

---

## Quando o usuário chega aqui

O usuário chega aqui:

- quando precisa importar um novo arquivo de pool
- quando precisa atualizar ordens já existentes com dados novos do sistema externo
- quando precisa verificar se uma importação foi concluída corretamente

---

## Objetivo do usuário nesta tela

- enviar um arquivo de pool
- validar rapidamente o conteúdo antes de importar
- confirmar que a importação terminou bem
- ver quantas ordens foram criadas, atualizadas, ignoradas ou falharam
- abrir o detalhe do batch importado

---

## Papel desta tela no sistema

Esta tela não existe para “subir planilha”.

Ela existe para:

- materializar ordens no sistema
- manter rastreabilidade
- preservar histórico
- impedir sobrescrita cega do que já foi trabalhado

---

## Conteúdo principal

### 1. Cabeçalho

- título
- explicação curta do que a importação faz
- observação de que a ação é auditável

### 2. Área de envio

- seletor de arquivo
- drag and drop, se quiser no futuro
- nome do arquivo selecionado
- botão de importar

### 3. Regras visíveis ao usuário

- o arquivo gera um batch
- cada linha gera item de importação
- ordens podem ser criadas, atualizadas, ignoradas ou falhar
- histórico operacional não deve ser destruído

### 4. Resultado da importação

- batch gerado
- status final
- contadores
- link para detalhe do batch

### 5. Histórico recente de imports

- últimos batches
- nome do arquivo
- data
- status
- contadores resumidos

---

## Fluxo esperado

### Importação

1. admin seleciona arquivo
2. sistema valida formato mínimo
3. admin confirma importação
4. backend processa
5. sistema exibe resultado resumido
6. usuário pode abrir o detalhe do batch

---

## Resultado mínimo esperado

- total de linhas
- linhas inseridas
- linhas atualizadas
- linhas ignoradas
- linhas com erro
- id do batch
- nome do arquivo
- status final

---

## Regras de visibilidade

### Admin

- pode importar
- pode ver batches
- pode abrir detalhe de batch

### Master

- mesmas capacidades do admin
- com visão estrutural ampla

### Assistant

- não acessa esta tela

### Inspector

- não acessa esta tela

---

## Regras de negócio que impactam a UX

- toda importação gera `pool_import_batch`
- toda linha relevante gera `pool_import_item`
- `external_order_code` é a chave principal de correspondência
- o sistema pode criar ou atualizar
- a importação não deve destruir histórico operacional
- `source_status` e `status` interno são coisas diferentes
- cancelamento vindo da origem exige tratamento explícito

---

## Estados da tela

### Vazio inicial

- sem arquivo selecionado
- instrução clara de uso

### Arquivo selecionado

- nome do arquivo visível
- botão de importar habilitado

### Importando

- loading bloqueando reenvio duplo
- mensagem clara de processamento

### Sucesso

- resumo do batch
- link para abrir detalhe

### Erro de validação

- mensagem clara
- sem apagar o arquivo selecionado automaticamente, se possível

### Erro inesperado

- mensagem genérica segura
- opção de tentar novamente

---

## Dependências de backend

### Mínimo

- `POST /pool-import`
- `GET /pool-import/batches/:id`

### Futuro

- `GET /pool-import/batches`
- filtros por status/data
- reprocessamento controlado, se algum dia fizer sentido

---

## Componentes principais

- uploader simples
- botão de importar
- card de resultado
- cards ou tabela de batches recentes
- link para detalhe do batch

---

## Prioridade de implementação

Alta.

Sem esta tela, o pool depende de testes manuais e terminal, o que serve para bootstrap, mas não para operação humana decente.

---

## Observações

A primeira versão deve ser simples:

- um upload
- um resultado claro
- um link para o batch

Não precisa inventar wizard de 5 passos, preview mágico, parser ornamental e outras formas de sofrer.
