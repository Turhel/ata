# Duplicatas e Conflitos

## Objetivo
## ReferÃªncia visual do site antigo

- Fonte visual principal: `docs/telas/.old_site/src/pages/dashboard/admin/AdminApprovals.tsx`
- Componente equivalente: `docs/telas/.old_site/src/components/orders/DuplicateRequestsSection.tsx`
- A tela nova deve herdar o padrÃ£o antigo de destaque de conflito, contexto suficiente para decisÃ£o e aÃ§Ãµes objetivas


Permitir que admin e master identifiquem e tratem ordens com potencial duplicidade ou conflito operacional.

Esta tela deve ser específica para conflito.
Não deve ser um cemitério de “talvez seja duplicata” sem critério.

---

## Rota

`/approval/duplicate`

---

## Perfis com acesso

- admin
- master

---

## Quando o usuário chega aqui

O usuário chega aqui:

- quando há suspeita de duplicidade
- quando importação identifica conflito
- quando duas ordens parecem representar o mesmo caso operacional
- quando precisa decidir qual informação prevalece

---

## Objetivo do usuário nesta tela

- localizar pares ou grupos de conflito
- comparar informações lado a lado
- decidir o tratamento adequado
- registrar motivo da decisão
- evitar retrabalho ou pagamento indevido

---

## Papel desta tela

Esta tela existe para resolver exceções críticas do fluxo.

Ela não é a lista padrão de ordens.
Ela é um espaço de análise comparativa e decisão administrativa.

---

## Conteúdo principal

### 1. Lista de conflitos

Cada item deve mostrar:

- external order code
- possíveis correlatas
- status de cada uma
- endereço/residente resumidos
- origem do conflito
- data da detecção

### 2. Comparação lado a lado

Comparar, no mínimo:

- código externo
- endereço
- residente
- source status
- status interno
- assistant responsável
- work type
- import batch de origem
- datas relevantes

### 3. Ações possíveis

Exemplos:

- manter ordem A e descartar lógica da B
- rejeitar uma ordem
- devolver ao pool
- registrar como falso positivo
- marcar conflito como resolvido

### 4. Campo de motivo

- obrigatório para decisão relevante
- deve registrar contexto humano da escolha

---

## Regras de negócio que impactam a UX

- conflito de duplicidade é ação crítica
- decisão importante deve gerar histórico
- motivo é obrigatório
- não pode existir “resolver silenciosamente”
- a UI deve facilitar comparação e impedir decisão cega

---

## Regras de visibilidade

### Admin

- pode analisar e decidir conflitos

### Master

- pode analisar e decidir conflitos

### Assistant

- não acessa esta tela

### Inspector

- não acessa esta tela

---

## Estrutura visual sugerida

### Layout inicial

- lista de conflitos no topo ou à esquerda
- comparação lado a lado no detalhe
- bloco de decisão abaixo

### Evolução futura

- destaque visual de campos divergentes
- sugestão automática de conflito
- filtros por severidade ou origem

---

## Estados da tela

### Sem conflitos

- mensagem clara
- indicador positivo

### Loading

- skeleton da lista e comparação

### Erro

- erro com retry

### Conflito incompleto

- aviso de dados insuficientes para comparação

---

## Dependências de backend

### Futuro mínimo

- endpoint de listagem de conflitos
- endpoint de detalhe comparativo
- endpoint de resolução de conflito com motivo
- registro em `order_events` e, se necessário, `order_notes`

---

## Componentes principais

- lista de conflitos
- comparação lado a lado
- destaque de divergências
- modal/form de resolução
- badges de severidade/status

---

## Prioridade de implementação

Média.

Importante, mas deve nascer depois da fila principal de aprovação estar sólida. Primeiro o sistema precisa revisar o normal bem. Depois ele fica esperto para os casos tortos, como toda operação humana inevitavelmente produz.
