# AGENTS.md

Este arquivo existe para agentes de desenvolvimento que reconhecem AGENTS.md.

O usuário adotou expressamente `MASTER_PROMPT.md` como as regras permanentes deste desenvolvimento em 14/10/2026. O arquivo corresponde ao prompt fornecido por ele e deve ser consultado também em novas sessões neste repositório.

## Regra principal

Antes de qualquer alteração relevante:

1. leia `MASTER_PROMPT.md`;
2. leia `PROJECT_CONTEXT.md`;
3. consulte a documentação em `docs/`;
4. respeite essas regras durante toda a tarefa.

`MASTER_PROMPT.md` é a fonte oficial das regras de engenharia.

`PROJECT_CONTEXT.md` é a fonte oficial do contexto específico deste projeto.

Não duplique ou substitua essas regras neste arquivo.

## Obrigatório

- preservar arquitetura e convenções;
- documentar novas funcionalidades;
- atualizar documentação afetada;
- nunca salvar credenciais reais no repositório;
- validar performance e responsividade;
- executar testes, lint, typecheck e build quando disponíveis;
- revisar e autocorrigir problemas antes de concluir;
- perguntar apenas em dúvidas críticas.

## Cursor Cloud specific instructions

Ambiente local para agentes. Não usa credenciais de produção nem o host `db` do Docker Compose.

- Node.js 22 já está na imagem. A instalação do repositório é `npm ci` e `npx prisma generate`.
- PostgreSQL 16 escuta em `127.0.0.1:5432`. Neste ambiente o systemd não sobe serviços; o cluster inicia com `sudo pg_ctlcluster 16 main start`. Espere `pg_isready` antes de migrar.
- Banco local `garro`, usuário `garro`, senha `change-me` (placeholder de `.env.example`). `DATABASE_URL=postgresql://garro:change-me@127.0.0.1:5432/garro?schema=public`.
- `.env` não vai para o Git. `SESSION_SECRET` precisa ter pelo menos 32 caracteres e não pode conter o texto `change-me`.
- O seed não define username. O login usa o e-mail com o perfil correspondente: `gestora@garro.local` / `gestora-local-dev` (Gestor) e `atendente@garro.local` / `atendente-local-dev` (Atendente).
- No boot, o `start` sobe o Postgres, aplica `npx prisma migrate deploy`, executa o seed só se não houver usuários e deixa o Next em `http://127.0.0.1:3000`. Saúde: `GET /api/health`. Log: `/tmp/cursor/start-user/start-user.log`.
- Validação: `npm run lint`, `npm run typecheck`, `npm test` e `npm run build`.
