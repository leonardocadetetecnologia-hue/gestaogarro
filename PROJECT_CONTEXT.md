# PROJECT_CONTEXT — GARRO PRODUTORA

> Documento de contexto específico do Sistema Integrado Garro Produtora.
>
> MASTER_PROMPT.md define COMO o Codex deve trabalhar.
> PROJECT_CONTEXT.md define COMO ESTE PROJETO funciona.
>
> Última atualização: 14/10/2026.
> Status: especificação funcional aprovada, desenvolvimento e implantação a validar.

## Atualização funcional adotada em 14/10/2026

As regras atuais do fluxo comercial, produção, cadastros e agendas estão em [FUNCIONALIDADES.md](docs/FUNCIONALIDADES.md), com [permissões](docs/MATRIZ_DE_PERMISSOES.md) e [validação](docs/TESTES_E_QUALIDADE.md). Estas alterações substituem o fluxo comercial original descrito abaixo:

- Lead é contato comercial; cliente já contratou. Cadastro de cliente não cria lead. Novas oportunidades reutilizam contatos existentes.
- CRM: Lead, Tentativa de contato, Em tratativa, Sem interesse, Reunião agendada, Reunião realizada, Bolo, Fechado com sucesso, Fechado sem sucesso. No quadro, Fechado com sucesso fica na penúltima coluna e Fechado sem sucesso na última; essa troca é só visual. A Gestora pode renomear essas colunas em Configurações, sem alterar a ordem nem as regras.
- Fechado sem sucesso sai do quadro no último dia daquele mês. Se houver data de retorno, a oportunidade volta para Lead nessa data, com a mesma atendente, para nova tentativa.
- A Gestora tem o menu Banco de dados, com todos os leads e clientes e o histórico do Kanban até a entrega. Atendente e editor não acessam essa visão.
- Fechado com sucesso converte o contato para cliente. A demanda nasce somente pela ação explícita Enviar para produção, com dados validados e gravação transacional.
- A Gestora também cria demandas diretamente para clientes existentes ou novos, sem venda fictícia.
- Desde 27/10/2026, a ordem dos entregáveis é a da criação e não muda ao atribuir, aprovar ou corrigir. A Gestora edita nome, briefing, prazo e referência em qualquer etapa e inclui um entregável novo no final do mesmo projeto.
- Desde 27/10/2026, a Gestora pode atribuir vários entregáveis do mesmo projeto a um editor de uma vez, e ainda alterar cada item depois. No prazo de edição, o dia é obrigatório e o horário é opcional.
- Desde 27/10/2026, cada atendente vê somente os próprios atendimentos. Uma conta nova não herda o Kanban da outra. A Gestora vê os dois Kanbans, com o nome da atendente em cada item e ação.
- Desde 27/10/2026, a data de nascimento informada no lead ou na edição do cliente vira lembrete de aniversário na agenda. A Visão geral lista os próximos 30 dias apenas de clientes ativos.
- Desde 27/10/2026, o HD e o Drive ficam em Referências. Um link sem protocolo recebe `https://`. A barra de status dos entregáveis aparece no cartão e na lista.
- Medido em 27/10/2026 no banco de produção: o Kanban da atendente com mais cards (28 oportunidades) responde em cerca de 2 ms. O quadro não é o gargalo nesse volume. O painel recarrega o estado a cada 30 segundos e a cada abertura.
- O que entra no ar em 28/10/2026, e como cada parte foi feita, está em `docs/ALTERACOES_2026-10-28.md`.
- Desde 28/10/2026, o Kanban da Gestora tem três visões: operação, valores por coluna e categorias por coluna. A atendente permanece na visão de cards.
- Desde 28/10/2026, em Relatórios a Gestora ajusta o extrato numa janela e preenche só o nome do cliente, a descrição e a data de entrega. O nome já vem o inicial. Exportar seleção, no histórico de entregues, abre essa mesma janela.
- Desde 28/10/2026, a Visão geral da Gestora mostra duas pizzas coloridas: demandas por etapa e comercial por etapa. Fatia sem quantidade não entra.
- Desde 28/10/2026, na página Demandas a Gestora atribui função isolada à atendente, com data limite. O prazo vira compromisso na agenda. Só a Gestora exclui essa função. A atendente cria compromisso pessoal na agenda e só ela exclui o pessoal.
- Desde 28/10/2026, a agenda é mais compacta, com zoom leve. A tag Atrasado e a tag Próximo do atraso, nas seis horas anteriores ao horário, usam o terracota da marca.
- Desde 28/10/2026, as colunas do kanban comercial e do de produção dividem a largura útil: todas as etapas ficam na tela, sem sobra e sem rolagem lateral. O texto permanece dentro da coluna. A coluna cresce com os cartões e a página inteira rola para baixo.
- Desde 28/10/2026, o sino abre as não lidas numa janela. Limpar uma ou limpar todas marca como lida. A página Notificações guarda o histórico.
- Desde 28/10/2026, a coluna Entregue do quadro mostra só o mês escolhido no topo. A entrega de outro mês continua gravada e a Gestora a encontra em Entregues, com PDF de uma entrega ou de uma seleção. O filtro de mês vale para quem vê o quadro; o histórico e a exportação, só para a Gestora.
- Desde 28/10/2026, o quadro de produção filtra Foto, Vídeo e Plano EXPANSÃO. A visão por entregável coloca cada material na coluna da etapa dele, em vez de juntar o projeto inteiro num cartão só.
- Desde 28/10/2026, Nova demanda e o envio para produção pedem Foto, Vídeo ou Foto e vídeo numa linha só. A Gestora corrige o tipo em Editar, e o cartão do quadro mostra essa marcação. Com tipo, a esteira usa esse valor; sem tipo, continua pelo nome. Plano EXPANSÃO segue separado, pelo texto de expansão.
- Desde 28/10/2026, a Gestora grava os links de entrega ao lado de HD e Drive. Cada entregável mostra o número da criação. Na demanda já entregue, a Gestora exporta o PDF do que foi concluído naquele mês ou intervalo.
- Desde 29/10/2026, o menu Monitoramento é só da Gestora. Ali entram entrada, saída e o histórico de inclusão, alteração e movimento de card das atendentes, nos últimos 90 dias. A lista do Edifício Contemporâneo foi atribuída somente a `ana.atendente`; a outra atendente não vê esses cards.
- Desde 30/10/2026, a Gestora volta um entregável aprovado para correção ou revisão, e arquiva o que foi criado errado. O arquivado sai da esteira, do quadro, do extrato e da agenda do editor, e pode ser restaurado. O número dos demais não muda.
- Desde 30/10/2026, o mês da coluna Entregue é uma lista. O mês atual vem selecionado e os meses anteriores, e os que já têm entrega, podem ser escolhidos.
- Desde 30/10/2026, o menu Serviços guarda o catálogo da Garro. A Gestora edita e gera o PDF. A atendente vê a tabela de venda, sem o custo, e só propõe mudanças. A mudança entra depois da autorização. O editor não acessa. Arquivar tira das novas escolhas; excluir só o que nunca foi usado. O catálogo não reescreve projeto já fechado.
- A Gestora edita editores e pode executar seus próprios entregáveis, mantendo o perfil administrativo.
- Agendas e Kanbans ampliados; eventos têm detalhes, origem e identificação do responsável. Agenda Global exclusiva da Gestora, com restrições aplicadas no servidor.
- Painel alimentado pelo PostgreSQL, sem demonstrações locais em produção.
- Login por nome de usuário único, separado do e-mail. Contas legadas sem nome de usuário continuam usando e-mail; a definição de um usuário substitui esse acesso. Trocas de credenciais revogam as sessões anteriores e preservam IDs e permissões.
- A tela usa o rótulo Usuário, sem validação de e-mail. A entrada passa pelo endpoint estável `/api/auth/login`, com conferência de origem, tamanho de corpo e perfil; a página de login é dinâmica e sem cache para evitar versões antigas após publicações.
- Ambiente real: `/opt/garro`, Docker Compose atrás do Traefik existente, publicação em `https://garroprodutora.com.br/gestaogarro`. O site público permanece na raiz desse domínio e o endereço anterior em cadete.tech permanece disponível. Caddy standalone continua opção para outras VPS.

