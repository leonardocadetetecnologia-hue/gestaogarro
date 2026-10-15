# Garro Produtora — Pacote de Desenvolvimento para Codex

Este pacote consolida os requisitos aprovados para a primeira versão do **Sistema Integrado Garro**.

O sistema NÃO terá integração com WhatsApp nesta etapa. Ele será um CRM comercial + gestão de produção + painel de editores, todos usando o mesmo banco PostgreSQL.

## Stack definida

- Next.js (App Router)
- TypeScript
- PostgreSQL
- Prisma ORM
- Tailwind CSS
- Zod + React Hook Form
- Lucide React
- Docker Compose + Caddy na VPS, sem Coolify
- Autenticação por sessão segura, sem auto cadastro

## Perfis

- `GESTOR_GARRO`: 1 usuário, acesso total.
- `ATENDENTE`: 1 usuário já criado, acesso somente ao CRM/comercial.
- `EDITOR`: vários usuários, criados pela Gestora, com acesso apenas às demandas/entregáveis atribuídos a eles.

## Ordem de leitura para o Codex

1. `00_CODEX_MASTER_PROMPT.md`
2. `docs/01_PRODUCT_SPEC.md`
3. `docs/02_WORKFLOWS.md`
4. `docs/03_UX_UI_SPEC.md`
5. `docs/04_RBAC_SECURITY.md`
6. `docs/05_DATABASE_MODEL.md`
7. `docs/06_TIMER_AND_DEADLINES.md`
8. `docs/07_VPS_DEPLOYMENT.md`
9. `docs/08_ACCEPTANCE_TESTS.md`
10. `docs/09_IMPLEMENTATION_PLAN.md`

## Referências visuais

- `public/images/garro-cinema-login.webp` e `public/images/garro-wordmark-reference.png`: tela de login aprovada.
- `public/images/garro-symbol-terracotta.webp`: símbolo Garro adaptado à paleta do sistema, com transparência. A aplicação compartilhada está em `src/components/garro-brand.tsx`.
- `docs/IDENTIDADE_VISUAL.md`: cores, uso e origem da adaptação do logo.
- `assets/reference-atendente.png`: referência aprovada do painel comercial.
- `assets/reference-gestora.png`: referência aprovada do painel da Gestora e comportamento de modal.

As imagens são referência de layout/composição, não de texto. Em caso de erro textual nas imagens, os documentos deste pacote têm precedência.

## Infra de publicação

- `Dockerfile`
- `compose.yaml`
- `infra/Caddyfile`
- `.env.example`
- `scripts/deploy.sh`
- `scripts/backup-postgres.sh`
- `scripts/restore-postgres.sh`
- `scripts/rollback.sh`
- `docs/DEPLOY_VPS.md`

A aplicação Next.js, o Prisma e o healthcheck estão neste repositório. A publicação na VPS ainda depende de domínio, chave SSH e do `.env` real.

## Regra de ouro

O sistema deve parecer uma ferramenta de operação séria, simples e objetiva. Poucos menus por perfil, alta densidade útil, sem visual genérico de template e sem excesso de cards decorativos.
