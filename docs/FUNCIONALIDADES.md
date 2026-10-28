# Fluxo comercial, produção e agendas

Regras adotadas em 14/10/2026.

## Acesso

O campo Login aceita nomes de usuário (inclusive com ponto ou @), sem exigir endereço de e-mail. O backend normaliza o identificador e preserva a senha exatamente como digitada. Contas ainda sem nome de usuário mantêm acesso por e-mail; após definir o nome de usuário, somente ele autentica a conta. A escolha do perfil continua obrigatória e é conferida no servidor. A alteração de credenciais encerra as sessões anteriores sem recriar usuários nem perder vínculos.

A tela identifica o campo como **Usuário**, usa entrada de texto e não sugere endereço de e-mail. O envio usa `POST /api/auth/login`, com validação de origem, limite de corpo, validação de dados, controle de tentativas e as mesmas regras de sessão/perfil. O acesso não depende de um identificador de Server Action compilado que possa mudar entre deploys. A página de login é dinâmica e não fica em cache; após autenticar, uma navegação completa carrega o painel da versão em produção.

## Lead, cliente e oportunidade

- **Lead** é um contato que ainda não contratou. Novo lead cadastra o contato e uma oportunidade na primeira coluna do CRM.
- **Cliente** já contratou a Garro. Novo cliente cadastra uma pessoa/empresa, sem criar uma oportunidade fictícia. Clientes existentes também podem ter novas oportunidades.
- O cadastro é compartilhado para preservar o histórico, com classificação `LEAD` ou `CLIENTE`. Fechado com sucesso promove o contato para cliente; uma oportunidade posterior perdida não desfaz o relacionamento anterior.
- Clientes e leads têm filtros separados na tela de cadastros. Editar contato atualiza os dados gerais; o serviço pertence à oportunidade.
- No cadastro de novo lead, Serviço de interesse é um seletor com os 11 serviços aprovados pela Garro, de Ensaio PESSOAL a Aluguel estúdio, incluindo ensaios, campanhas, captações, coberturas, consultoria, Workshop e Curso e mentoria para fotógrafos. Nomes e ordem seguem a lista solicitada. Rascunhos com serviços anteriormente digitados são preservados.
- A data de nascimento é opcional no novo lead e na edição de um cliente já cadastrado. Ela não pode ser futura. O próximo aniversário entra na agenda às 9h de Brasília, para a atendente responsável e para a Gestora. Em 29 de fevereiro, o lembrete cai em 28 de fevereiro nos anos comuns. Na Visão geral, a Gestora vê os aniversários dos próximos 30 dias apenas de clientes ativos; leads não entram nessa lista.

## Banco de dados

Menu exclusivo da Gestora. Reúne todos os leads e clientes que passaram pela Garro, mesmo quando o card saiu do Kanban. A lista mostra situação, origem, atendente e último registro. O filtro Serviço separa Evento, Ensaio, Captação e Plano EXPANSÃO pelo nome do serviço do contato. Os segmentos por origem servem para planejar uma campanha. Ao abrir um contato, o histórico segue a ordem dos fatos: cadastro, contatos e mudanças de etapa com data, autor e motivo, produção e entrega ao cliente.

## CRM

Colunas: Lead → Tentativa de contato → Em tratativa → Sem interesse → Reunião agendada → Reunião realizada → Bolo → Fechado com sucesso → Fechado sem sucesso. A troca das duas últimas colunas é só visual.

Cada oportunidade fica com a atendente responsável. Uma atendente nova começa sem cards, clientes, follow-ups, histórico ou agenda da outra. A Gestora vê o Kanban das duas, com etiqueta do nome em cada card, na lista, no detalhe, nos follow-ups, no histórico e nos cadastros. O filtro Atendente mostra só uma delas. Essa separação é aplicada no servidor; a etiqueta não concede acesso.

Em Configurações, a Gestora edita somente os nomes exibidos das colunas. A ordem e o significado de cada etapa não mudam, e os nomes não podem se repetir.

