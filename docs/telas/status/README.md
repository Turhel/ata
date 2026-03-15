# Status, erros e contingência (telas/estados)

## Objetivo

Esta pasta documenta **telas/estados críticos** do frontend para quando algo impede o uso normal do sistema:

- falta de sessão
- falta de permissão
- recurso inexistente
- conflito/concorrência de workflow
- validação inválida
- erro interno
- indisponibilidade temporária
- offline / reconexão
- manutenção planejada

O foco aqui é **experiência do usuário e implementação de UI**, não protocolo.

## “Tela real” vs “estado de falha/contingência”

- **Tela real do sistema**: páginas do produto (ex.: lista de orders, detalhe, import, approvals). Essas telas estão em `docs/telas/` (arquivos numerados).
- **Estado de falha/contingência**: UI usada quando a tela real não pode prosseguir (por erro, bloqueio, indisponibilidade, etc.). Estes arquivos servem como referência específica para implementação consistente desses estados.

## Quando usar estas telas/estados

Use este conjunto quando:

- uma rota inteira precisa “falhar com dignidade” (tela cheia)
- uma ação crítica falhou (bloco/alert contextual)
- o app está sem conectividade ou a API está fora (banner de reconexão + fallback)

## Relação com `docs/frontend/ESTADOS_GERAIS.md`

`docs/frontend/ESTADOS_GERAIS.md` define padrões gerais (loading, empty, error, success, disabled).

Esta pasta complementa com **casos críticos e recorrentes** do ATA Portal, com:

- mensagens recomendadas
- CTAs recomendados
- variações importantes
- “primeira versão mínima” para implementar

## Referências globais

- `docs/frontend/ESTADOS_GERAIS.md`
- `docs/frontend/ACESSIBILIDADE_E_FEEDBACK.md`
- `docs/frontend/UX_GERAL.md`
- Padronização reutilizável de componentes/estados: `../../frontend/STATUS_STATES_E_COMPONENTES.md`