---

## 1. IDENTIFICAÇÃO

**Nome:** Garro — Sistema Integrado de Gestão

**Empresa:** Garro Produtora

**Objetivo:** desenvolver um sistema único para gestão comercial e operacional da produtora.

O sistema deve acompanhar:

1. Cadastro de clientes.
2. Captação e qualificação de leads.
3. Atendimento comercial.
4. Negociações e orçamentos.
5. Fechamento das vendas.
6. Geração automática de demandas.
7. Planejamento de produção.
8. Delegação para editores.
9. Controle de prazos.
10. Comunicação interna.
11. Revisão e correções.
12. Aprovação e entrega ao cliente.
13. Indicadores e relatórios.

### Premissas

- Um único sistema integrado.
- Interface web responsiva.
- Sem integração com WhatsApp na primeira etapa.
- CRM alimentado manualmente pela atendente.
- Três perfis: Gestora, Atendente e Editor.
- Hospedagem em VPS própria.
- PostgreSQL como banco principal.
- Implantação via Docker Compose + Caddy.
- Não utilizar Coolify na primeira versão.

Idioma: Português do Brasil.

Moeda: BRL.

Timezone: America/Sao_Paulo.

---

## 2. STACK TECNOLÓGICA

### Frontend

- Next.js com App Router.
- React.
- TypeScript estrito.
- Tailwind CSS.
- Lucide React.
- Componentes próprios e reutilizáveis.
- React Hook Form.
- Zod.
- Componentização por domínio.

