"""Generate Garro training PDFs from verified interface instructions and real captures.

Place screenshots and manifest.json under output/manual-captures. Manifest keys match
the capture keys below. No synthetic images or production fixture data are generated.
"""
from pathlib import Path
from datetime import datetime
import json
import sys
from xml.sax.saxutils import escape
from reportlab.pdfgen.canvas import Canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output/pdf'
CAPTURES = ROOT / 'output/manual-captures'
URL = 'https://garroprodutora.com.br/gestaogarro/login'

# Heading, purpose, exact procedure, expected result, capture key.
MANUALS = {
 'atendente': ('Atendente', [
  ('Entrar e reconhecer o CRM', 'O CRM organiza os contatos, as negociações e os retornos comerciais.', [
   'Acesse '+URL+'. Selecione Atendente em Tipo de acesso.',
   'Preencha Usuário e Senha com o acesso fornecido pela Gestora. Clique em Entrar.',
   'Abra CRM / Kanban no menu lateral. No celular, toque no botão de menu para abrir as opções.',
   'Use Buscar cliente ou serviço e o filtro de origem para localizar o atendimento. Alterne Kanban e Lista conforme a necessidade.',
   'Clique no card para abrir o painel lateral. Resumo reúne dados, próxima ação e etapa. Histórico mostra os registros daquele atendimento.'
  ], 'Cada card representa uma oportunidade comercial vinculada a um contato. O valor exibido é comercial; não significa que o cliente já pagou.', 'atendente-crm'),
  ('Cadastrar lead, cliente e nova oportunidade', 'Lead é quem ainda está em negociação. Cliente já contratou. Oportunidade é uma negociação de um serviço.', [
   'Antes de cadastrar, abra Clientes e leads. Selecione Todos e pesquise por nome, telefone ou e-mail para evitar duplicidade.',
   'Para um contato novo em negociação, clique em Novo lead. Informe Nome do contato, Telefone, E-mail, Origem, Serviço de interesse, Empresa e Observações quando disponíveis.',
   'Selecione o serviço de interesse da lista. Informe Valor estimado apenas quando houver uma estimativa. Clique em Salvar cadastro.',
   'Para uma pessoa que já contratou, use Novo cliente. Esse cadastro não cria automaticamente uma negociação no Kanban.',
   'Se o contato já existe e quer outro serviço, clique em Nova oportunidade na linha do cadastro. Preencha Serviço de interesse e clique em Criar oportunidade no CRM.',
   'Para corrigir nome ou contato, use Editar em Clientes e leads ou Editar contato no painel lateral.'
  ], 'Novo lead cria um cadastro e uma oportunidade em Lead. Salvar rascunho e sair apenas preserva a digitação naquele navegador; conclua com Salvar cadastro.', 'atendente-novo-lead'),
  ('Registrar conversa e movimentar o Kanban', 'O registro manual informa o que foi combinado, quem deve responder e quando será o próximo retorno.', [
   'Abra o card e clique em Registrar contato. Em Resumo do contato, escreva o que foi conversado e os combinados.',
   'Em Quem precisa responder?, selecione Cliente, Atendente ou Ninguém. Preencha Próxima ação com uma ação objetiva, como enviar proposta.',
   'Informe Data da próxima ação quando houver compromisso. Clique em Registrar contato para salvar.',
   'Para mudar a etapa, use Etapa comercial no painel lateral ou arraste o card para a coluna correspondente.',
   'Use Lead para entrada; Follow-up para acompanhamento; Reunião agendada e Reunião realizada conforme o ocorrido. Sem interesse e Bolo ajudam a organizar a situação comercial.',
   'Para encerrar uma negociação perdida, selecione Fechado sem sucesso, escreva o motivo e clique em Confirmar encerramento.'
  ], 'O histórico e os indicadores passam a considerar o registro salvo. As conversas do WhatsApp não entram automaticamente. Agendar a próxima ação cria um compromisso comercial.', 'atendente-contato'),
  ('Fechar com sucesso e enviar para produção', 'Esta ação entrega à Gestora o projeto contratado, com prazo, briefing e entregáveis definidos.', [
   'Após confirmar a contratação com o cliente, mova a oportunidade para Fechado com sucesso.',
   'No card ou no painel lateral, clique em Enviar para produção. Apenas mudar de coluna não cria a demanda.',
   'Preencha Serviço contratado e Valor fechado. Informe Prazo do cliente com data e horário de Brasília.',
   'Em Briefing e detalhes da produção, descreva o que foi contratado, formato, referências importantes e condições de entrega.',
   'Em Entregáveis, escreva um item por linha. Exemplo: Vídeo principal, Reel vertical e Seleção de fotos em linhas separadas.',
   'Confira os dados e clique em Confirmar envio para produção. Aguarde a confirmação. Se aparecer um erro, corrija os dados indicados antes de tentar novamente.'
  ], 'O card mostra Enviado para produção. A demanda aparece para a Gestora, que escolhe os responsáveis. A atendente permanece no comercial e não acessa a execução dos editores.', 'atendente-envio'),
  ('Agenda, retornos e rotina diária', 'A agenda mostra os compromissos comerciais; Follow-ups concentra próximas ações de oportunidades ainda abertas.', [
   'Abra Follow-ups e confira as Próximas ações. Use Registrar contato para atualizar o atendimento após cada retorno.',
   'Em Agenda Comercial, escolha Dia, Semana, Mês ou Lista. Hoje retorna à data atual; as setas mudam o período.',
   'Pesquise o compromisso e filtre o tipo. Clique no evento para ver data, responsável, cliente, origem e contexto. Use o botão de origem para voltar ao atendimento quando disponível.',
   'Marque Exibir concluídos para consultar compromissos já encerrados ou cancelados. A lista facilita a leitura no celular.',
   'Em Histórico, consulte as interações comerciais registradas. Em Relatórios, acompanhe oportunidades, pipeline, conversões e origens dos contatos.',
   'No início do dia, revise atrasos e retornos. Após cada conversa, registre o contato. Ao final, confira as próximas ações e os fechamentos enviados. Para sair, use Sair no menu.'
  ], 'Atrasos e tempos sem retorno são alertas para acompanhamento. A Agenda Comercial apresenta os compromissos permitidos para a atendente; a visão de toda a equipe fica com a Gestora.', 'atendente-agenda'),
 ]),
 'editor': ('Editor', [
  ('Entrar e localizar seus trabalhos', 'O editor executa os entregáveis atribuídos pela Gestora e acompanha os próprios prazos.', [
   'Acesse '+URL+'. Selecione Editor, informe o usuário de acesso e a senha fornecidos pela Gestora e clique em Entrar.',
   'Abra Minhas Demandas ou Meus trabalhos. A lista Trabalhos atribuídos mostra título do entregável, demanda, status e prazo.',
   'Clique no trabalho para abrir a demanda. Confira nome do projeto, cliente, prazo do editor e entrega ao cliente.',
   'Na aba Visão geral, leia Briefing e abra a pasta de Referências quando houver um link.',
   'Em Entregáveis e atribuições, confira o item que você deve executar. Uma demanda pode conter vários entregáveis com responsáveis diferentes.'
  ], 'Você recebe as atribuições do seu perfil. Se a lista estiver vazia ou o trabalho não aparecer, peça à Gestora para conferir responsável, ativação e prazos.', 'editor-trabalhos'),
  ('Consultar Script e baixar anexos', 'O Script reúne roteiro e informações adicionais específicas de cada entregável.', [
   'Na demanda, localize o entregável desejado em Entregáveis e atribuições.',
   'Clique em Script. A caixa fica oculta até você abrir o botão, mesmo quando há texto salvo.',
   'Leia as orientações antes de iniciar. A Gestora pode definir até 10.000 caracteres por entregável.',
   'Em Anexos do script, clique no nome do arquivo ou em Baixar anexo. Os formatos disponíveis são TXT, DOC e PDF.',
   'Abra o arquivo baixado no aplicativo apropriado. O acesso ao anexo acompanha a atribuição do entregável.',
   'Se houver dúvida, abra a Conversa da demanda e informe o título do entregável. O editor consulta o Script; a Gestora altera texto e anexos.'
  ], 'Clicar novamente em Script oculta a área. Os documentos complementam o roteiro daquele entregável; não representam o arquivo final de entrega do projeto.', 'editor-script'),
  ('Iniciar edição, enviar para revisão e corrigir', 'Os botões de status informam em que ponto da execução o entregável está.', [
   'Quando o entregável estiver A iniciar, clique em Iniciar edição. O status passa para Em edição.',
   'Execute o trabalho de acordo com briefing, referências e Script. Use Conversa ou Abrir conversa para registrar dúvidas e links do material.',
   'Para enviar uma mensagem, preencha Escreva uma observação para a demanda e clique em Enviar. Cite o entregável e cole o link do material quando necessário.',
   'Com o material pronto e acessível para a Gestora, clique em Enviar para revisão. O entregável passa para Em revisão.',
   'Se voltar como Correção, leia as orientações na conversa, faça os ajustes e clique novamente em Enviar para revisão.',
   'Quando a Gestora aprovar, o status aparece como Aprovado. A aprovação e o registro de entrega ao cliente são feitos pela Gestora.'
  ], 'Enviar para revisão muda o status e avisa a Gestora. Esse botão não envia sozinho um arquivo final ao cliente. Deixe o material acessível e registre o contexto na conversa.', 'editor-execucao'),
  ('Minha Agenda, notificações e rotina', 'A agenda e os avisos ajudam a priorizar as entregas que dependem de você.', [
   'Abra Minha Agenda. Escolha Dia, Semana, Mês ou Lista para visualizar os compromissos.',
   'Use pesquisa e filtro de tipo. Clique no compromisso para ver horário de Brasília, responsável, cliente, origem e contexto.',
   'Use o botão de origem do compromisso para abrir a demanda quando disponível. A opção Exibir concluídos recupera compromissos encerrados ou cancelados.',
   'Abra Notificações para conferir novas atribuições, mensagens, pedidos de correção e aprovações. Clique no aviso para abrir a demanda vinculada.',
   'Antes de começar o dia, revise prazos e correções. Durante a execução, mantenha o status e a conversa atualizados.',
   'Se precisar alterar responsável ou prazo, peça à Gestora. Confira seus dados em Meu perfil e encerre o acesso por Sair.'
  ], 'Minha Agenda contém os compromissos permitidos ao editor. Dados comerciais, valores de venda, CRM e Agenda Global ficam fora desse perfil.', 'editor-agenda'),
 ]),
 'gestor': ('Gestora', [
  ('Acessar e acompanhar a operação', 'A Gestora acompanha o comercial, distribui a produção, revisa os materiais e registra a entrega ao cliente.', [
   'Acesse '+URL+'. Selecione Gestor, informe Usuário e Senha e clique em Entrar.',
   'Abra Visão geral. Confira Pipeline comercial, Demandas ativas, Prazos nas próximas 24h e Editores atrasados.',
   'Em Agenda de prioridades, abra os compromissos relevantes. Em Carga por editor, confira os entregáveis ativos e os atrasados de cada responsável.',
   'Abra Demandas para acompanhar o Kanban de produção. Use Buscar demanda e Todos os editores para localizar e filtrar o trabalho.',
   'Clique no card para abrir a demanda. Alterne Kanban e Lista conforme a necessidade. O andamento do projeto acompanha os entregáveis e as ações realizadas.'
  ], 'Demanda é o projeto do cliente. Entregável é cada item a produzir dentro dele, com seu próprio responsável, roteiro e prazo.', 'gestor-visao'),
  ('Supervisionar o CRM e receber o fechamento', 'O CRM organiza o atendimento; o envio explícito transforma o fechamento em trabalho de produção.', [
   'Abra CRM. Pesquise o cliente, abra o card e consulte Resumo e Histórico para entender o atendimento.',
   'Para um contato novo, use Novo lead. Para revisar cadastros, abra Clientes e leads, selecione Clientes, Leads ou Todos e use Editar.',
   'Para uma nova negociação de um contato existente, use Nova oportunidade na linha do cadastro e informe o serviço.',
   'Registre contatos e próximas ações pelo botão Registrar contato. Atualize a Etapa comercial conforme o que ocorreu.',
   'Após a contratação, mova para Fechado com sucesso e clique em Enviar para produção. Preencha serviço, valor fechado, prazo do cliente, briefing e entregáveis, um por linha.',
   'Clique em Confirmar envio para produção. Em seguida, abra Demandas e localize o projeto para planejar a execução.'
  ], 'Fechado com sucesso promove o contato para cliente. A demanda só nasce ao confirmar o envio para produção. Fechado sem sucesso exige um motivo e não cria produção.', 'gestor-crm'),
  ('Criar uma demanda diretamente', 'Nova demanda permite iniciar produção para um cliente sem criar uma negociação ou venda fictícia.', [
   'Abra Demandas e clique em Nova demanda.',
   'Em Cliente, escolha um cliente existente. Se ele ainda não estiver cadastrado como cliente, selecione + Cadastrar novo cliente e preencha nome e contatos disponíveis.',
   'Preencha Título da demanda com um nome reconhecível, como Ensaio de reposicionamento - Cliente.',
   'Descreva o escopo em Briefing. Informe Prazo do cliente com data e horário de Brasília.',
   'Em Entregáveis, escreva um item por linha, separando o que precisará ser atribuído ou revisado individualmente.',
   'Clique em Criar demanda e aguarde a confirmação. Depois, abra o projeto para atribuir os responsáveis. Para leads em negociação, use o fechamento pelo CRM.'
  ], 'A demanda fica vinculada ao cliente e contém os entregáveis informados. A criação direta não registra valor de venda nem adiciona uma oportunidade ao CRM.', 'gestor-nova-demanda'),
  ('Atribuir responsáveis, prazos e Script', 'Cada entregável precisa de um responsável e de orientações claras para a execução.', [
   'Abra a demanda e, em Visão geral, localize Entregáveis e atribuições.',
   'No entregável, selecione Responsável pela edição. Escolha um editor ativo ou a sua própria opção identificada como Gestora.',
   'Preencha Prazo da edição (Brasília). Se houver, defina Prazo de revisão (Brasília). Clique em Salvar atribuição e prazos. Repita em cada entregável.',
   'Clique em Script para abrir a caixa. Escreva o roteiro ou as instruções específicas, até 10.000 caracteres, e clique em Salvar script.',
   'Para incluir um documento, em Anexos do script escolha um TXT, DOC ou PDF de até 10 MB e clique em Anexar arquivo. Aguarde Anexo salvo no script. Texto e anexo são salvos separadamente.',
   'Para executar você mesma, abra Meus trabalhos. Use Iniciar minha edição e Enviar minha edição para revisão no entregável atribuído a você.'
  ], 'A atribuição disponibiliza o trabalho ao responsável e atualiza os compromissos. O editor consulta texto e anexos do Script. Se houver aviso de outra versão do texto, confira antes de substituir.', 'gestor-atribuicao'),
  ('Revisar, pedir correção e registrar entrega', 'A revisão confirma a qualidade de cada item antes de encerrar a entrega do projeto.', [
   'Abra a demanda cujo entregável está Em revisão. Leia o Script, confira o material e os links registrados na conversa.',
   'Para conversar sobre o projeto, abra a aba Conversa ou clique em Abrir conversa. Escreva uma observação objetiva, cite o entregável e clique em Enviar.',
   'Se forem necessários ajustes, registre o que deve mudar na conversa e clique em Solicitar correção naquele entregável.',
   'O editor executa os ajustes e usa Enviar para revisão novamente. Confira a nova versão.',
   'Quando o item estiver correto, clique em Aprovar. Repita a conferência em todos os entregáveis.',
   'Depois que todos estiverem Aprovados e o material tiver sido efetivamente entregue ao cliente, clique em Registrar entrega ao cliente no cabeçalho da demanda.'
  ], 'A aprovação é individual. Registrar entrega ao cliente aparece quando todos os entregáveis estão aprovados e registra o projeto como Entregue. O botão não envia arquivos ao cliente automaticamente.', 'gestor-revisao'),
  ('Cadastrar e editar editores', 'A área de equipe reúne carga de trabalho e acesso à administração dos usuários.', [
   'Abra Editores para consultar a Equipe de produção. Confira status ativo, entregáveis ativos, itens em edição, atrasos e próximas entregas.',
   'Para cadastrar um editor, clique em Gerenciar usuários. Em Novo editor, informe Nome, E-mail e Senha inicial com pelo menos oito caracteres. Clique em Criar editor.',
   'Para alterar um cadastro, clique em Editar editor no card ou abra essa opção na página Usuários. Atualize Nome e E-mail e clique em Salvar editor.',
   'Para bloquear ou liberar o acesso, use Desativar ou Ativar na conta correspondente.',
   'Quando necessário, preencha Nova senha e clique em Redefinir. Comunique o acesso ao editor pelo canal adotado pela equipe.',
   'Para atribuir novos trabalhos, volte à demanda e escolha o editor ativo em Responsável pela edição.'
  ], 'A Gestora pode executar trabalhos sem criar uma segunda conta de editor. Os editores criados pelo formulário atual usam o e-mail cadastrado como identificador de acesso enquanto não tiverem usuário próprio definido.', 'gestor-editores'),
  ('Agenda Global, relatórios e rotina de gestão', 'A Agenda Global centraliza os compromissos comerciais e de produção com a identificação de quem é responsável.', [
   'Abra Agenda Global. Escolha Dia, Semana, Mês ou Lista. Use Hoje e as setas para navegar entre períodos.',
   'Pesquise compromisso, cliente ou responsável. Filtre o tipo e selecione um nome em Todos os responsáveis para acompanhar alguém da equipe.',
   'Clique no compromisso. Confira Data e horário de Brasília, Responsável, Cliente, Origem e Contexto. A identificação informa se é Gestora, Atendente ou Editor, com o nome.',
   'Use o botão de origem para abrir a oportunidade ou demanda vinculada. Para alterar um prazo, ajuste o registro de origem correspondente.',
   'Abra Relatórios para acompanhar oportunidades, pipeline, conversão, etapas comerciais e produção por status. Em Notificações, clique nos avisos para abrir os projetos.',
   'Diariamente, confira atrasos, distribua demandas novas, revise materiais pendentes e acompanhe entregas ao cliente. Ao encerrar, use Sair.'
  ], 'A Agenda Global é exclusiva da Gestora. Atendente e Editor têm agendas limitadas ao próprio acesso. Pipeline é valor potencial em aberto; não equivale a recebimento financeiro.', 'gestor-agenda'),
 ])
}

