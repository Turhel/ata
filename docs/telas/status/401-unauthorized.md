# 401 — Não autenticado (Unauthorized)

## Objetivo

Definir a UX quando o usuário **não tem sessão válida** e a navegação/ação depende de autenticação.

## Quando usar

- sessão ausente (primeira entrada sem login)
- sessão expirada
- cookie/token inválido
- resposta 401 ao chamar endpoints protegidos (ex.: `/me`, `/orders`, ações de workflow)

## Papel do estado

Evitar que o usuário interprete como “bug do sistema”.
O objetivo é **orientar o próximo passo**: autenticar novamente.

## Estrutura recomendada da interface

Versão mínima (tela cheia ou bloco principal da página):

- título: “Sessão necessária”
- texto curto explicando que a sessão expirou ou não existe
- CTA primário: “Fazer login”
- CTA secundário: “Voltar para a página inicial” (opcional)

## Mensagens recomendadas

- “Sua sessão expirou. Faça login novamente.”
- “Você precisa estar logado para acessar esta área.”

Evitar:

- “Erro desconhecido”
- texto técnico (“JWT inválido”, “cookie parse error”)

## CTAs recomendados

- **Fazer login** → navegar para `/auth`
- opcional: “Tentar novamente” (quando o caso pode ser flake, mas não deve criar loop)

## Estados/variações importantes

- **Sessão ausente**: usuário nunca logou → CTA direto para `/auth`.
- **Sessão expirada**: usuário estava usando → manter o contexto e, se fizer sentido, armazenar a intenção de retorno (sem prometer comportamento se ainda não existir).

## Notas de UX

- Diferenciar claramente de 500/503 (“o sistema caiu”) — aqui o sistema está ok, mas **falta sessão**.
- Evitar loop: se `/auth` também retornar 401 por erro de integração, cair em 500/503 (não insistir em redirecionar).

## Primeira versão mínima recomendada

- Componente reutilizável “Sessão necessária” (tela cheia) com CTA para `/auth`.

## Objetivo final

- Redirecionamento consistente para `/auth` quando fizer sentido.
- Retomar o fluxo original após login, quando houver roteamento/estado do app.