Evitar dependências desnecessárias e bibliotecas pesadas de UI.

### Backend

- Next.js Server Actions e Route Handlers.
- TypeScript.
- Serviços organizados por domínio.
- Validação de entrada com Zod.
- Autenticação baseada em sessões.
- Autorização por perfil e por recurso.
- Transações em operações críticas.

### Banco

- PostgreSQL.
- Prisma ORM.
- Prisma Migrate.
- Integridade referencial.
- Índices para consultas frequentes.
- Valores monetários em Decimal.
- Datas armazenadas em UTC.

### Infraestrutura

- VPS Linux.
- Docker Engine.
- Docker Compose.
- Caddy.
- Git.
- HTTPS automático.
- PostgreSQL privado.
- Volumes persistentes.
- Backups automatizados.

**Não utilizar Coolify, Dokploy ou outra plataforma de gerenciamento de containers nesta etapa.**

### Testes

- Testes unitários das regras de negócio.
- Testes de integração com PostgreSQL.
- Testes de permissões.
- Testes dos fluxos críticos.
- Testes de interface responsiva.
- Testes E2E quando necessário.

Ferramentas sugeridas:

- Vitest.
- Testing Library.
- Playwright.

---

## 3. ARQUITETURA DE IMPLANTAÇÃO

### Estrutura

Internet
↓
Domínio Garro
↓
Caddy — HTTPS
↓
Next.js — Frontend e Backend
↓
PostgreSQL

Todos os serviços serão executados na VPS.

### Containers

#### app

Aplicação Next.js.

- Porta interna: 3000.
- Não expor publicamente.
- Comunicação pela rede Docker.
- Build de produção.
- Healthcheck.

#### db

PostgreSQL.

- Porta interna: 5432.
- Não expor publicamente.
- Volume persistente.
- Credenciais por variáveis de ambiente.
- Healthcheck.
- Backup automatizado.

#### caddy

Proxy reverso.

- Porta pública 80.
- Porta pública 443.
- HTTPS automático.
- Renovação automática de certificados.
- Encaminhamento para app:3000.

### Estrutura sugerida

    garro/
    ├── src/
    │   ├── app/
    │   ├── components/
    │   ├── modules/
    │   ├── lib/
    │   └── types/
    │
    ├── prisma/
    │   ├── schema.prisma
    │   ├── migrations/
    │   └── seed.ts
    │
    ├── public/
    │
    ├── infra/
    │   ├── Caddyfile
    │   └── README.md
    │
    ├── scripts/
    │   ├── deploy.sh
    │   ├── backup-postgres.sh
    │   ├── backup-daily.sh
    │   ├── backup-system.sh
    │   └── restore-postgres.sh
    │
    ├── docs/
    │   └── DEPLOY_VPS.md
    │
    ├── Dockerfile
    ├── compose.yaml
    ├── .env.example
    ├── .gitignore
    ├── package.json
    └── PROJECT_CONTEXT.md

A estrutura deve ser adaptada ao repositório real.

Não recriar um projeto existente sem necessidade.

---

## 4. DEPLOY NA VPS

### Objetivo

Permitir que o sistema seja publicado e atualizado facilmente, sem depender de um painel adicional.

O processo deve ser executável pelo Codex ou pelo operador utilizando comandos documentados.

### Primeiro deploy

1. Preparar a VPS.
2. Instalar Docker Engine.
3. Instalar plugin Docker Compose.
4. Configurar firewall.
5. Configurar domínio e DNS.
6. Clonar o repositório.
7. Configurar variáveis de ambiente.
8. Inicializar PostgreSQL.
9. Executar migrations.
10. Executar seed inicial.
11. Construir aplicação.
12. Iniciar containers.
13. Validar HTTPS.
14. Testar autenticação e permissões.

### Atualizações

A estratégia inicial será manual e controlada.

Fluxo:

Código aprovado
↓
Commit no Git
↓
Atualização do código na VPS
↓
Build
↓
Backup pré-migração, se necessário
↓
Prisma Migrate Deploy
↓
Atualização dos containers
↓
Healthcheck
↓
Validação

O Codex deverá disponibilizar um script de deploy.

### Comandos básicos

Subir serviços:

    docker compose up -d --build

Visualizar containers:

    docker compose ps

Visualizar logs:

    docker compose logs -f app