Ao mover para Sem interesse, o sistema pergunta se deverá haver contato no futuro. Se a resposta for sim, a data pode ser em 30 dias, 60 dias ou outra data. O compromisso entra na agenda da atendente e na Agenda Global. A notificação só aparece na central no dia marcado. O card em Sem interesse tem **Editar contato futuro**.

Fechado sem sucesso pede o motivo, a mesma pergunta de retorno e, quando há retorno, o responsável: a atendente daquele card ou a Gestora. A agenda e a notificação seguem a data e a pessoa escolhida. O card tem **Editar retorno**. Arrastar o card não conclui a mudança antes dessas respostas. No último dia do mês em que foi encerrado, o card sai dessa coluna. Na data de retorno combinada, volta sozinho para Lead, com a mesma atendente, para uma nova tentativa. Sem data de retorno, ele apenas sai da coluna no fim do mês. O histórico do motivo permanece. Bolo continua etapa de acompanhamento. As demais colunas mudam pelo seletor ou arrastando o card.

Fechado com sucesso disponibiliza **Enviar para produção** no card e no painel de detalhes. Mover a oportunidade para essa coluna não cria demanda. O envio exige serviço contratado, valor fechado, briefing, prazo e entregáveis. Venda, demanda, entregáveis, agenda, histórico, auditoria e notificações são gravados na mesma transação. Envios concorrentes da mesma oportunidade retornam a demanda existente. Após o envio, a oportunidade permanece fechada e mostra o vínculo com a produção.

