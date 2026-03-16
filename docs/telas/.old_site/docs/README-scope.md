# 🧾 Sistema de Escopos de Inspeção

O novo sistema de escopos foi desenvolvido para substituir o processo manual utilizado por assistentes e inspetores na organização dos cômodos a serem fotografados. Ele garante uma experiência padronizada, segura e eficiente, com checklist visual e controle de acesso.

## 🔧 Visão Geral

    - Assistentes geram escopos com base nos PDFs enviados pelas seguradoras.

    - Inspetores acessam o escopo por um dashboard privado (via login) e marcam checkboxes **localmente** (não persistido) conforme realizam a inspeção.

    - Escopos são salvos e versionados no banco de dados (Supabase), podendo ser consultados e arquivados.

## 🗂 Estrutura e Funcionalidades
    
    **Papel**       |   **Ações permitidas**
    Assistente      |   Criar/editar escopos, adicionar cômodos, marcar checklist, arquivar escopos
    Inspetor        |   Consultar escopos, marcar checkboxes (não persistido), sem acesso à edição

    - Interface de checklist com marcação interativa (strike-through e ícones ✅).

    - Suporte a sub-cômodos via prefixo subroom: → formatado como └ Closet.

    - Categorias automáticas (INTERIOR/EXTERIOR) baseadas no tipo da ordem.

    - Marcação de escopos como "concluídos" após todos os itens serem checados.

    - Arquivamento automático após 3 dias (ou manual).

## 📋 Exemplo de Saída Gerada

```
    352885727 - 96 FAMILY CIRCLE JEFFERSONVILLE 31044  
    Loss: Fire  
    Ponto 35  

    *++ EXTERIOR ++*

    Exterior Surfaces  
    Roof  

    *++ INTERIOR ++*

    Foyer  
    └ Linen Closet  
    Living Room  
    Master Bedroom  
    ├ Master Bedroom Retreat  
    └ Master Closet  
    ...
```

## 🔐 Acesso e Segurança

    Inspetores possuem acesso autenticado e restrito (visualização apenas).

    Escopos ficam salvos e versionados.

    Links públicos foram descartados em favor de maior segurança.

---

## 🧾 Escopos e Checklist Operacional (scopes e scope_items)

    As tabelas scopes e scope_items foram criadas para estruturar o controle de escopos de inspeções internas, oferecendo rastreabilidade, padronização e facilidade de uso para assistentes e inspetores.

## 📌 Visão Geral

    Cada escopo está vinculado a uma ordem de inspeção (orders.id).

    Os escopos representam o conjunto de ambientes/fotos que o inspetor precisa coletar.

    Os assistentes geram, editam e marcam os itens concluídos.

    Inspetores apenas visualizam e usam as checkboxes (sem persistência).

    Quando todos os itens são marcados como concluídos, o escopo entra em stand-by por 3 dias antes de ser arquivado automaticamente.

## 🔹 scopes

    Representa um escopo individual de checklist para uma inspeção.

    Coluna  |   Tipo    |   Descrição
    id  |   uuid    |   Identificador único do escopo
    order_id    |   uuid    |   FK para a ordem (orders.id)
    external_id |   text    |   ID externo (ex.: código do cliente ou da ordem)
    kind    |   text    |   Tipo do escopo (default, partial, follow-up, etc.)
    loss_reason |   text    |   Motivo de rejeição (caso aplicável)
    route_point |   text    |   Nome do ponto na rota (GPX ou planilha)
    visibility  |   text    |   Visibilidade (hoje: `private`; `public` reservado para futuro)
    created_by  |   text    |   `users.id` (UUID interno) do assistente que criou (compat: linhas antigas podem ter `clerk_user_id`)
    created_at  |   timestamp   |   Data de criação
    updated_at  |   timestamp   |   Última atualização
    archived_at |   timestamp   |   Quando foi arquivado (caso aplicável)