Reiniciar aplicação:

    docker compose restart app

Esses comandos são exemplos operacionais.

A publicação definitiva deverá incluir validação, migrations e tratamento de falhas.

### Segurança do deploy

- Não armazenar senhas no Git.
- Não expor PostgreSQL.
- Não expor a porta 3000.
- Publicar somente portas 80/443.
- Utilizar HTTPS.
- Proteger acesso SSH.
- Restringir permissões do arquivo .env.
- Não utilizar docker compose down -v em produção.
- Não eliminar volumes durante atualizações.
- Não executar migrations concorrentes.
- Manter possibilidade de rollback.

### Backup

Criar rotina de backup PostgreSQL utilizando pg_dump.

Requisitos:

- Execução automatizada.
- Rotação dos arquivos.
- Armazenamento protegido.
- Cópia externa recomendada.
- Procedimento de restauração.
- Teste periódico da restauração.

Volume persistente não substitui backup.

### CI/CD futuro

GitHub Actions poderá ser implementado posteriormente.

Não habilitar publicação automática sem autorização.

O primeiro modelo será manual e previsível.

---

## 5. ARQUITETURA DO PRODUTO

A solução será um monólito modular.

Não criar três sistemas independentes.

Os três perfis utilizarão o mesmo backend e banco, respeitando permissões.

### Fluxo

CLIENTE
↓
CRM
↓
OPORTUNIDADE
↓
NEGOCIAÇÃO
↓
VENDA
↓
DEMANDA
↓
GESTORA
↓
PLANEJAMENTO
↓
ENTREGÁVEIS
↓
EDITOR
↓
PRODUÇÃO
↓
REVISÃO GARRO
↓
APROVAÇÃO OU CORREÇÃO
↓
ENTREGA AO CLIENTE

### Módulos

- Autenticação.
- Usuários.
- CRM.
- Clientes.
- Oportunidades.
- Interações.
- Follow-ups.
- Vendas.
- Demandas.
- Entregáveis.
- Editores.
- Revisões.
- Conversa da demanda.
- Agenda.
- Notificações.
- Relatórios.
- Configurações.
- Auditoria.

---

## 6. PERFIS DE ACESSO

### GESTOR_GARRO

Quantidade: 1.

É a proprietária da produtora.

Possui acesso completo ao sistema.

Menus:

- Dashboard Geral.
- CRM.
- Clientes.
- Vendas.
- Demandas.
- Produção.
- Agenda Global.
- Editores.
- Relatórios.
- Notificações.
- Configurações.
- Usuários.

Permissões:

- Gerenciar clientes.
- Gerenciar oportunidades.
- Consultar valores comerciais.
- Gerenciar vendas.
- Criar demandas.
- Editar demandas.
- Criar entregáveis.
- Delegar editores.
- Alterar prazos.
- Solicitar correções.
- Aprovar materiais.
- Concluir demandas.
- Visualizar todas as agendas.
- Gerenciar usuários.
- Criar e desativar editores.

### ATENDENTE

Quantidade: 1.

Usuária pré-criada na implantação inicial.

Acesso exclusivamente comercial.

Menus:

- Dashboard Comercial.
- CRM.
- Clientes.
- Follow-ups.
- Agenda Comercial.
- Histórico Comercial.
- Meu Perfil.

Permissões:

- Cadastrar clientes.
- Atualizar cadastros.
- Registrar contatos.
- Criar oportunidades.
- Movimentar Kanban.
- Atualizar valores.
- Registrar propostas.
- Criar follow-ups.
- Fechar vendas.
- Registrar perdas.

Restrições:

- Não acessar a produção.
- Não gerenciar editores.
- Não acessar demandas operacionais.
- Não alterar revisão de materiais.
- Não consultar a Agenda Global.
- Não gerenciar usuários.
- Não consultar clientes, oportunidades, valores, follow-ups, histórico ou agenda de outra atendente.

### EDITOR

Quantidade: múltiplos.

Cada editor será criado pela Gestora.

Menus:

- Minhas Demandas.
- Minha Agenda.
- Notificações.
- Meu Perfil.

Permissões:

- Consultar entregáveis atribuídos.
- Consultar briefing.
- Consultar arquivos autorizados.
- Consultar seus prazos.
- Iniciar produção.
- Atualizar status permitido.
- Enviar para revisão.
- Responder correções.
- Conversar com a Gestora.
- Inserir observações e arquivos.

Restrições:

- Não acessar CRM.
- Não consultar valores comerciais.
- Não consultar demandas de outros editores.
- Não consultar agenda global.
- Não gerenciar usuários.
- Não aprovar a própria entrega em nome da Gestora.

### Segurança

Não esconder apenas os menus.

As permissões devem ser validadas no servidor.

