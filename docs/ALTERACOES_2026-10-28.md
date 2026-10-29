# O que muda nesta publicação

A versão no ar ainda é a anterior a 27/10/2026 à noite. Esta publicação junta dois commits: `7662265` e `567895f`. As contas `malu.atendente` e `ana.atendente` já foram ajustadas no banco e não dependem deste deploy.

## Atribuição de vários entregáveis

O que muda: na demanda, à direita de Briefing, a Gestora marca vários entregáveis do mesmo projeto e define um editor e um prazo para todos. Cada item continua podendo ser alterado depois.

Como: o botão abre um formulário com a lista do projeto. A gravação tranca a demanda, confere se cada entregável pertence a ela e se o editor está ativo, e grava tudo na mesma transação. Sai um aviso só, não um por item.

## Prazo com dia obrigatório e horário opcional

O que muda: no prazo de edição, só o dia é obrigatório. O horário pode ficar vazio. O prazo de revisão segue a mesma regra e continua opcional. Se alguém preenche só o horário da revisão, nada é gravado e a tela pede o dia.

Como: a data vai no fuso de Brasília. Sem horário, o prazo vale até 23:59 daquele dia. Na tela, 23:59 aparece como horário em branco, para não parecer que alguém escolheu esse minuto.

## Filtro de etapa em Meus trabalhos

O que muda: em Trabalhos atribuídos dá para filtrar A iniciar, Em edição, Em revisão, Correção, Aprovado, Atrasado e Concluído, junto com o filtro de cliente.

Como: Atrasado é prazo de edição vencido e ainda não aprovado. Aprovado e Concluído mostram o mesmo conjunto: status Aprovado. Os números do topo continuam do total, sem o filtro.

## Filtro de serviço no Banco de dados

O que muda: a Gestora filtra o arquivo de contatos por Evento, Ensaio, Captação ou Plano EXPANSÃO.

Como: o filtro procura essas palavras no serviço do contato. Não é um cadastro novo de serviços. "Cobertura em tempo real" não entra em Evento. Workshop não entra em nenhum dos quatro.

## Barra de status dos entregáveis

O que muda: no cartão do kanban de produção e na lista de demandas, a proporção de cada etapa aparece sem abrir o projeto.

Como: a barra só desenha as etapas que têm quantidade. As cores são a iniciar, em edição, em revisão, correção e aprovado. Ela fica dentro do cartão como texto interno, para não quebrar o clique.

## Entregável recolhido

O que muda: em Entregáveis e atribuições aparece só o título e o status. O resto abre para baixo ao clicar no título.

Como: prazo, script, atribuição e os botões de iniciar, enviar e aprovar continuam os mesmos. Eles só ficam ocultos até o clique.

## HD e Drive

O que muda: em Referências há dois campos, HD e Drive. A Gestora grava. Quem abre a demanda vê e pode copiar. Só a Gestora edita.

Como: duas colunas novas na demanda, `hd` e `driveUrl`. Um endereço colado sem `https://`, como `drive.google.com/...`, é salvo com o protocolo. Um texto que não é endereço é recusado. O link de referência que já existia permanece.

## Aniversário

O que muda: data de nascimento no lead e na edição do cliente. O próximo aniversário entra na agenda às 9h de Brasília. Na Visão geral, a Gestora vê os próximos 30 dias, só de clientes ativos.

Como: a data fica em `Customer.birthDate`. 29 de fevereiro cai em 28 de fevereiro nos anos comuns. Data futura é recusada. O editor não recebe o lembrete.

## Kanban da atendente

Medido em 27/10/2026 no banco de produção: a atendente com mais cards tinha 28 oportunidades. A consulta dela levou cerca de 2 ms, lida da memória. O quadro não é o gargalo nesse volume. O painel recarrega o estado inteiro a cada abertura e de novo a cada 30 segundos.

## Visão estratégica do Kanban

O que muda: no Kanban, só a Gestora alterna entre Operação, Valores e Categorias. Cada coluna mostra o dinheiro daquela etapa.

Como: Valores separa estimado, proposta, fechado e sem valor. Categorias separa Evento, Ensaio, Captação, Plano EXPANSÃO e o restante. O valor contado é o fechado; se não houver, a proposta; se não houver, o estimado. Os cards continuam na coluna.

## Entregue sai do quadro e fica no histórico

O que muda: a coluna Entregue mostra só as entregas do mês escolhido no topo do quadro. O mês atual já vem marcado. Uma entrega de outro mês deixa de aparecer ali. Ela não é apagada. A Gestora abre Entregues, vê a lista por mês e pode filtrar cliente ou ano. Um clique exporta o PDF daquela entrega. Várias marcações saem num extrato só, com o logo da Garro, o cliente, o que foi feito e a data. Quem vê o quadro usa o filtro de mês. O botão e o PDF ficam só com a Gestora.

Como: a data da entrega é a última marcação ao cliente, no horário de Brasília. Sem essa data, vale a criação da demanda. O quadro filtra a coluna Entregue por esse mês. O histórico lê as demandas com status Entregue. O PDF reutiliza o extrato e aceita uma lista de demandas.

## Tipo da demanda em uma linha, e editável depois

