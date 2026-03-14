> **Rascunho (legado)**
> Este arquivo é uma consolidação antiga.
> A fonte de verdade para telas reais está em `docs/telas/` (arquivos numerados) e nos índices dessa pasta.
> Não use este arquivo como referência principal de implementação.
>
> Referências:
> - `docs/telas/README.md`
> - `docs/telas/INDEX.md`
> - `docs/frontend/README.md`

---
# Master

## Objetivo

Definir a Ã¡rea principal do master no ATA Portal.

Esta tela existe para:

- servir como ponto de entrada estrutural do sistema
- mostrar saÃºde organizacional e operacional em alto nÃ­vel
- destacar incoerÃªncias de configuraÃ§Ã£o
- direcionar para mÃ³dulos de governanÃ§a e estrutura

---

## Rota principal

- `/master`

---

## Roles atendidas

- `master`

---

## Papel da tela

A tela `/master` Ã© o dashboard estrutural do sistema.

Ela nÃ£o Ã© apenas â€œo admin com mais coisasâ€.
Ela precisa refletir o papel de quem:

- organiza a estrutura
- supervisiona a saÃºde do sistema
- corrige incoerÃªncias de configuraÃ§Ã£o
- acompanha visÃ£o global

---

# 1. Perguntas que esta tela deve responder

- hÃ¡ usuÃ¡rios pendentes ou mal configurados
- hÃ¡ assistants sem time
- hÃ¡ tipos sem pricing
- hÃ¡ importaÃ§Ãµes problemÃ¡ticas
- hÃ¡ gargalos operacionais relevantes
- qual admin ou time estÃ¡ mais sobrecarregado
- o sistema estÃ¡ estruturalmente coerente

---

# 2. Estrutura recomendada

## Bloco 1. Header

- tÃ­tulo: `Master`
- descriÃ§Ã£o curta
- visÃ£o global do perÃ­odo

## Bloco 2. MÃ©tricas estruturais

- usuÃ¡rios pending
- usuÃ¡rios blocked/inactive
- assistants sem vÃ­nculo de time
- tipos sem pricing
- imports com erro
- lotes abertos

## Bloco 3. SaÃºde operacional global

- orders aguardando revisÃ£o
- follow-ups abertos
- rejeiÃ§Ãµes recentes
- volume global do perÃ­odo

## Bloco 4. Alertas estruturais

- usuÃ¡rios sem role coerente
- times desequilibrados
- tipos ativos sem pricing
- imports parcialmente concluÃ­dos
- filas administrativas crescentes

## Bloco 5. Atalhos principais

- Times
- Invitations / usuÃ¡rios
- Types
- Types Pricing
- Pool
- Approval
- Payments
- Performance Master

---

# 3. DiferenÃ§a entre `/master` e `/admin`

## `/admin`

Foco em:

- operaÃ§Ã£o do time
- fila de revisÃ£o
- acompanhamento tÃ¡tico

## `/master`

Foco em:

- saÃºde estrutural
- governanÃ§a de acesso
- catÃ¡logo e pricing
- equilÃ­brio entre equipes
- visÃ£o global

---

# 4. Widgets recomendados

## ObrigatÃ³rios na primeira versÃ£o

- cards estruturais
- lista de pendÃªncias crÃ­ticas
- atalhos administrativos estruturais
- visÃ£o resumida de gargalos globais

## Bons para depois

- ranking por admin
- trend de volume
- alertas configurÃ¡veis
- mapa de equilÃ­brio entre teams

---

# 5. AÃ§Ãµes rÃ¡pidas esperadas

- abrir `/master/invitations`
- abrir `/master/teams`
- abrir `/master/types`
- abrir `/master/types/pricing`
- abrir `/approval`
- abrir `/payments`
- abrir `/performance/master`

---

# 6. O que a tela precisa destacar

## Muito importante

- pendÃªncias estruturais
- erros de configuraÃ§Ã£o
- mÃ³dulos sem fechamento correto
- volume global fora do normal

## Menos importante

- detalhe operacional micro
- widgets decorativos
- visual excessivamente â€œexecutivoâ€ e vazio

---

# 7. UX importante

- master precisa enxergar problemas estruturais antes de procurar por eles
- alertas devem ser claros e acionÃ¡veis
- a tela deve ajudar a priorizar correÃ§Ã£o organizacional
- nÃ£o transformar a Ã¡rea master em um monte de nÃºmeros sem direÃ§Ã£o

---

# 8. Estados da tela

## Loading

- skeleton por bloco

## Empty

Em alguns blocos, vazio Ã© sinal bom.
Exemplo:

- nenhum usuÃ¡rio pendente
- nenhum tipo sem pricing
- nenhum time incoerente

Esses vazios devem parecer sucesso, nÃ£o erro.

## Error

- erro localizado por widget
- retry claro

---

# 9. Primeira versÃ£o mÃ­nima recomendada

- 4 a 6 mÃ©tricas estruturais
- bloco de alertas crÃ­ticos
- visÃ£o resumida da operaÃ§Ã£o global
- atalhos para mÃ³dulos do master

---

# 10. EvoluÃ§Ã£o futura possÃ­vel

- health score estrutural
- comparativo por admin
- tendÃªncias de configuraÃ§Ã£o e crescimento
- detecÃ§Ã£o de inconsistÃªncia de catÃ¡logo
- visÃ£o consolidada de risco operacional

---

# Objetivo final

A tela `/master` deve permitir que o master entenda rapidamente:

- se a estrutura estÃ¡ saudÃ¡vel
- se a operaÃ§Ã£o estÃ¡ sob controle
- onde existem incoerÃªncias
- quais mÃ³dulos exigem aÃ§Ã£o imediata

Sem parecer uma planilha vestida de dashboard.