Regra:

GESTOR_GARRO → tudo.

ATENDENTE → comercial.

EDITOR → somente entregáveis e informações autorizadas de suas atribuições.

---

## 7. CRM COMERCIAL

### Objetivo

Organizar os atendimentos sem integração com WhatsApp.

Todas as interações serão registradas manualmente.

### Kanban

Deve ser o principal ambiente da Atendente.

Etapas comerciais iniciais:

- Novo contato.
- Em atendimento.
- Proposta enviada.
- Em negociação.
- Aguardando cliente.
- Follow-up.
- Fechado.
- Perdido.

As etapas definitivas poderão ser ajustadas pela Gestora.

### Card do cliente

Informações:

- Nome.
- Serviço.
- Origem.
- Valor estimado.
- Último contato.
- Tempo sem atualização.
- Próxima ação.
- Prioridade.
- Status.

Não utilizar fotos dos contatos.

### Indicadores por coluna

- Quantidade de clientes.
- Valor total estimado.
- Quantidade atrasada.
- Quantidade com próxima ação.

### Indicadores gerais

- Leads ativos.
- Pipeline aberto.
- Valor em negociação.
- Vendas fechadas.
- Taxa de conversão.
- Ticket médio.
- Follow-ups pendentes.

Diferenciar valores estimados e valores fechados.

### Clientes sem valor

Permitir oportunidades sem preço.

Exibir:

"Valor não definido".

Não utilizar zero como valor fictício de proposta.

---

## 8. TIMERS DO CRM

O sistema precisa sinalizar claramente:

- Cliente aguardando resposta.
- Cliente que ainda não respondeu.
- Cliente sem atualização.
- Próxima ação vencida.
- Follow-up vencido.

Campos:

- lastContactAt.
- lastActivityAt.
- waitingOn.
- waitingSince.
- nextActionAt.

### Situações

Verde:

No prazo.

Amarelo:

Atenção.

Laranja:

Urgente.

Vermelho:

Atrasado.

Os limites deverão ser configuráveis.

### Regra essencial

Não existe sincronização com WhatsApp.

O sistema deve calcular os timers com base nos registros manuais.

Nunca indicar que o cliente respondeu sem a Atendente registrar essa interação.

---

## 9. FECHAMENTO COMERCIAL

Quando a Atendente marcar uma oportunidade como ganha:

Abrir modal obrigatório.

Campos:

- Cliente.
- Serviço contratado.
- Valor fechado.
- Data do trabalho.
- Prazo do cliente.
- Descrição do projeto.
- Entregáveis contratados.
- Referências.
- Observações.
- Links e documentos.

### Ação

Confirmar fechamento e gerar demanda.

O sistema deverá:

1. Atualizar oportunidade.
2. Criar venda.
3. Criar demanda.
4. Registrar histórico.
5. Criar compromissos necessários.
6. Disponibilizar demanda à Gestora.

Usar transação no PostgreSQL.

Evitar demandas duplicadas.

### Perda de oportunidade

Exigir motivo obrigatório.

Registrar:

- Motivo.
- Data.
- Responsável.
- Observação.

---

## 10. GESTÃO DE DEMANDAS

### Conceito

Uma venda poderá gerar uma demanda contendo vários entregáveis.

Exemplo:

Cliente: Carlos Eduardo.

Demanda: Casamento Carlos e Júlia.

Entregáveis:

- Trailer.
- Filme completo.
- Reels.
- Seleção de fotos.
- Álbum.

Cada entregável poderá possuir editor próprio.

### Fluxo

Nova demanda
↓
Planejamento
↓
Aguardando editor
↓
Em produção
↓
Enviado para revisão
↓
Em revisão Garro
↓
Aprovado ou Correção
↓
Pronto para entrega
↓
Entregue
↓
Concluído

Somente a Gestora pode aprovar a entrega.

### Painel da Gestora

Deverá exibir:

- Demandas por editor.
- Total de demandas ativas.
- Demandas atrasadas.
- Revisões pendentes.
- Correções solicitadas.
- Entregas próximas.
- Entregas ao cliente em risco.
- Distribuição de trabalho.

### Visão por editor

Exemplo:

Lucas Ferreira

- 7 entregáveis ativos.
- 2 próximos do prazo.
- 1 atrasado.
- 2 em revisão.

A Gestora poderá filtrar por editor.

### Delegação

Ao delegar:

- Atualizar responsável.
- Registrar histórico.
- Gerar notificação.
- Atualizar agenda.
- Disponibilizar trabalho no painel do editor.

---

## 11. CONTROLE DE PRAZOS

Existem três referências de prazo.

### Prazo do Editor

Data e horário em que o editor deverá entregar o material para revisão.

### Prazo de Revisão Garro

