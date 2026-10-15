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

## CRM

Colunas: Lead → Follow-up → Sem interesse → Reunião agendada → Reunião realizada → Bolo → Fechado sem sucesso → Fechado com sucesso.

Sem interesse e Bolo permanecem etapas de acompanhamento, sem automações específicas. Fechado sem sucesso exige motivo. As colunas podem ser alteradas pelo seletor ou arrastando o card.

Fechado com sucesso disponibiliza **Enviar para produção** no card e no painel de detalhes. Mover a oportunidade para essa coluna não cria demanda. O envio exige serviço contratado, valor fechado, briefing, prazo e entregáveis. Venda, demanda, entregáveis, agenda, histórico, auditoria e notificações são gravados na mesma transação. Envios concorrentes da mesma oportunidade retornam a demanda existente. Após o envio, a oportunidade permanece fechada e mostra o vínculo com a produção.

## Produção

A Gestora pode criar **Nova demanda**, selecionando um cliente ou cadastrando um novo cliente no formulário. Essa operação cria demanda, entregáveis e compromisso sem inventar venda ou oportunidade; `saleId` fica vazio. Leads precisam de fechamento com sucesso antes de entrar em produção.

A Gestora atribui cada entregável a um editor ativo ou a si mesma, com prazo de edição e revisão opcional. A atribuição atualiza os eventos, a notificação e a auditoria na mesma transação. Em **Meus trabalhos**, a Gestora inicia sua edição e envia para revisão mantendo seu perfil administrativo.

Em **Editores**, Editar editor abre a administração de usuários. Nome e e-mail podem ser atualizados; ativação/desativação e redefinição de senha continuam disponíveis. Não é possível trocar o perfil da Gestora por esse formulário. Alterar o e-mail de um editor encerra suas sessões.

## Agendas e legibilidade

Kanbans têm colunas, textos e dados maiores. As agendas compartilham calendário amplo com dia, semana, mês e lista, pesquisa, filtros e cartões que mostram horário, cliente, origem e responsável com perfil/nome. Detalhes exibem contexto e links para a oportunidade ou demanda de origem. Horários e agrupamentos usam America/Sao_Paulo. No celular, a lista facilita a leitura.

Somente a Gestora vê a Agenda Global. Atendente e Editor recebem no servidor somente seus eventos permitidos; filtros de interface não concedem acesso adicional.

## Persistência

O painel usa PostgreSQL e ações autenticadas, com atualização periódica. Dados demonstrativos do antigo estado local não são importados para produção. O armazenamento local guarda apenas rascunhos dos formulários que já possuem esse recurso; a conclusão exige resposta de sucesso do servidor.
