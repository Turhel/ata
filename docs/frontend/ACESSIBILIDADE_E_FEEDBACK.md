# Acessibilidade e Feedback

## Objetivo

Definir padrões mínimos de acessibilidade e feedback do ATA Portal.

Este documento existe para:

- melhorar legibilidade e uso
- reduzir erro operacional
- tornar a interface mais previsível
- garantir que o sistema não dependa só de cor, sorte e paciência

---

## Princípio central

Acessibilidade não é enfeite, nem “feature opcional”.
Ela melhora o uso para todo mundo.

Num sistema operacional interno, isso significa:

- leitura mais rápida
- menos erro
- mais confiança
- menos fadiga

---

# 1. Regras gerais de acessibilidade

## 1. Não depender só de cor

### Exemplo ruim

- verde = bom
- vermelho = ruim
- e só isso

### Regra

Status deve ter:

- cor
- texto
- contexto visual consistente

---

## 2. Contraste suficiente

Textos, badges e botões precisam ter contraste legível.

### Regra

Se o usuário precisar adivinhar o que está escrito, falhou.

---

## 3. Foco visível

Todo elemento interativo precisa mostrar foco de teclado.

### Inclui

- botão
- link
- input
- select
- checkbox
- item de menu
- modal actions

---

## 4. Labels reais em formulário

Campo deve ter label visível ou associada corretamente.

### Regra

Placeholder não substitui label.

---

## 5. Área clicável confortável

Principalmente para:

- checkbox
- botões
- itens de lista
- ações em mobile

---

## 6. Navegação por teclado

As telas principais devem funcionar por teclado de forma razoável.

### Inclui

- tab order coerente
- modal com foco controlado
- botão acessível
- fechamento previsível

---

# 2. Acessibilidade em componentes críticos

## Sidebar

### Deve ter

- foco visível
- item ativo claro
- navegação por teclado razoável
- labels compreensíveis

---

## DataTable

### Deve ter

- cabeçalhos claros
- ações identificáveis
- leitura de linha sem ambiguidade

### Regra

Ícone sozinho só funciona com apoio de label ou tooltip acessível.

---

## FormField

### Deve ter

- label
- indicação de obrigatório
- erro associado ao campo
- hint quando necessário

---

## Modal

### Deve ter

- foco inicial
- foco preso enquanto aberto
- fechamento previsível
- título claro
- ação primária e secundária claras

---

## Toast

### Regra

Toast é útil, mas não pode ser o único lugar onde o sistema explica problema importante.

---

# 3. Feedback do sistema

## Objetivo

O usuário precisa perceber:

- que algo começou
- que algo terminou
- se deu certo
- se deu errado
- se não pode continuar

---

## Feedback por tipo

## Ação curta

Exemplo:

- salvar
- atualizar
- aprovar

### Usar

- botão com loading
- toast de sucesso
- mudança visível no estado

---

## Ação crítica

Exemplo:

- rejeitar
- bloquear
- devolver ao pool
- pagar lote

### Usar

- confirmação
- loading claro
- resultado visível
- erro contextual

---

## Consulta de dados

Exemplo:

- carregar lista
- abrir detalhe

### Usar

- skeleton
- vazio
- erro localizado
- retry

---

# 4. Mensagens

## Princípios de texto

### Devem ser

- diretas
- curtas
- úteis
- não técnicas demais

### Devem evitar

- jargão desnecessário
- frases vagas
- “erro desconhecido” sem contexto
- culpa jogada no usuário sem explicar o motivo

---

## Estrutura boa de mensagem

### Ideal

- o que aconteceu
- por que importou
- o que fazer agora

### Exemplo

“Order incompleta para envio. Preencha work type e endereço antes de enviar.”

---

# 5. Feedback visual por estado

## Sucesso

### Pode usar

- toast
- badge atualizado
- lista atualizada
- painel refletindo a mudança

---

## Erro

### Deve usar

- mensagem clara
- campo marcado, se for validação
- retry ou ação seguinte

---

## Aviso

### Usar quando

- falta contexto
- ação é permitida mas requer atenção
- o sistema quer alertar antes de um problema

---

## Informação

### Usar quando

- é só orientação
- não é erro
- não exige ação urgente

---

# 6. Regras para ações críticas

## Aprovar

### Feedback esperado

- mudança para status aprovado
- toast curto
- refresh da lista ou detalhe

---

## Follow-up

### Feedback esperado

- motivo obrigatório
- erro claro se faltar
- status atualizado
- retorno visual ao fluxo de revisão

---

## Reject

### Feedback esperado

- motivo obrigatório
- mudança de status clara
- histórico coerente

---

## Return to pool

### Feedback esperado

- motivo obrigatório
- status muda para disponível
- assistant desvinculado visivelmente

---

# 7. Estados de bloqueio

## Quando a ação não pode ser feita

A interface deve mostrar de forma clara.

### Exemplos

- order cancelada
- order incompleta
- status inválido
- usuário sem permissão

---

## Regra

Botão desabilitado sem explicação é ruim.
Erro depois do clique também pode ser ruim se a UI já sabia antes.

O ideal é:

- prevenir quando possível
- explicar sempre

---

# 8. Acessibilidade em mobile

## Regras

- botões maiores
- espaçamento de toque
- texto legível
- foco e hierarquia ainda claros
- evitar elementos muito pequenos

---

# 9. O que evitar

- depender só de ícone
- depender só de cor
- toast para erro importante sem contexto na tela
- modal sem foco
- checkbox minúsculo
- texto cinza-claro quase invisível
- botão destrutivo parecido com botão comum

---

# 10. Critérios mínimos de qualidade

Uma tela está aceitável quando:

- os elementos principais são legíveis
- o usuário entende o estado atual
- ações têm feedback
- erro não fica silencioso
- teclado ainda funciona razoavelmente
- foco é visível
- status não dependem só de cor

---

# Objetivo final

O ATA Portal deve comunicar estado, resultado e risco de forma clara.

Sem teatrinho visual.
Sem mistério.
Sem o usuário precisar interpretar sinais místicos da interface.
