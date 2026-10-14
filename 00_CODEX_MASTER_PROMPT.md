# PROMPT MESTRE — SISTEMA INTEGRADO GARRO PRODUTORA

Você está dentro do repositório do novo **Sistema Integrado Garro Produtora**.

Sua tarefa é implementar o produto descrito nos arquivos deste pacote. Não faça apenas planejamento. Leia toda a documentação, inspecione o repositório e construa o sistema em fases, mantendo build, tipagem, migrações e testes funcionais.

---

## 1. OBJETIVO DO PRODUTO

Criar um sistema interno único para a Garro Produtora com três pilares:

1. **CRM / Comercial** — usado pela Atendente para organizar clientes, oportunidades, valores, contatos, follow-ups, propostas e fechamentos.
2. **Gestão / Produção** — usado pela Gestora Garro para receber vendas fechadas como demandas, planejar produção, controlar prazos, delegar entregáveis para editores, revisar e entregar.
3. **Execução / Editor** — usado por vários editores, cada um enxergando apenas os trabalhos atribuídos a ele, seus prazos, briefing, arquivos/referências e conversa interna com a Gestora.

O sistema NÃO deve integrar com WhatsApp nesta etapa.

Não criar chatbot, automação de atendimento, scraping, Baileys, whatsapp-web.js, Puppeteer, Meta Cloud API ou qualquer integração equivalente.

O CRM registra interações manualmente.

---

## 2. STACK OBRIGATÓRIA

Use:

- Next.js App Router
- TypeScript estrito
- PostgreSQL
- Prisma ORM
- Tailwind CSS
- Zod
- React Hook Form
- Lucide React
- bcrypt/argon2 para hash de senha
- autenticação segura por sessão
- Docker para produção

Priorize componentes próprios. Não transforme o visual em um template padrão do shadcn. Se usar primitivas de acessibilidade, preserve totalmente a identidade visual aprovada.

Use `IBM Plex Sans` como fonte principal. O visual deve ser sério, leve e corporativo.

---

## 3. REGRAS DE PERFIL

Existem somente três papéis:

### GESTOR_GARRO

- Um usuário.
- Acesso total.
- Enxerga CRM, clientes, vendas, demandas, produção, editores, agenda global, prazos, relatórios, notificações, configurações e usuários.
- Cria, ativa, desativa e redefine senha de editores.
- Pode consultar o comercial da Atendente.

### ATENDENTE

- Um usuário pré-criado.
- Acesso somente ao CRM/comercial.
- NÃO vê demandas de produção, editores, carga de trabalho, revisão Garro, agenda global de produção ou configurações administrativas.
- Pode cadastrar clientes, registrar contatos, alterar oportunidade, registrar follow-up, proposta, fechar/perder oportunidade e consultar histórico comercial.

### EDITOR

- Vários usuários.
- Criados pela Gestora.
- Enxerga somente demandas/entregáveis explicitamente atribuídos a ele.
- NÃO vê CRM, valores comerciais, outros editores, outras demandas, relatórios comerciais ou configurações.
- Pode atualizar apenas os status permitidos da própria execução, enviar material para revisão e conversar com a Gestora dentro da demanda.

RBAC deve ser validado no SERVIDOR. Esconder menu no front-end não é segurança.

---

## 4. FLUXO PRINCIPAL

### Comercial

Cliente → Oportunidade → Contatos/Interações → Follow-up → Proposta → Fechamento ou Perda.

O Kanban comercial inicial deve usar poucas etapas para manter leitura simples:

1. Novos contatos
2. Em atendimento
3. Proposta enviada
4. Fechamento

O resultado final é separado da etapa:

- `OPEN`
- `WON`
- `LOST`

Ao marcar `WON`, abrir um fluxo de fechamento obrigatório e, em uma única transação, criar:

- venda;
- demanda de produção;
- histórico;
- compromissos/prazos aplicáveis.

O cliente NÃO é recadastrado.

Ao marcar `LOST`, motivo da perda é obrigatório.

### Produção

Venda ganha → Nova demanda → Planejamento → Entregáveis → Delegação → Produção → Revisão Garro → Correção (se necessário) → Aprovação → Entrega ao cliente.

Uma demanda pode possuir vários entregáveis. Cada entregável pode ser delegado a um editor diferente.

### Editor

Recebe entregável → Revisar briefing → Em produção → Enviar para revisão → Gestora revisa → Correção ou aprovação.

---

## 5. PRAZOS

Existem três conceitos obrigatórios:

