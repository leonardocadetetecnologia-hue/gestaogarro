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

## Conferência

166 testes passaram e 1 ficou de fora de propósito. O typecheck passou. O deploy aplica as duas colunas novas com `prisma migrate deploy`, sem seed.