Gestora e Atendente podem definir ou editar o valor de uma oportunidade pelo botão **Definir valor**/**Editar valor** no painel aberto ao selecionar o card. O campo aceita centavos; deixá-lo vazio remove o valor. A mudança atualiza a atividade, registra o histórico comercial e a auditoria. Depois de enviada para produção, a demanda mantém o valor fechado e a edição pelo CRM fica bloqueada.

## Extrato de entregas

Em Relatórios, a Gestora consulta somente demandas concluídas na produção. O filtro aceita cliente, tipo de entrega, período ou a combinação deles, e o resultado agrupa por cliente ou por tipo. O período pode ser os últimos 3, 6 ou 12 meses, ou duas datas. O extrato e o PDF abrem com o logo da Garro. Cada item mostra a atividade, a descrição do que foi feito e a data da entrega em Brasília. Gerar PDF abre o extrato com a marca Garro para salvar pelo destino de impressão. Enquanto não houver entrega concluída, a tela mostra um modelo ilustrativo, com nomes de exemplo. Não entram demandas em andamento, valores, contatos ou arquivos. Atendente e Editor não recebem esse extrato.

## Produção

O cabeçalho destaca o nome da demanda, o cliente e, quando há uma venda vinculada, o serviço da oportunidade. O briefing fica no conteúdo da demanda. Cartões e listas identificam o trabalho pelo título e pelo cliente; códigos internos do banco não são exibidos nessas áreas. Demandas criadas diretamente não recebem um serviço inventado a partir do título.

A Gestora pode criar **Nova demanda**, selecionando um cliente ou cadastrando um novo cliente no formulário. Dentro de um projeto já aberto, o mesmo botão cria outra demanda para aquele cliente e a inclui na lista de demandas dele, sem copiar briefing nem entregáveis. O cliente continua fixo; título, briefing, prazo e entregáveis são informados de novo. Essa operação cria demanda, entregáveis e compromisso sem inventar venda ou oportunidade; `saleId` fica vazio. Leads precisam de fechamento com sucesso antes de entrar em produção. Um cliente pode ter várias demandas ao mesmo tempo.

No cartão da demanda e na lista, uma barra mostra a proporção dos entregáveis em cada etapa — a iniciar, em edição, em revisão, correção e aprovado — com a quantidade ao lado. O acompanhamento fica visível sem abrir o projeto. Em Referências, a Gestora informa o HD e o link do Drive. Um endereço colado sem `https://` é gravado com o protocolo. Quem abre a demanda vê os dois e pode copiar; só a Gestora edita. A barra de acompanhamento permanece legível no cartão e na lista. Dentro do projeto, cada entregável mostra só o título e o status. Prazo, script e atribuição continuam iguais e aparecem ao clicar no título. A ordem dos entregáveis é a da criação e não muda quando a Gestora atribui, aprova ou corrige um item. **Editar** altera nome, briefing, prazo do cliente e referência em qualquer etapa. **Novo**, na lista de entregáveis, inclui um item no final do mesmo projeto. Se o projeto já estava aprovado ou entregue, ele volta a indicar que há trabalho pendente, sem reordenar os itens anteriores.

**Atribuir vários**, ao lado do briefing, marca vários entregáveis do mesmo projeto e define um único editor e um único prazo. A atribuição de cada item continua disponível e pode ser alterada depois. O prazo de edição exige o dia; o horário é opcional e, se ficar em branco, vale até o fim daquele dia em Brasília. O prazo de revisão segue a mesma regra e continua opcional. Se só o horário da revisão for preenchido, o sistema pede o dia e não grava. A Gestora atribui cada entregável a um editor ativo ou a si mesma. A atribuição atualiza os eventos, a notificação e a auditoria na mesma transação. Em **Meus trabalhos**, a Gestora inicia sua edição e envia para revisão mantendo seu perfil administrativo. Os trabalhos atribuídos ficam agrupados por cliente e só aparecem ao expandir aquele cliente. O filtro de cliente reduz a lista aos clientes escolhidos. O filtro de etapa separa A iniciar, Em edição, Em revisão, Correção, Aprovado, Atrasado e Concluído. Atrasado é o prazo vencido de um trabalho que ainda não foi aprovado. Concluído reúne os aprovados. Ao abrir uma demanda, as demais daquele cliente também ficam ocultas até expandir o grupo. O editor vê o mesmo agrupamento na própria lista.

Cada entregável tem um botão **Script**. A caixa de texto fica oculta inicialmente, inclusive quando já há texto salvo, e abre somente ao selecionar o botão. A Gestora edita e salva até 10.000 caracteres, com contador, feedback e preservação de linhas/acentos. Fechar e reabrir o botão mantém o texto em edição; salvar vazio limpa o script. O editor responsável pode abrir o script para consulta. A gravação reutiliza a descrição do entregável, é auditada sem copiar o conteúdo para o log e impede sobrescrever silenciosamente alterações feitas em outra sessão.

Em **Editores**, Editar editor abre a administração de usuários. Nome e e-mail podem ser atualizados; ativação/desativação e redefinição de senha continuam disponíveis. Não é possível trocar o perfil da Gestora por esse formulário. Alterar o e-mail de um editor encerra suas sessões.

## Agendas e legibilidade

Kanbans têm colunas, textos e dados maiores. As agendas compartilham calendário amplo com dia, semana, mês e lista, pesquisa, filtros e cartões que mostram horário, cliente, origem e responsável com perfil/nome. Detalhes exibem contexto e links para a oportunidade ou demanda de origem. Horários e agrupamentos usam America/Sao_Paulo. No celular, a lista facilita a leitura.

Somente a Gestora vê a Agenda Global. Atendente e Editor recebem no servidor somente seus eventos permitidos; filtros de interface não concedem acesso adicional.

## Persistência

O painel usa PostgreSQL e ações autenticadas, com atualização periódica. Dados demonstrativos do antigo estado local não são importados para produção. O armazenamento local guarda apenas rascunhos dos formulários que já possuem esse recurso; a conclusão exige resposta de sucesso do servidor.

## Anexos do Script

Dentro de Script, a Gestora seleciona e anexa um arquivo TXT, DOC ou PDF por envio, até 10 MB por arquivo. Os anexos ficam vinculados ao entregável; o editor responsável consulta e baixa. Texto e documentos são salvos separadamente. A interface mostra nome, tamanho e confirmação. Downloads exigem sessão e autorização atual por atribuição; arquivos não são publicados em pasta pública.

A API POST `/api/script-attachments` valida origem, perfil, tamanho real do corpo, nome, extensão e assinatura/conteúdo compatível. GET `/api/script-attachments/[id]` força download privado sem cache. Metadados, bytes e auditoria são persistidos juntos em PostgreSQL; o estado do painel carrega somente metadados. Documentos pequenos usam o backup existente do banco, sem volume adicional; acompanhar crescimento do banco se o uso aumentar.