Data e horário previstos para a Gestora revisar e aprovar.

### Prazo do Cliente

Data limite acordada com o cliente.

### Campos

- editorDueAt.
- reviewDueAt.
- clientDueAt.
- editorDeliveredAt.
- managerApprovedAt.
- clientDeliveredAt.

### Sinalização

Exibir:

- Data.
- Hora.
- Tempo restante.
- Estado.
- Eventual atraso.
- Entrega real.

Exemplo:

Editor — 21/10 18h — faltam 1d 6h.

Revisão — 23/10 18h — faltam 3d 6h.

Cliente — 25/10 18h — faltam 5d 6h.

### Atrasos

Se o prazo vencer:

"Atrasado há 4h".

Se concluído:

"Entregue em 21/10 às 16h42".

### Risco de entrega

Considerar:

- Prazo do editor.
- Prazo de revisão.
- Prazo do cliente.
- Status atual.
- Correções pendentes.
- Margem de segurança.

Classificações:

- Baixo.
- Médio.
- Alto.
- Crítico.

---

## 12. AGENDA GLOBAL

A Gestora terá uma agenda única de compromissos.

Deve consolidar:

- Atendente.
- Gestora.
- Todos os editores.

### Eventos

- Follow-ups.
- Reuniões.
- Retorno de orçamento.
- Entrega do editor.
- Revisão Garro.
- Entrega ao cliente.
- Correções.
- Gravações.
- Eventos.
- Compromissos internos.

### Visualizações

- Dia.
- Semana.
- Mês.
- Lista.

### Filtros

- Responsável.
- Editor.
- Tipo.
- Status.
- Data.
- Prioridade.

### Agenda por perfil

Gestora:

Agenda Global.

Atendente:

Agenda Comercial.

Editor:

Agenda de suas demandas.

Alterações em prazos devem atualizar a agenda correspondente.

---

## 13. CONVERSA DA DEMANDA

Cada demanda terá comunicação contextual entre Gestora e Editor.

### Recursos

- Mensagens.
- Observações.
- Links.
- Arquivos.
- Histórico.
- Notificações.
- Data e horário.
- Identificação do remetente.

### Exemplo

Gestora:

"Priorizar as imagens externas."

Editor:

"Posso utilizar a versão mais recente da logo?"

Gestora:

"Sim, o arquivo está no Drive."

### Eventos

Registrar automaticamente:

- Editor atribuído.
- Prazo alterado.
- Produção iniciada.
- Material enviado.
- Correção solicitada.
- Aprovação.
- Conclusão.

Mensagem não deve alterar status automaticamente.

Somente ações explícitas devem alterar o workflow.

---

## 14. NOTIFICAÇÕES

O sistema terá central de notificações.

Tipos:

- Nova demanda.
- Nova atribuição.
- Nova mensagem.
- Prazo próximo.
- Prazo vencido.
- Correção solicitada.
- Material enviado para revisão.
- Material aprovado.
- Demanda concluída.

Cada notificação deve conter:

- Destinatário.
- Origem.
- Tipo.
- Título.
- Resumo.
- Data.
- Estado de leitura.
- Link para o registro.

Notificações in-app são suficientes para a primeira versão.

- Ler todos marca todas as não lidas visíveis da pessoa logada; Ler selecionadas marca só as escolhidas e fica oculto sem seleção.

---

## 15. ENTIDADES DO BANCO

Entidades principais:

### User

- id.
- name.
- email.
- passwordHash.
- role.
- active.
- createdAt.
- updatedAt.

### Customer

- id.
- name.
- phone.
- email.
- company.
- origin.
- notes.
- createdAt.

### Opportunity

- id.
- customerId.
- responsibleId.
- stage.
- outcome.
- estimatedValue.
- proposalValue.
- closedValue.
- waitingOn.
- waitingSince.
- lastContactAt.
- nextActionAt.

### CrmInteraction

- id.
- opportunityId.
- userId.
- channel.
- summary.
- occurredAt.

### Sale

- id.
- opportunityId.
- customerId.
- value.
- closedAt.

### Demand

- id.
- saleId.
- customerId.
- title.
- description.
- status.
- clientDueAt.
- createdAt.

### Deliverable

- id.
- demandId.
- editorId.
- title.
- description.
- status.
- editorDueAt.
- reviewDueAt.
- clientDueAt.
- editorDeliveredAt.
- managerApprovedAt.
- clientDeliveredAt.

### DemandMessage

- id.
- demandId.
- senderId.
- content.
- createdAt.

### DemandFile

- id.
- demandId.
- fileName.
- storagePath.
- uploadedBy.
- createdAt.

### ScheduleEvent