## 🔸 scope_items

    Itens de checklist dentro de um escopo, cada um representando uma área, cômodo ou observação.

    Coluna  |   Tipo    |   Descrição
    id  |   uuid    |   Identificador único do item
    scope_id    |   uuid    |   FK para o escopo pai (scopes.id)
    sort_order  |   integer |   Ordem de exibição dos itens
    area    |   text    |   Área geral do item (ex.: "Interior", "Exterior", "Cozinha")
    label   |   text    |   Descrição do item (ex.: "Foto da pia")
    notes   |   text    |   Observações extras (opcional)
    required    |   boolean |   Se o item é obrigatório (default: true)
    done    |   boolean |   Status de conclusão (usado apenas pelos assistentes)
    done_at |   timestamp   |   Quando o item foi marcado como feito
    done_by_user_id |   text    |   `users.id` (UUID interno) do assistente que marcou como feito (compat: linhas antigas podem ter `clerk_user_id`)
    done_by_inspector_id    |   uuid    |   FK para o inspetor (visualização apenas, sem persistência de alterações)
    created_at  |   timestamp   |   Data de criação do item
    updated_at  |   timestamp   |   Última atualização


## 🔐 Regras de Permissão
    Função  |   Ação    |   Permissão
    Assistente  |   Criar/editar escopo |   ✅
    Assistente  |   Marcar itens como concluídos    |   ✅
    Inspetor    |   Visualizar e marcar checkbox    |   ✅ (sem persistência no banco)
    Inspetor    |   Criar/editar escopos    |   ❌


## 🔗 Exibição para Inspetores

    - Os escopos podem ser acessados por URL privada digitando o external_id (worder).

    - No portal atual, o acesso é autenticado (Clerk). `visibility=public` é reservado para um fluxo futuro, mas não é usado hoje.

    - Inspetores não editam — apenas visualizam o checklist e marcam os boxes localmente.


---

## Novo Sistema de Escopo vs. Processo Antigo (é o conteúdo acima por extenso)
    O novo sistema de geração de resumo de escopo (via o componente ScopeGenerator) foi projetado para reproduzir e melhorar o processo antigo em que o assistente anotava manualmente os cômodos para fotos nas inspeções interiores. A seguir detalhamos como as novas tabelas e funcionalidades correspondem ao que o antigo processo fazia, atendendo a todos os requisitos:

## 1. Checklist Interativo de Fotos por Cômodo
    No processo antigo, o assistente marcava manualmente uma lista de cômodos e sinalizava (por exemplo, com um ✓) conforme o inspetor enviava as fotos. O novo sistema implementa essa funcionalidade através de um checklist interativo na interface do escopo. Cada item (cômodo ou elemento a fotografar) aparece com uma caixa de seleção que pode ser marcada ao receber a foto correspondente[1]. Por exemplo, quando o inspetor envia a foto do banheiro, o assistente ou inspetor pode clicar no item "Banheiro" para marcá-lo como concluído – a UI atual então exibe um ícone de check marcado no item[1] e o texto do cômodo riscado (strike-through) indicando conclusão[2]. Assim, quando 100% dos itens estiverem marcados, sabe-se que todas as fotos requeridas foram enviadas, permitindo arquivar a ordem com segurança.
    Nota: As marcações de checkboxes não são persistidas no banco de dados – elas servem apenas como acompanhamento visual. Cada clique alterna o estado localmente[3] sem alterar os dados salvos do escopo, conforme desejado (o inspetor marca para si, e o assistente controla separadamente a entrega de fotos).


