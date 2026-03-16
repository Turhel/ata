# 🔐 ATA Management Portal – Segurança

> **Última atualização:** 2026-02-17  
> Este documento descreve as práticas de segurança implementadas no projeto para garantir a proteção dos dados contra acesso não autorizado, vazamentos e abusos.

## 🎯 Princípios Fundamentais

1. **Nunca confiar no cliente** – toda requisição é validada no backend.
2. **Autenticação é responsabilidade do Clerk** – o frontend apenas obtém tokens.
3. **Autorização é baseada em roles e IDs internos** – o backend resolve o usuário autenticado para `public.users.id` e verifica permissões antes de qualquer operação.
4. **Separação de bancos** – HOT (Supabase) contém dados operacionais; COLD (Turso) contém histórico e agregações. Nenhum dos dois é acessível diretamente pelo frontend.
5. **Egress mínimo** – menos tráfego também reduz superfície de ataque.

---

## 🔑 Autenticação (Clerk)

- O Clerk é o provedor de identidade exclusivo.
- O frontend usa o `<ClerkProvider>` e hooks como `useAuth()` para obter o token JWT.
- Todas as chamadas à API (`/api/*`) incluem o header `Authorization: Bearer <token>`.
- O token é validado em cada Vercel Function através do `requireAuth()` (ver `server/_lib/auth.ts`).
- **IDs:**
  - `clerk_user_id` (sub do JWT) é usado apenas para lookup do usuário interno.
  - A identidade operacional real é `public.users.id` (UUID armazenado como texto).

---

## 🛡️ Autorização (RBAC)

### Roles disponíveis
- `user` (assistente)
- `admin`
- `master`

### Controle de acesso por endpoint

- Todas as funções da API (`server/api/*`) usam o helper `requireAuth()` que:
  1. Decodifica e valida o token Clerk.
  2. Busca o usuário interno por `clerk_user_id` (ou cria se necessário).
  3. Anexa `req.user` com `{ id, role, ... }`.
- A partir daí, cada handler aplica verificações específicas:
  - Exemplo: `if (req.user.role !== 'admin') return res.status(403).json(...)`
- **Hardening aplicado** (conforme HANDOFF):
  - Endpoints sensíveis (`audit-logs`, `notifications`, `payment-batches`, etc.) têm restrições adicionais (ex.: usuário comum só vê seus próprios dados).
  - Mutations em `orders` exigem que o usuário seja o assistente da ordem ou tenha role superior.
  - Escopos (`scopes`) só podem ser criados/editados por assistentes; inspetores têm acesso somente leitura.

### Personas (Assistente vs Inspetor)

- A tabela `public.user_personas` armazena a persona (`assistant` ou `inspector`) de cada usuário.
- O inspetor só acessa o dashboard se tiver um código atribuído (`inspector_user_assignments`).
- A UI reage à persona: rotas diferentes, menus diferentes.

---

## 🧱 Arquitetura de API e Segurança

- **Todas as chamadas a banco passam pela API** – nunca do frontend.
- **Catch-all routes** centralizam o roteamento, facilitando a aplicação de middleware de segurança.
- **Headers de segurança:**
  - `Cache-Control: private, no-store, max-age=0` – impede cache de respostas autenticadas.
  - `Vary: Authorization` – evita servir resposta de um usuário para outro.
  - `X-Content-Type-Options: nosniff` (aplicado por padrão na Vercel).
- **CORS:** não configurado explicitamente; as funções da Vercel herdam as configurações do projeto (recomenda-se restringir origem em produção).

---

## 🗄️ Proteção dos Bancos de Dados

### Supabase (HOT)

- **Conexões:** pool com `max: 1` no `server/_lib/db.ts` – evita esgotamento de conexões, mas também limita paralelismo (escolha consciente de custo).
- **Queries:**
  - Uso de `sql` template tag com escape automático (biblioteca `postgres`).
  - Nunca concatenar strings de usuário diretamente.
  - Filtros e paginação obrigatórios – impede que um usuário malicioso force um `SELECT *` gigante.
- **Índices** sensíveis (ex.: `orders.assistant_id`, `orders.updated_at`) garantem que consultas não varem tabelas inteiras.

### Turso (COLD)

- Acesso exclusivo via API; as credenciais (`TURSO_AUTH_TOKEN`) estão apenas nas variáveis de ambiente da Vercel.
- Dados de pagamento (snapshots) são imutáveis – uma vez escritos, não podem ser alterados por usuários comuns.

---

## 🧠 Prevenção contra Ataques Comuns

| Ameaça | Mitigação |
|--------|-----------|
| **Injeção SQL** | Uso de queries parametrizadas (template tags) |
| **IDOR (Insecure Direct Object Reference)** | Validação de propriedade: antes de retornar/modificar um recurso, o backend verifica se o `users.id` do requisitante tem permissão (ex.: `orders.assistant_id` deve bater com `req.user.id` para usuários comuns). |
| **Exposição de dados sensíveis** | Campos como `*_clerk_user_id` são expostos apenas quando necessário para compatibilidade; a tendência é removê-los. |
| **Rate limiting** | Não implementado globalmente, mas o design de polling lento e freeze por inatividade reduz carga. Recomenda-se adicionar no futuro. |
| **CSRF** | Tokens de autenticação são enviados no header `Authorization`, não em cookies, então CSRF não é aplicável. |
| **XSS** | O React já escapa conteúdo por padrão. Evitar `dangerouslySetInnerHTML`. |

---

## 📦 Frontend: Boas Práticas

- **Nenhuma chave secreta** no frontend – apenas a publishable key do Clerk (que é pública).
- **`localStorage`** usado apenas para cache não sensível (dados já autenticados). Dados críticos como tokens não são armazenados (Clerk gerencia em memória/httpOnly cookies?).
- **Freeze manager** – quando a aba fica inativa, o app para de fazer requisições, reduzindo superfície de ataque em segundo plano.
- **Deduplicação de requests** (`apiClient.ts`) evita que múltiplos componentes disparem o mesmo GET, mas não compromete segurança.

---

## 🚨 Resposta a Incidentes e Logs

- **Audit logs** (`server/api/audit-logs.ts`) registram ações importantes (mudanças de role, deleções, etc.) no banco COLD.
- **Logs da Vercel** podem ser consultados para rastrear erros ou tentativas de acesso indevido.
- **Erros 401/403** são retornados com mensagens genéricas para não vazar informações.

---

## 🧪 Testes e Validação

- **RBAC** é testado manualmente nos endpoints mais críticos.
- **Checklist de segurança** incluído no `README-relatorio-tecnico.md` e `README-objetivos.md` como item futuro.

---

## 📚 Referências

- [README-regras.md](./README-regras.md) – regras arquiteturais de segurança.
- [README-HANDOFF.md](./README-HANDOFF.md) – histórico de decisões, incluindo hardening.
- [Clerk Documentation](https://clerk.com/docs) – autenticação.
- [Vercel Security](https://vercel.com/docs/security) – infraestrutura.

---

## ⚠️ Aviso Importante

**Qualquer modificação que aumente o egress do Supabase ou que exponha dados sem a devida autorização deve ser justificada e aprovada.** A regra de ouro do projeto é: *segurança e economia andam juntas*.