- id.
- userId.
- demandId.
- opportunityId.
- deliverableId.
- type.
- title.
- dueAt.
- completedAt.
- status.

### Notification

- id.
- userId.
- type.
- title.
- message.
- readAt.
- createdAt.

### Draft

- id.
- userId.
- entityType.
- entityId.
- content.
- updatedAt.

### AuditLog

- id.
- userId.
- action.
- entityType.
- entityId.
- details.
- createdAt.

A modelagem definitiva deve ser construída com Prisma e validada contra as regras de negócio.

---

## 16. INTERFACE E IDENTIDADE VISUAL

### Objetivo

Interface empresarial minimalista, moderna e objetiva.

A aparência deverá seguir os layouts aprovados da Garro.

O símbolo oficial é o G circular com diafragma de câmera enviado pelo usuário. Na interface, utilizar a adaptação terracota com espaços transparentes em `public/images/garro-symbol-terracotta.webp`, pelos componentes compartilhados `GarroMark` e `GarroBrand`. A escrita Garro Produtora existente é preservada. Consulte `docs/IDENTIDADE_VISUAL.md`.

Características:

- Fundo claro.
- Tonalidades terracota.
- Marrom suave.
- Informações compactas.
- Tipografia séria.
- Poucas bordas.
- Sombras discretas.
- Sem fotografias.
- Sem elementos exagerados.

### Fonte

IBM Plex Sans.

Pesos:

- 400.
- 500.
- 600.

### Paleta

Background principal:

#F5EFE8

Background secundário:

#F0E5DB

Superfície principal:

#FFFDF9

Superfície auxiliar:

#FAF5EF

Bordas:

#E4D7CC

Texto principal:

#2E211B

Texto secundário:

#7A6B62

Terracota:

#A65F45

Terracota escuro:

#7E432F

Marrom:

#4B3025

Dourado:

#B7834B

Verde:

#5F8668

Amarelo:

#C4882F

Vermelho:

#C35D4C

### Sidebar

Estado padrão:

Recolhida.

Largura aproximada:

60px.

Ao passar mouse:

Expandir em overlay.

Largura aproximada:

220px.

Não deslocar o Kanban.

No celular utilizar drawer.

### Kanban

- Ocupar largura disponível.
- Cards compactos.
- Informações prioritárias.
- Valores visíveis.
- Timer.
- Prioridade.
- Próxima ação.
- Colunas com totais.

### Painel lateral

Exibir detalhes do cliente.

O painel poderá ser fechado.

Quando fechado, o Kanban deve ocupar o espaço liberado.

### Formulários

Novo e Editar devem abrir modal centralizado.

O fundo ficará desfocado.

Regras:

1. Não fechar ao clicar fora.
2. Não descartar alterações.
3. Salvar rascunhos automaticamente.
4. Permitir salvar rascunho manualmente.
5. Restaurar rascunhos.
6. Validar antes de salvar.
7. Permitir fechar de forma explícita.
8. Controlar foco e navegação por teclado.

### Responsividade

Desktop:

Kanban amplo.

Tablet:

Reorganização adaptativa.

Mobile:

Navegação compacta, painéis em drawer e formulários adaptados.

---

## 17. PERFORMANCE

Priorizar:

- Carregamento rápido.
- Componentização.
- Consultas eficientes.
- Paginação.
- Índices no banco.
- Cache seletivo.
- Revalidação de dados.
- Baixo consumo de recursos.
- Renderização controlada.

### Timers

Calcular tempo restante usando datas já carregadas.

Não realizar requisições ao servidor a cada segundo.

Atualização visual sugerida:

A cada minuto.

### Pontos críticos

- Kanban.
- Valores por coluna.
- Agenda Global.
- Timers.
- Histórico.
- Controle por editor.
- Notificações.
- Consultas de relatórios.

---

## 18. SEGURANÇA

### Autenticação

- Login individual.
- Sem autocadastro.
- Senhas com hash seguro.
- Cookies HTTP-only.
- HTTPS.
- Proteção contra tentativas excessivas.
- Sessões com expiração.

### Autorização

- RBAC.
- Verificação no backend.
- Verificação por atribuição de editor.
- Negar acesso por padrão.
- Não confiar em dados enviados pelo frontend.

### Infraestrutura

- PostgreSQL privado.
- Next.js sem porta pública direta.
- Caddy como entrada HTTPS.
- Segredos no .env privado.
- SSH protegido.
- Backups externos.
- Auditoria.

### Dados comerciais

Editor não poderá consultar valores de venda ou dados comerciais que não sejam necessários à produção.

### Auditoria

Registrar:

- Login e operações relevantes.
- Alterações em usuários.
- Fechamento de venda.
- Perda de oportunidade.
- Criação de demanda.
- Delegação.
- Mudanças de prazo.
- Mudanças de status.
- Revisões.
- Correções.
- Aprovações.
- Entregas.

