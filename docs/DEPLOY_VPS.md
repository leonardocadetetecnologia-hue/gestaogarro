# Deploy na VPS

Publicação manual do Garro com Docker Compose e Caddy. Sem Coolify e sem pipeline automático.

Diretório previsto na VPS: `/opt/garro`.

## O que fica público

- Caddy nas portas 80 e 443.
- Next.js só na rede Docker, porta 3000.
- PostgreSQL só na rede Docker, porta 5432, com volume `pgdata`.

O script de deploy recusa continuar se 80 ou 443 já pertencerem a outro processo. Isso protege os demais sistemas desta VPS.

## Antes do primeiro deploy

Estes passos são manuais. Não fazem parte do repositório e não foram executados daqui.

1. Entrar por SSH com chave. Esta VPS aceita apenas `publickey`.
2. Confirmar Docker Engine e o plugin Compose v2: `docker compose version`.
3. Apontar o DNS de `DOMAIN` para o IP da VPS antes de subir o Caddy. Sem isso o certificado não sai.
4. Liberar no firewall apenas 22, 80 e 443.
5. Clonar o repositório em `/opt/garro` quando o Git tiver commits.
6. `cp .env.example .env` e preencher domínio, e-mail ACME, senha do banco, `DATABASE_URL` e `SESSION_SECRET`.
7. `chmod 600 .env`.
8. A aplicação Next.js precisa existir, com `output: "standalone"`, `package-lock.json`, `prisma/` e `GET /api/health` respondendo 200 sem consultar segredo.

`DATABASE_URL` usa o host `db`. Datas no PostgreSQL ficam em UTC. A aplicação usa `America/Sao_Paulo`.

## Primeira publicação

```bash
cd /opt/garro
bash scripts/deploy.sh --seed
```

`--seed` só na implantação inicial, quando o seed da Gestora e da Atendente existir. Atualizações seguintes não usam `--seed`.

## Atualização

```bash
cd /opt/garro
git pull --ff-only
bash scripts/deploy.sh
```

Ou, no mesmo passo: `bash scripts/deploy.sh --pull`.

Ordem do script:

1. Valida o `.env` e impede dois deploys ao mesmo tempo.
2. Aborta se 80/443 estiverem ocupadas por outro serviço.
3. Guarda a imagem atual como `garro-app:previous`.
4. Sobe o PostgreSQL e faz o build.
5. Se houver migration pendente, gera backup e só então roda `prisma migrate deploy`.
6. Sobe aplicação e Caddy e espera o healthcheck.

`prisma migrate dev` não entra neste fluxo. Em produção a migration é só `migrate deploy`, uma de cada vez, dentro do script.

## Backup

```bash
bash scripts/backup-postgres.sh
```

Grava `pg_dump` em formato custom em `/var/backups/garro`, com permissão `600`, e mantém os 14 arquivos mais novos. O volume Docker não substitui esse backup.

Agendamento sugerido, no root da VPS:

```cron
15 3 * * * cd /opt/garro && bash scripts/backup-postgres.sh >> /var/log/garro-backup.log 2>&1
```

Ainda falta definir a cópia externa. Enquanto isso, o backup local não protege a perda da VPS. Testar a restauração em uma base separada quando o primeiro dump existir.

## Restauração

```bash
bash scripts/restore-postgres.sh /var/backups/garro/garro-AAAAMMDDTHHMMSSZ.dump --yes
```

Para a aplicação, encerra conexões do banco, restaura com `pg_restore` e sobe a aplicação de novo. Não remove o volume.

## Rollback

```bash
bash scripts/rollback.sh
```

Isso recoloca a imagem `garro-app:previous` no ar. Não desfaz migration.

Se a aplicação nova ficou incompatível com o schema já migrado:

1. Pare a decisão de seguir na imagem nova.
2. Restaure o dump gerado imediatamente antes da migration.
3. Rode `bash scripts/rollback.sh`.

Rollback de schema é uma migration nova para a frente, ou a restauração desse dump. Não edite uma migration já aplicada.

## Recusas operacionais

- Não usar `docker compose down -v`.
- Não apagar `pgdata`, `caddy_data` ou `caddy_config` numa atualização.
- Não publicar 5432 nem 3000.
- Não gravar senha no Git.
- Não instalar Coolify para este sistema.
- Não habilitar deploy automático.

## Estado deste repositório

A infra está descrita e scriptada. A imagem ainda não constrói: faltam a aplicação Next.js, o Prisma e o endpoint `/api/health`. A VPS não foi alterada.
