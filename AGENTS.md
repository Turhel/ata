# Instruções permanentes (AGENTS)

Estas regras valem para qualquer tarefa futura neste repositório.

## Documentação (fonte de verdade)

1. Antes de propor **mudanças estruturais**, leia primeiro a documentação em `docs/`.
2. Considere como documentos principais:
   - `docs/PLANO.md`
   - `docs/ARQUITETURA.md`
   - `docs/DECISOES.md`
   - `docs/FLUXO_OPERACIONAL.md`
   - `docs/BANCO_DE_DADOS.md`
   - `docs/REGRAS_DE_NEGOCIO.md`
   - `docs/PERMISSOES.md`
   - `docs/ESTRUTURA_INICIAL.md`
   - `docs/MIGRACAO_DO_LEGADO.md`
3. Não implemente nada que contradiga esses documentos sem explicar claramente a divergência e o motivo.
4. Não altere a documentação existente, a menos que a tarefa peça isso explicitamente.

## Arquitetura e responsabilidades

5. O frontend **nunca** deve acessar o banco diretamente.
6. A API é a autoridade de **regras de negócio** e **permissões**.

## Estrutura do monorepo (obrigatória)

7. O projeto deve seguir monorepo com esta estrutura (e manter esta organização):
   - `apps/web`
   - `apps/api`
   - `packages/contracts`
   - `packages/shared`
   - `infra/docker`
   - `infra/caddy`
   - `infra/scripts`

## Como executar qualquer tarefa

8. Sempre que executar uma tarefa:
   - descreva rapidamente o plano
   - liste os arquivos que serão criados ou alterados
   - implemente a menor mudança funcional possível
   - mostre como validar o resultado (comandos, testes, build, etc.)
   - versione (ex.: commit/tag). Se o passo exigir `git commit`, peça confirmação antes de executar.

## Dependências e simplicidade

9. Evite adicionar dependências sem necessidade clara.
10. Prefira soluções simples e alinhadas com a documentação do projeto.