1. **Prazo do editor** — quando o editor deve entregar para a Gestora.
2. **Prazo de revisão Garro** — quando a Gestora deve terminar revisão/correções internas.
3. **Prazo do cliente** — data final prometida ao cliente.

A Gestora deve ver claramente o tempo restante de cada prazo.

Exemplos:

- `Faltam 1d 6h`
- `Vence hoje às 18:00`
- `Atrasado 4h`
- `Concluído em 14/10 16:32`

Nunca tratar o prazo do editor como equivalente ao prazo do cliente.

---

## 6. AGENDA GLOBAL

A Gestora possui uma Agenda Global que consolida:

- follow-ups da Atendente;
- reuniões comerciais;
- prazo de editor;
- prazo de revisão Garro;
- prazo do cliente;
- correções;
- reuniões/gravações internas;
- outros compromissos cadastrados.

A Atendente vê apenas a agenda comercial dela.

O Editor vê apenas a agenda dele.

---

## 7. CRM — VALORES E TIMER

O Kanban comercial deve exibir:

- valor estimado de cada oportunidade no card;
- total financeiro por coluna;
- total do pipeline aberto;
- vendas confirmadas no período;
- taxa de conversão;
- clientes parados/sem atualização.

Como NÃO existe integração WhatsApp, o sistema não pode fingir saber se o cliente respondeu.

O timer é baseado nas interações MANUALMENTE registradas.

Cada interação deve registrar `waitingOn`:

- `CUSTOMER` — Garro aguarda cliente;
- `ATTENDANT` — cliente aguarda Atendente;
- `NONE` — ninguém aguardando.

Exibir estados objetivos:

- `Aguardando sua resposta · 3h`
- `Sem resposta do cliente · 2d`
- `Sem atualização · 3d`

Os limites de alerta devem ser configuráveis pela Gestora.

---

## 8. UI APROVADA

Identidade:

- fundos claros, creme, bege e marrom-terra/terracota;
- aparência séria e editorial;
- sem fotos de usuários/clientes; usar iniciais;
- fonte IBM Plex Sans;
- pouco arredondamento;
- sombras discretíssimas;
- bordas finas;
- sem gradientes chamativos;
- sem cards inchados;
- informações compactas e legíveis.

Use os arquivos em `assets/` como referência.

A logo oficial é `assets/garro-logo.png`.

A marca deve ser escrita corretamente: **GARRO PRODUTORA**.

### Sidebar

- Desktop: barra de ícones estreita.
- Os textos/menu expandem ao passar o mouse, em overlay, SEM empurrar o conteúdo.
- Ao sair do hover volta a ocupar pouco espaço.
- Em touch/tablet/mobile, usar botão/hamburger ou drawer; não depender de hover.

### Painel lateral de detalhe

No CRM, ao clicar em cliente/oportunidade, abrir painel lateral direito.

- Quando aberto: Kanban usa o espaço restante.
- Quando fechado: Kanban expande automaticamente e ocupa o espaço liberado.
- Em mobile: painel vira drawer/tela dedicada.

### Modal de edição/novo cliente

Novo cliente e Editar cliente devem abrir modal bloqueante:

- fundo desfocado;
- foco visual total no modal;
- clique fora NÃO fecha;
- Escape NÃO deve descartar alterações silenciosamente;
- fechar somente por ação explícita;
- autosave de rascunho;
- botão `Salvar rascunho`;
- botão `Salvar`;
- ao sair com conteúdo iniciado, persistir como rascunho;
- ao reabrir, recuperar rascunho;
- mostrar estado `Rascunho salvo automaticamente`.

Não usar apenas localStorage. O rascunho deve persistir no PostgreSQL para sobreviver a outro navegador/dispositivo.

---

## 9. PAINEL DA GESTORA

Dashboard deve permitir entender a operação em segundos.

No topo:

- Pipeline aberto;
- Demandas ativas;
- Entregas/prazos hoje;
- Itens em risco.

Áreas principais:

- carga por editor;
- demandas com cada editor;
- status por demanda/entregável;
- Agenda Global;
- próximos prazos;
- prazo do editor + tempo restante;
- revisão Garro + tempo restante;
- cliente + tempo restante;
- demandas atrasadas;
- demandas em revisão;
- entregas em risco;
- status geral da produção.

A Gestora deve poder filtrar por editor, status, período e risco.

---

## 10. COMUNICAÇÃO GESTORA ↔ EDITOR

Dentro da demanda existe `Conversa da Demanda`.

