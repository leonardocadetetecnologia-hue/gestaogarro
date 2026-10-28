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

## Conferência

166 testes passaram e 1 ficou de fora de propósito. O typecheck passou. O deploy aplica as duas colunas novas com `prisma migrate deploy`, sem seed.