O que muda: ao criar a demanda, Foto, Vídeo e Foto e vídeo ficam na mesma linha. Se a escolha sair errada, a Gestora corrige em Editar. A marcação aparece na linha do cartão, junto da quantidade de entregáveis e do serviço.

Como: a gravação continua no campo que já existia. Demanda antiga, sem tipo, pode receber um ao ser editada. Sem uma nova escolha, o tipo que já estava gravado permanece.

## Agenda mais compacta

O que muda: a agenda mostra mais compromissos na mesma página, com quadros e tipos menores, no desenho de uma agenda de verdade. O zoom é um controle curto ao lado de Dia, Semana, Mês e Lista. O compromisso vencido ganha a tag Atrasado. Faltando até seis horas, a tag é Próximo do atraso. As duas ficam no terracota da Garro. Horário, tipo, cliente, origem e responsável continuam no cartão.

Como: a densidade padrão foi reduzida e o zoom só multiplica esse tamanho. O mês lista todos os compromissos do dia, sem cortar em três. O prazo é o horário do próprio compromisso, em Brasília.

## Relatório com prévia

O que muda: em Relatórios, Gerar PDF abre uma janela. A Gestora escolhe as entregas, edita o texto, tira o que não quer, informa a data ou deixa sem data e, se quiser, escreve uma observação. Pode ser um relatório só ou um para cada entrega. A prévia aparece antes do PDF. O registro da demanda não muda.

Como: a janela parte das entregas já filtradas. Cada campo tem uma caixa. Sem data tira a data só do documento. O PDF imprime a prévia, com uma página para cada entrega quando essa opção está marcada.

## Kanban na largura da tela

O que muda: no CRM e na produção, as etapas ocupam a largura toda, juntas. Não sobra faixa vazia e nenhuma coluna sai da tela. O texto quebra dentro do cartão. A coluna fica mais alta e mostra mais cartões empilhados. A rolagem é a da página inteira, não uma barra curta dentro da coluna.

Como: cada quadro recebe o número real de etapas e divide a área em partes iguais. A largura fixa das colunas saiu. O título e os números de cima ficam mais baixos para sobrar altura aos cartões. Se a etapa tem muitos cartões, a página desce até o último. O nome da etapa permanece visível enquanto se rola. Com o detalhe do lead aberto, as etapas dividem o que resta. A pesquisa e os filtros do quadro ficam na mesma linha.

## Sino com janela

O que muda: o sino abre uma janela com as notificações novas, sem ir para a página inteira. Dá para limpar uma ou limpar todas. Enquanto houver aviso, o sino se move e o número pulsa. A página Notificações continua com o histórico e a leitura em lote.

Como: limpar marca o aviso como lido, o mesmo registro de antes. A janela mostra só as não lidas da pessoa logada.

## Relatório só com nome, descrição e data

O que muda: no ajuste do PDF, os campos para preencher são o nome do cliente, a descrição e a data de entrega. O nome já entra com o nome inicial do cliente.

Como: o texto do item, o período e a numeração não aparecem para editar. A prévia mostra esse nome, a data e a descrição. O registro da demanda não muda.

## Observação no relatório, sem item vazio

O campo de observação saiu. No lugar ficam informação, data e descrição. Item sem texto continua fora do documento.

## Pizzas na visão geral

O que muda: a Visão geral da Gestora mostra duas pizzas coloridas, uma das demandas por etapa e outra do comercial por etapa. Etapa sem item não vira fatia.

Como: cada fatia usa uma cor própria e a legenda traz o nome e a quantidade.

## Exportar seleção com o mesmo ajuste

O que muda: em Entregues, Exportar seleção e o clique numa entrega abrem a mesma janela de Relatórios. Dá para editar, ver a prévia e gerar o PDF. O documento não abre direto.

Como: a seleção consulta o extrato dessas demandas e entrega a lista para a janela que já existia.

## Função da atendente

O que muda: em Demandas, a Gestora atribui uma função isolada a uma atendente, com data limite. O prazo aparece na agenda como compromisso. A atendente conclui. Só a Gestora exclui o que criou. Na agenda, a atendente cria compromisso pessoal da semana ou do mês e só ela exclui esse.

Como: a função é um compromisso novo, sem vínculo com a demanda de produção. O aviso chega para a atendente na hora. O compromisso pessoal não avisa ninguém.

## Backup diário em arquivos diferentes

O que muda: todo dia, às 03:15 de Brasília, o sistema grava um arquivo do banco e um da aplicação. O de hoje não substitui o de ontem. Os dois sobem para a pasta de backups do Google Drive, separados por mês e por tipo.

Como: o banco sai inteiro, no formato do PostgreSQL. A aplicação sai compactada, com o código e a configuração da VPS, sem dependências nem a pasta de build. No disco e no Drive o caminho é `AAAA-MM/banco/AAAA-MM-DD.dump` e `AAAA-MM/aplicacao/AAAA-MM-DD.tar.gz`. O dump feito antes de uma migration continua separado e ainda guarda só os 14 mais novos.

## Conferência

218 testes passaram e 1 ficou de fora de propósito. O typecheck passou. Não há migration nova. O deploy não roda seed.