Não é chat genérico e não é WhatsApp.

Mensagens ficam vinculadas à demanda e opcionalmente a um entregável.

Suportar:

- texto;
- links;
- anexo pequeno;
- mensagem de sistema;
- histórico;
- notificação da outra parte.

Eventos automáticos podem aparecer na timeline, por exemplo:

- `Lucas enviou para revisão`;
- `Garro solicitou correção`;
- `Garro aprovou o material`.

Editor e Gestora recebem notificações internas.

Na V1, priorize robustez: polling/refresh curto é aceitável; não complique o produto com infraestrutura realtime desnecessária.

---

## 11. ARQUIVOS

Não armazenar arquivos brutos gigantes de vídeo na VPS na primeira versão.

Permitir:

- links de Google Drive/Dropbox/Frame.io/WeTransfer;
- anexos pequenos de referência/documentos/imagens;
- abstração de storage para migrar depois para S3/MinIO.

---

## 12. PERFORMANCE

O sistema deve ser rápido em desktop e responsivo em mobile.

Regras:

- Server Components por padrão;
- Client Components apenas onde necessário;
- queries paginadas;
- evitar carregar histórico inteiro sem necessidade;
- índices corretos no PostgreSQL;
- evitar N+1;
- debounce em busca e autosave;
- timers atualizados no máximo a cada minuto, não a cada segundo;
- otimizar imagens/ícones;
- sem bibliotecas pesadas sem justificativa.

---

## 13. SEGURANÇA

- hash de senha forte;
- cookies `httpOnly`, `secure` em produção, `sameSite` adequado;
- CSRF conforme estratégia de autenticação;
- validação Zod no servidor;
- RBAC em todas as mutações e leituras sensíveis;
- editor deve receber 404/403 para demanda não atribuída;
- PostgreSQL não pode ser exposto à internet;
- sem credenciais no Git;
- audit log para ações críticas;
- backups automáticos.

---

## 14. IMPLEMENTAÇÃO

Antes de codificar:

1. Leia todos os documentos em `docs/`.
2. Analise `prisma/schema.prisma` e ajuste apenas se necessário.
3. Examine as referências de UI em `assets/`.
4. Crie um plano curto por fases.
5. Implemente de fato.

Ordem recomendada:

### Fase 1 — Fundação

- Next.js/TS/Tailwind;
- Prisma/PostgreSQL;
- autenticação;
- seed Gestora + Atendente;
- RBAC;
- shell responsivo;
- design tokens.

### Fase 2 — CRM

- clientes;
- oportunidades;
- Kanban;
- valores;
- contatos/interações;
- timers;
- follow-ups;
- modal e rascunhos;
- fechamento/perda.

### Fase 3 — Produção

- geração de demanda por venda;
- entregáveis;
- delegação;
- prazos;
- Kanban de produção;
- visão por editor;
- risco.

### Fase 4 — Editor

- minhas demandas;
- briefing;
- prazos;
- envio para revisão;
- correções;
- conversa da demanda;
- notificações.

### Fase 5 — Agenda e gestão

- agenda comercial;
- Agenda Global;
- dashboard Gestora;
- relatórios essenciais;
- configurações;
- usuários editores.

### Fase 6 — Produção/VPS

- lint;
- typecheck;
- testes;
- build;
- migrações;
- Docker Compose + Caddy, sem Coolify;
- backup;
- documentação em `docs/DEPLOY_VPS.md`.

---

## 15. NÃO FAZER

Não implementar agora:

- WhatsApp;
- IA;
- chatbot;
- customer portal;
- pagamentos;
- emissão fiscal;
- multi-tenant;
- app mobile nativo;
- storage de mídia pesada;
- workflows automáticos externos.

---

## 16. CRITÉRIO DE FINALIZAÇÃO

Não considere concluído enquanto:

- `npm run lint` passar;
- `npm run typecheck` passar;
- `npm run test` passar (se configurado);
- `npm run build` passar;
- banco subir do zero;
- migrations funcionarem;
- seed funcionar;
- RBAC estiver testado;
- os fluxos principais dos três perfis funcionarem;
- responsividade básica estiver validada;
- não houver dados mockados como fonte principal em produção.

Ao final, escreva `IMPLEMENTATION_REPORT.md` com:

- o que foi implementado;
- decisões arquiteturais;
- migrations;
- credenciais/seed esperados via env;
- comandos de execução;
- instruções de deploy;
- pendências reais.

Comece agora lendo os arquivos e implementando por fases.