## 2. Categorias (Interior/Exterior) e Itens com Subdivisões
    O escopo gerado mantém a mesma organização por categorias e cômodos que o documento PDF original e as anotações antigas utilizavam. Isso garante que o novo sistema reproduz fielmente o formato antigo:
        • As categorias principais (como EXTERIOR, INTERIOR, DETACHED) são suportadas. O assistente pode adicionar categorias manualmente ou o sistema sugere com base no tipo da ordem (otype). Por exemplo, se o tipo da ordem indica uma inspeção interior, o sistema já inclui a categoria "INTERIOR" (e "EXTERIOR" se aplicável) automaticamente[4]. Caso o tipo não indique nada (ex.: não contém "INTERIOR" nem "EXTERIOR"), por padrão pelo menos a categoria EXTERIOR é adicionada[5]. Isso impede erros – apenas ordens de interior terão categoria INTERIOR, conforme esperado (o uso do gerador pode ser restrito para ordens não-interiores, já que somente inspeções internas possuem o PDF de cômodos).
        • Cada cômodo ou item do escopo é listado sob a categoria correspondente, exatamente como no resumo manual. O assistente preenche esses itens (copiados do PDF de escopo da seguradora) no formulário do gerador. O sistema garante que cada item fique em uma linha separada na prévia textual e visual[6], com espaçamento entre cômodos conforme o exemplo fornecido.
        • O sistema suporta sub-cômodos (subrooms), reproduzindo a notação que os assistentes já utilizavam. Ao digitar o prefixo "subroom:" antes do nome do item, o gerador reconhece automaticamente e formata o item como subitem do cômodo anterior[7][8]. Na visualização, o sub-cômodo aparece indentado com o símbolo especial "└" antes do nome[8], indicando hierarquia (por exemplo, um closet dentro de um quarto aparecerá como “└ Closet” abaixo do quarto). Essa lógica garante que listagens como closets, despensas, etc., fiquem visivelmente aninhadas exatamente como no método antigo.
    Essa estrutura padronizada – categorias destacadas e itens (e sub-itens) listados – facilita tanto para o assistente durante o questionário quanto para o inspetor no campo, tal como pretendido originalmente. A formatação textual final gerada pelo sistema fica equivalente ao exemplo manual fornecido, incluindo separadores e títulos de seção, garantindo mesma clareza do documento original.


## 3. Criação do Escopo pelo Assistente (Preparação Manual)
    Assim como no processo antigo, o assistente continua responsável por extrair do PDF original os cômodos que precisam ser fotografados. Devido à baixa qualidade dos PDFs (muitas páginas, scans de impressão), não é viável automatizar a leitura via OCR ou IA – essa parte permanece manual. No novo sistema, o assistente utiliza o formulário do ScopeGenerator para inserir os dados relevantes:
        • Número da Ordem (WORDER): identificador externo da ordem de serviço. Ao inserir e buscar esse número, o sistema verifica se já existe um escopo salvo para ele ou dados básicos da ordem disponíveis:
        • Se um resumo de escopo já foi criado anteriormente para aquela ordem, ele é carregado automaticamente (endereço, causa/perda, rota e itens)[9], permitindo edição ou reutilização sem duplicar trabalho.
        • Caso contrário, o sistema tenta buscar informações da ordem em um “pool” interno (ou na lista de ordens existentes) para preencher automaticamente campos como endereço completo e tipo de trabalho (interior/exterior)[10]. Por exemplo, ao encontrar a ordem, o sistema traz o endereço e o tipo (work type) associado[10], acelerando o preenchimento. Com base nesse tipo, as categorias INTERIOR/EXTERIOR são sugeridas como mencionado. Os itens específicos (cômodos), porém, ainda devem ser inseridos manualmente pelo assistente, já que o PDF não é lido automaticamente.
        • Detalhes da Ordem: o assistente pode preencher ou editar o endereço da propriedade, o tipo de perda (Loss reason, ex: Fire) e o ponto na rota (número do ponto de visita, se houver) para contextualizar o escopo. Esses dados são opcionais mas ajudam a identificar o escopo – eles aparecem no topo do resumo (ex.: 352885727 - 96 FAMILY CIRCLE..., Loss: Fire, Ponto 35 no exemplo).
        • Categorias e Itens: o assistente então adiciona as categorias (se necessárias) e lista todos os cômodos/itens que precisam de foto dentro de cada categoria. A interface permite adicionar linhas dinamicamente para cada item. Qualquer linha vazia ou não utilizada pode ser removida para manter o resumo limpo[6]. Conforme o assistente digita cada cômodo, ele pode usar o prefixo subroom: quando aplicável, como mencionado, para subitens.
    Depois de preencher tudo, o assistente gera uma pré-visualização do escopo estruturado no painel direito (texto formatado e checklist visual interativo). Satisfeito com o resultado, ele salva o resumo no sistema. Ao clicar em Salvar, os dados são enviados e armazenados nas novas tabelas do banco de dados (tabela de escopos), incluindo o número da ordem e a lista de categorias/itens estruturados[11]. Uma mensagem de sucesso confirma o salvamento[12]. Esse salvamento padronizado é uma melhoria importante: antes, as anotações ficavam dispersas (e.g. em planilhas ou chats); agora o escopo fica centralizado e pode ser recuperado a qualquer momento.
    Importante: Atualmente, o escopo gerado é salvo internamente (endpoint /api/scopes/summaries) como um objeto JSON contendo todas as categorias e itens[13][14]. Isso difere das "notas soltas" do método antigo, garantindo padronização. No banco HOT (Supabase), o modelo normalizado oficial para checklist é `scopes` + `scope_items` (substituiu qualquer tentativa anterior de `order_scopes/order_scope_items`).