---

## 19. DECISÕES DEFINITIVAS

1. Sistema único.
2. CRM e produção integrados.
3. Sem WhatsApp na V1.
4. PostgreSQL.
5. Prisma.
6. Next.js.
7. TypeScript.
8. VPS própria.
9. Docker Compose.
10. Caddy.
11. Sem Coolify.
12. HTTPS automático.
13. Deploy inicialmente manual.
14. Gestora com acesso total.
15. Atendente somente comercial.
16. Editores somente trabalhos atribuídos.
17. Venda gera demanda.
18. Demanda pode gerar vários entregáveis.
19. Gestora delega editores.
20. Três tipos de prazo.
21. Contagem regressiva.
22. Agenda Global.
23. Conversa interna por demanda.
24. Notificações.
25. Kanban com valores.
26. Timers de atendimento.
27. Interface terracota clara.
28. Fonte IBM Plex Sans.
29. Sidebar em overlay.
30. Modais com rascunho persistente.
31. Dados comerciais protegidos.
32. Banco privado e backups obrigatórios.

---

## 20. PENDÊNCIAS

URL pública definida: `https://cadete.tech/gestaogarro`. O site já existente em `https://cadete.tech` permanece na raiz.

Acesso operacional verificado em 14/10/2026: VPS `2.25.229.131`, usuário SSH `root`, chave existente do operador, aplicação em `/opt/garro` e branch `main`. Segredos permanecem no `.env` privado da VPS; referências de acesso em `docs/ACESSOS_E_CREDENCIAIS.md`.

Destino dos backups definido em 15/10/2026 e ajustado em 28/10/2026: todo dia, `scripts/backup-daily.sh` grava um arquivo do banco e um da aplicação em `/var/backups/garro/AAAA-MM/banco` e `aplicacao`, e copia os dois para a pasta do Google Drive `1cCGKVRnIpwMu7m_0-WOcJmUozQo367bW`. Cada dia é um arquivo diferente. O token do rclone permanece só na VPS. O dump avulso antes de migration continua em `/var/backups/garro`, com os 14 mais novos.

Ainda devem ser definidos:

- Distribuição Linux.
- CPU, RAM e armazenamento.
- Credenciais iniciais.
- Editores iniciais.
- Storage.
- Regras finais de timer.
- Critérios de risco.
- Política de notificações.
- Critérios finais de aprovação.
- Estratégia de rollback.
- Ambiente de homologação.

Não inventar configurações críticas.

Solicitar informações quando forem necessárias.

---

## 21. INSTRUÇÕES PARA O CODEX

Antes de desenvolver:

1. Ler integralmente PROJECT_CONTEXT.md.
2. Ler MASTER_PROMPT.md, se existir.
3. Inspecionar o repositório.
4. Identificar o que já está implementado.
5. Verificar dependências.
6. Verificar Prisma.
7. Verificar migrations.
8. Verificar Docker e infraestrutura.
9. Identificar arquivos antigos relacionados ao Coolify.
10. Planejar a adequação para Docker Compose e Caddy.

### Implementação

- Não recriar estruturas funcionais.
- Não apagar arquivos sem necessidade.
- Não modificar dados existentes sem autorização.
- Não executar deploy remoto sem autorização.
- Não adicionar WhatsApp.
- Não adicionar chatbots.
- Não criar funcionalidades fora do escopo.
- Não misturar regras de CRM e produção.
- Não duplicar cadastros.
- Respeitar permissões.
- Implementar operações críticas com transações.
- Criar testes.

### Infraestrutura obrigatória

Gerar:

- Dockerfile.
- compose.yaml.
- Caddyfile.
- .env.example.
- Script de deploy.
- Script de backup.
- Procedimento de restore.
- Documentação de deploy.
- Documentação de rollback.

### Qualidade

Executar:

- Typecheck.
- Lint.
- Testes.
- Build.
- Validações de segurança.
- Verificação de responsividade.

### Entrega

Ao terminar cada etapa, informar:

1. Funcionalidades implementadas.
2. Arquivos criados.
3. Arquivos alterados.
4. Testes realizados.
5. Resultado do build.
6. Pendências.
7. Próxima etapa recomendada.

Não afirmar que o sistema está pronto para produção sem validação real.

---

## 22. ÚLTIMA REVISÃO

Data: 14/10/2026.

Projeto: Sistema Integrado Garro Produtora.

Arquitetura de implantação definida:

Next.js + PostgreSQL + Prisma + Docker Compose + Caddy.

Coolify removido do escopo.

Status: contexto atualizado para desenvolvimento e implantação futura na VPS.
