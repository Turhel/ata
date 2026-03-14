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
# Payments

## Objetivo

Definir a tela administrativa de pagamentos e lotes do ATA Portal.

Este mÃ³dulo existe para:

- listar lotes de pagamento
- criar lote
- editar lote aberto
- fechar lote
- marcar lote como pago
- auditar composiÃ§Ã£o financeira

---

## Rota principal

- `/payments`

---

## Rotas relacionadas

- futura rota de detalhe de lote
- futura rota de criaÃ§Ã£o/ediÃ§Ã£o dedicada, se necessÃ¡rio

---

## Roles atendidas

- `admin`
- `master`

---

## Papel da tela

A tela de pagamentos Ã© o nÃºcleo financeiro administrativo do sistema.

Ela nÃ£o existe para cÃ¡lculo solto.
Ela existe para operar lotes fechados e rastreÃ¡veis.

---

# 1. Perguntas que a tela deve responder

- quais lotes existem
- quais estÃ£o abertos
- quais estÃ£o fechados
- quais jÃ¡ foram pagos
- quantos itens hÃ¡ em cada lote
- qual valor total foi congelado
- quais orders estÃ£o incluÃ­das

---

# 2. Estrutura recomendada

## Bloco 1. Header

- tÃ­tulo: `Pagamentos`
- descriÃ§Ã£o curta
- aÃ§Ã£o principal: criar lote

## Bloco 2. MÃ©tricas

- lotes abertos
- lotes fechados
- lotes pagos
- total recente, se fizer sentido

## Bloco 3. Lista de lotes

- reference code
- status
- period start
- period end
- total items
- total amount
- created by
- closed at
- paid at
- aÃ§Ãµes

---

# 3. AÃ§Ãµes principais

## Criar lote

Selecionar orders elegÃ­veis e abrir batch financeiro

## Fechar lote

Congelar o lote e impedir inclusÃ£o normal de novos itens

## Marcar como pago

Encerrar o fluxo financeiro do lote

## Abrir detalhe do lote

Visualizar items e composiÃ§Ã£o

---

# 4. Regras de negÃ³cio refletidas na UX

## Lote `open`

- pode receber ajuste
- pode ser revisado
- ainda nÃ£o Ã© definitivo

## Lote `closed`

- pronto para pagamento
- nÃ£o deve receber ediÃ§Ã£o normal

## Lote `paid`

- definitivo
- histÃ³rico preservado
- sem ediÃ§Ã£o operacional normal

## Lote `cancelled`

- lote invÃ¡lido ou encerrado administrativamente

---

# 5. Estrutura do detalhe do lote

## Mostrar

- reference code
- status
- perÃ­odo
- total items
- total amount
- created by
- closed by
- paid by
- timestamps
- notes

## Lista de items

- order
- assistant
- inspector
- work type
- amount assistant
- amount inspector
- quantity

---

# 6. Filtros recomendados

## Primeira versÃ£o

- status
- perÃ­odo

## Depois

- reference code
- admin responsÃ¡vel
- pagos/nÃ£o pagos
- total range

---

# 7. RelaÃ§Ã£o com orders

O lote deve trabalhar sobre orders `approved`.

### ConsequÃªncia

A UI deve deixar claro:

- order aprovada nÃ£o Ã© order paga
- order batched nÃ£o Ã© order paid
- pagamento depende de lote

---

# 8. RelaÃ§Ã£o com `My Payment`

`My Payment` Ã© visÃ£o pessoal.
`Payments` Ã© visÃ£o administrativa.

As duas telas devem contar a mesma histÃ³ria, sÃ³ em nÃ­veis diferentes.

---

# 9. Estados da tela

## Loading

- skeleton de mÃ©tricas
- skeleton de lista

## Empty

- nenhum lote criado ainda
- nenhum lote com esse filtro

## Error

- erro ao carregar
- retry

---

# 10. Regras de UX importantes

- valor total precisa ter destaque
- status do lote precisa ser imediatamente legÃ­vel
- aÃ§Ãµes destrutivas ou finais precisam ser claras
- detalhe do lote precisa parecer snapshot financeiro, nÃ£o lista qualquer

---

# 11. Primeira versÃ£o mÃ­nima recomendada

## Front

- lista de lotes
- status
- total
- detalhe simples
- aÃ§Ãµes de fechar e pagar
- criaÃ§Ã£o inicial de lote

## Depois

- filtros melhores
- visualizaÃ§Ã£o mais rica dos items
- downloads e comprovantes
- validaÃ§Ãµes financeiras mais detalhadas

---

# 12. O que evitar

- misturar lote aberto com pago sem distinÃ§Ã£o clara
- permitir aÃ§Ã£o irreversÃ­vel sem contexto
- esconder composiÃ§Ã£o do lote
- mostrar â€œtotalâ€ sem mostrar base mÃ­nima de cÃ¡lculo

---

# 13. Objetivo final

A tela de payments deve fazer o financeiro administrativo parecer:

- controlado
- rastreÃ¡vel
- previsÃ­vel
- coerente com o workflow

Sem matemÃ¡tica mÃ¡gica.
Sem lote fantasma.
Sem ninguÃ©m descobrir depois que o passado foi reescrito.