## 4. Acesso do Inspetor via Dashboard Privado
    Para que o inspetor possa utilizar o escopo de forma prática em campo (marcando que fotos já foram tiradas, evitando perder algum cômodo), o novo sistema prevê um acesso dedicado para inspetores. Diferentemente do passado, onde o escopo era enviado talvez por PDF reduzido ou mensagem, agora será possível o inspetor visualizar a lista interativa diretamente no site:
        • Foi decidida a criação de um perfil de usuário "Inspetor" no sistema, com permissões limitadas. Esse inspetor terá um dashboard simplificado, provavelmente apenas com a funcionalidade de consultar escopos. Na prática, ao fazer login, o inspetor verá uma tela onde pode digitar o número da ordem (WORDER) da inspeção que ele vai realizar e então visualizar o resumo de escopo correspondente, se já existente. Essa busca utiliza o mesmo mecanismo acima (busca pelo ID externo da ordem) para recuperar o escopo salvo[16][9].
        • Link de acesso vs. autenticação: Inicialmente cogitou-se enviar um link público para o inspetor acessar o escopo sem login. No entanto, por segurança e privacidade dos dados, optou-se por manter a solução interna e privada. Portanto, o inspetor deverá acessar o site com sua conta (de inspetor) para visualizar o escopo. O sistema já possui uma estrutura para listar inspetores internamente (tabela inspectors_directory e APIs relacionadas) e agora integrará isso com autenticação de usuários inspetores. Em resumo, somente pessoas autorizadas (inspetores cadastrados) conseguirão acessar os escopos de suas ordens, mantendo o controle de acesso.
        • Visualização e marcação: Ao abrir o escopo, o inspetor verá exatamente a mesma lista de categorias e itens preparada pelo assistente, com caixas de seleção. Ele poderá então, durante a inspeção, utilizar seu dispositivo móvel para marcar cada item conforme tira as fotos correspondentes – como um checklist pessoal. Essa marcação, como mencionado, é temporária/local (não grava no servidor), portanto não interfere em nada no que o assistente vê ou nos dados do sistema. É apenas uma facilidade para o inspetor não se perder ou esquecer fotos durante a execução.
        • Somente leitura para conteúdo: Diferente do assistente, o inspetor não pode editar o escopo (não pode adicionar/remover itens). Ele tem acesso somente-leitura aos dados do escopo, garantindo que a padronização feita pelo assistente não seja alterada. O único elemento interativo para o inspetor são as caixas de seleção que ele mesmo pode clicar, mas que, como reforçado, não alteram o conteúdo salvo[3]. Dessa forma, mantemos a integridade do escopo (somente assistentes podem alterá-lo) ao mesmo tempo que oferecemos ao inspetor uma ferramenta prática de acompanhamento.
        • Escopo inexistente: Caso o inspetor tente consultar uma ordem que ainda não tenha um escopo criado pelo assistente, o sistema não encontrará dados – o inspetor verá uma mensagem de que não há escopo disponível (ou simplesmente não retornará nenhum item). Nessa situação, seguindo o processo atual, o inspetor deverá contatar o assistente (via WhatsApp/Telegram fora do sistema) solicitando que prepare o escopo. Esse fluxo garante que o inspetor sempre obtenha o resumo somente após o assistente tê-lo gerado e verificado. No futuro, podemos melhorar a UX para já indicar "Escopo não encontrado, contate seu assistente.", mas o importante é que os inspetores não conseguem criar escopos por conta própria – mantém-se o controle pelo time interno.


