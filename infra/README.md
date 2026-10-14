# Infraestrutura

Stack de produção: Caddy (80/443) → Next.js (`app:3000`, rede interna) → PostgreSQL (`db:5432`, rede interna).

Arquivos:

- `infra/Caddyfile` — HTTPS automático e proxy para a aplicação.
- `compose.yaml` — serviços `caddy`, `app`, `db` e o perfil `tools` para o Prisma.
- `Dockerfile` — imagem de migrate e imagem de produção.
- `scripts/deploy.sh` — publicação controlada.
- `scripts/backup-postgres.sh` e `scripts/restore-postgres.sh` — backup e restauração.
- `scripts/rollback.sh` — volta a imagem anterior da aplicação.
- `docs/DEPLOY_VPS.md` — procedimento de publicação, backup e rollback.

O PostgreSQL não publica porta. A aplicação não publica a porta 3000. Só o Caddy escuta 80 e 443.

Não usar Coolify, Dokploy ou `docker compose down -v`.
