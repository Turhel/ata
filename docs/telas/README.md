# Telas do ATA Portal

> ReferÃªncia visual principal para implementaÃ§Ã£o: `docs/telas/.old_site/`.
> O design antigo passa a ser a base visual das telas novas, com adaptaÃ§Ãµes mÃ­nimas para remover bugs, atualizar navegaÃ§Ã£o e aderir Ã  arquitetura atual.

## Objetivo

Esta pasta organiza a definição funcional e de UX das **telas reais** do sistema (páginas, fluxos de tela e variações por role quando aplicável).

> Regras globais de UI/frontend (estados, padrões e navegação) ficam em `docs/frontend/`.
> Comece por: `docs/frontend/README.md`.

Ela existe para:

- manter a navegação coerente
- evitar telas duplicadas
- separar claramente o que cada role vê
- orientar a implementação do frontend
- reduzir improviso de rota, layout e comportamento

---

## Regra geral

Cada tela deve responder:

- quem acessa
- por que ela existe
- qual ação principal o usuário executa
- quais dados precisam aparecer
- quais regras de negócio afetam a UX
- de quais endpoints ela depende

---

## Convenções

### 1. Uma tela por arquivo

Cada tela deve ter seu próprio `.md`.

### 2. Nome do arquivo

Usar prefixo numérico para manter ordem lógica de leitura.

Exemplos:

- `10-dashboard.md`
- `22-orders-insert.md`
- `40-scope-generator.md`

### 3. Nome da rota

Sempre documentar a rota principal da tela.

### 4. Role explícita

Toda tela deve declarar claramente quais roles têm acesso.

### 5. UX orientada ao fluxo real

Tela não existe para “mostrar dados”.
Tela existe para ajudar o usuário a executar uma etapa real do trabalho.

---

## Estrutura sugerida para cada tela

### 6. ReferÃªncia visual do site antigo

Sempre que existir correspondÃªncia em `docs/telas/.old_site/`, a implementaÃ§Ã£o deve:

- reaproveitar a estrutura visual antiga
- manter a hierarquia de blocos, cabeÃ§alho, sidebar e CTAs que jÃ¡ funcionavam
- evitar reinventar layout sem necessidade real
- adaptar apenas o necessÃ¡rio para contratos, bugs corrigidos, responsividade e regras novas do projeto

Cada arquivo deve conter, sempre que fizer sentido:

- Objetivo
- Rota
- Perfis com acesso
- Quando o usuário chega aqui
- Objetivo do usuário nesta tela
- Papel desta tela
- Conteúdo principal
- Fluxo esperado
- Regras de negócio que impactam a UX
- Regras de visibilidade
- Estados da tela
- Dependências de backend
- Componentes principais
- Prioridade de implementação
- Observações

---

## Arquivos atuais desta pasta

### Entrada e contexto inicial

- `10-dashboard.md`
- `60-admin-dashboard.md`
- `70-master-dashboard.md`

### Orders

- `22-orders-insert.md`
- `30-pool-list.md`
- `80-approvals.md`
- `81-approval-duplicates.md`

### Scopes

- `40-scope-generator.md`
- `41-scope-list.md`
- `42-scope-editor.md`
- `43-scope-view-inspector.md`

### Financeiro pessoal

- `50-my-payments.md`
- `51-my-payments-history.md`

### Gestão estrutural

- `71-master-teams.md`
- `72-master-invitations.md`
- `73-master-types-and-pricing.md`

### Sistema

- `90-settings.md`
- `91-manuals.md`

### Status, erros e contingência

Esta subpasta documenta telas/estados críticos para quando o app não consegue operar normalmente (ex.: sem sessão, sem permissão, conflitos, validação, indisponibilidade, offline e manutenção):

- `status/README.md`

---

## Telas ainda faltando documentar

Estas telas ainda precisam de `.md` próprio:

### Entrada pública / autenticação

- Home pública
- Login
- Escolha de contexto/role
- Boas-vindas para usuário pendente

### Orders

- Lista geral de orders
- Detalhe da order
- Edição operacional da order
- Dashboard pessoal do assistant

### Pool

- Importação de pool
- Detalhe do batch importado

### Performance

- Performance do admin
- Performance global do master

### Financeiro administrativo

- Lista de lotes
- Detalhe do lote
- Fechamento do lote
- Pagamento do lote

### Catálogos

- Inspectors
- Inspector accounts
- Clients
- Work types separados, se virar módulo próprio

### Rotas / roteirização

- criação de rota
- otimização
- visualização por inspetor/admin

---

## Relação com outros documentos

Esta pasta deve ser lida junto com:

- `docs/ARQUITETURA.md`
- `docs/FLUXO_OPERACIONAL.md`
- `docs/REGRAS_DE_NEGOCIO.md`
- `docs/PERMISSOES.md`
- `docs/BANCO_DE_DADOS.md`

---

## Regras importantes

### 1. O frontend não define regra de negócio

A tela reflete o fluxo, mas não decide o fluxo.

### 2. Não duplicar tela com nome diferente

Se duas telas fazem quase a mesma coisa, provavelmente a arquitetura da navegação está errada.

### 3. Uma ação crítica deve ter um lugar principal

Exemplos:

- aprovar order → tela de aprovação
- gerar escopo → tela de escopo
- importar pool → tela de importação

### 4. Role errada não deve ver UI indevida

Mesmo que a API proteja tudo, a navegação do frontend deve ser coerente com a role.

---

## Objetivo final

Ter uma base de telas que seja:

- coerente
- implementável
- evolutiva
- alinhada ao fluxo real da operação

Se uma tela não tiver função clara no trabalho real, ela não deve existir.