def main():
 draft = '--text-draft' in sys.argv
 manifest_path = CAPTURES / 'manifest.json'
 manifest = json.loads(manifest_path.read_text(encoding='utf-8')) if manifest_path.exists() else {}
 missing = [page[4] for _, pages in MANUALS.values() for page in pages if page[4] not in manifest]
 if missing and not draft:
  raise SystemExit('Capturas reais pendentes: '+', '.join(missing))
 OUT.mkdir(parents=True, exist_ok=True)
 font_root = Path('C:/Windows/Fonts')
 pdfmetrics.registerFont(TTFont('Garro', str(font_root/'arial.ttf')))
 pdfmetrics.registerFont(TTFont('GarroBold', str(font_root/'arialbd.ttf')))
 pdfmetrics.registerFontFamily('Garro',normal='Garro',bold='GarroBold')
 body = ParagraphStyle('body', fontName='Garro',fontSize=12 if draft else 10.5,leading=18 if draft else 15,textColor=HexColor('#372c26'))
 W,H = 595.28,841.89
 def paragraph(c,text,x,y,width,style=body):
  p=Paragraph(text,style); _,height=p.wrap(width,H);p.drawOn(c,x,y-height);return y-height
 for slug,(role,pages) in MANUALS.items():
  path=OUT/f'manual-garro-{slug}{"-texto" if draft else ""}.pdf'
  c=Canvas(str(path),pagesize=(W,H));c.setTitle(f'Garro - Manual de treinamento - {role}');c.setAuthor('Garro Produtora')
  for number,(title,purpose,steps,result,key) in enumerate(pages,1):
   c.setFillColor(HexColor('#f7f2ec'));c.rect(0,0,W,H,fill=1,stroke=0)
   c.setFillColor(HexColor('#a65f45'));c.rect(0,H-9,W,9,fill=1,stroke=0)
   c.drawImage(str(ROOT/'public/images/garro-wordmark.png'),42,H-70,width=128,height=39,mask='auto',preserveAspectRatio=True)
   c.setFillColor(HexColor('#806b5e'));c.setFont('Garro',9);c.drawRightString(W-42,H-43,'TREINAMENTO / '+role.upper())
   y=H-100
   y=paragraph(c,f'{number:02d}  {escape(title)}',42,y,W-84,ParagraphStyle('title',parent=body,fontName='GarroBold',fontSize=20,leading=24))-10
   y=paragraph(c,escape(purpose),42,y,W-84)-15
   if key in manifest and not draft:
    screenshot=Path(manifest[key]); screenshot=screenshot if screenshot.is_absolute() else CAPTURES/screenshot
    if not screenshot.is_file():raise FileNotFoundError(screenshot)
    img=ImageReader(str(screenshot));iw,ih=img.getSize();scale=min((W-84)/iw,220/ih);dw,dh=iw*scale,ih*scale
    c.setFillColor(HexColor('#ffffff'));c.roundRect(41,y-dh-2,W-82,dh+4,5,fill=1,stroke=0)
    c.drawImage(img,42+(W-84-dw)/2,y-dh,width=dw,height=dh)
    y-=dh+7
    y=paragraph(c,'Captura real do sistema Garro. Dados do registro exibido.',42,y,W-84,ParagraphStyle('caption',parent=body,fontSize=7.7,leading=10,textColor=HexColor('#806b5e')))-13
   elif draft:
    y=paragraph(c,'<b>VERSÃO TEXTUAL - CAPTURAS REAIS PENDENTES</b>',42,y,W-84,ParagraphStyle('draft',parent=body,fontSize=9,textColor=HexColor('#a65f45')))-18
   for i,step in enumerate(steps,1):
    y=paragraph(c,f'<b>{i}.</b> '+escape(step),42,y,W-84)-7
   y-=4
   y=paragraph(c,'<b>Resultado e atenção:</b> '+escape(result),42,y,W-84)-10
   if y<45:raise ValueError(f'Conteúdo excedeu a página: {slug} {number}, y={y}')
   c.setStrokeColor(HexColor('#ddcbbc'));c.line(42,35,W-42,35)
   c.setFont('Garro',8);c.setFillColor(HexColor('#806b5e'));c.drawString(42,22,'GARRO PRODUTORA | Manual de '+role+' | '+datetime.now().strftime('%d/%m/%Y'))
   c.drawRightString(W-42,22,f'{number} / {len(pages)}');c.showPage()
  c.save();print(str(path))

if __name__=='__main__':main()