## 5. Persistência, Histórico e Arquivamento
    Uma vantagem do novo sistema é que os escopos ficam salvos e versionados no banco de dados, permitindo histórico e reutilização. Cada resumo de escopo salvo recebe um ID e registra quem criou e quando[17]. Com isso, além de carregar escopos existentes como citado, é possível listar e gerenciar escopos já cadastrados (por exemplo, há uma interface interna "Escopos de Inspeção" mostrando todos os escopos registrados[15][18]). Essa rastreabilidade não existia no processo manual antigo.
    Quanto ao arquivamento, o procedimento continuará semelhante ao antigo, com uma melhoria de controle:
        • Assim que todos os itens tiverem sido marcados como recebidos (ou seja, o assistente confirma que chegaram fotos de todos os cômodos exigidos), considera-se o escopo concluído para aquela ordem. No método antigo, o assistente já poderia fechar/arquivar a ordem nesse momento. No novo sistema, a ideia é colocar o escopo em um estado de stand-by após conclusão: ele permanece acessível por mais 3 dias antes de ser marcado como arquivado. Esse prazo de segurança serve para cobrir eventuais follow-ups – por exemplo, se a seguradora solicitar fotos adicionais ou correções após a inspeção, dentro de poucos dias, ainda teremos o escopo à mão. Passado esse período sem novas fotos ou requerimentos, o escopo pode ser formalmente arquivado no sistema (indicando que a inspeção interna foi finalizada e não requer mais acompanhamento).
        • A implementação do arquivamento poderá ser automática (um job que arquiva escopos concluídos há >3 dias) ou manual com notificação. De qualquer forma, o novo sistema suportará marcar escopos como arquivados, diferenciando-os dos ativos. Isso atende à mesma finalidade de limpar as ordens concluídas da vista principal, tal como os assistentes faziam manualmente.


## 6. Conclusão: Cobertura Total das Funções Antigas
    Em resumo, as novas tabelas e funcionalidades reproduzem completamente o que o processo antigo fazia, adicionando benefícios. O assistente continua obtendo do PDF os cômodos necessários, porém agora insere-os em um formato padronizado e armazenado centralmente. O inspetor ganha uma ferramenta interativa para seguir o checklist sem precisar de documentos impressos ou anotações informais. A coordenação entre assistente e inspetor permanece (o assistente prepara, o inspetor executa), mas agora suportada por um sistema unificado.
    Todas as características citadas – lista categorizada de cômodos, marcação de conclusão, controle de acesso por perfil, preservação do histórico e arquivamento – estão contempladas no novo design. Portanto, sim, as novas tabelas/funcionalidades conseguem reproduzir o que o antigo fazia e oferecem uma experiência mais integrada e confiável, reduzindo erros (como esquecer fotos) e esforço manual de ambos os lados. O resultado é um fluxo de trabalho mais eficiente sem perder nenhuma capacidade que existia antes, validando o sucesso da migração para o novo sistema de escopos.


## Fontes (referências no repo)
    • Trechos do código do ScopeGenerator demonstrando geração de checklist interativo e lógica de subitens[8][2].
    • Implementação da marcação de checkbox local (não persistente)[3].
    • Lógica de preenchimento automático de categorias com base no tipo de ordem (INTERIOR/EXTERIOR)[4][5].
    • Busca de dados da ordem e reutilização de escopos existentes[9][10].
    • Salvamento do resumo de escopo no banco de dados via API (scope-summaries)[11][14].
    • Interface de listagem de escopos cadastrados (tabelas `scopes` e `scope_items`)[15].

    [1]–[11] ScopeGenerator.tsx → `src/pages/dashboard/ScopeGenerator.tsx`
    [12]–[17] useScopeSummaries.tsx → `src/hooks/useScopeSummaries.tsx`
    [15], [18] InspectionScopes.tsx → `src/pages/dashboard/InspectionScopes.tsx`
