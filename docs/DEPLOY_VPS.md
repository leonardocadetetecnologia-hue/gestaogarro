# Deploy na VPS

Publicação manual com Docker Compose. A VPS atual usa o Traefik já existente; Caddy é opção para instalação independente. Não há pipeline automático.

Diretório previsto na VPS: `/opt/garro`.

## O que fica público

- Caddy nas portas 80 e 443.
- Next.js só na rede Docker, porta 3000.
- PostgreSQL só na rede Docker, porta 5432, com volume `pgdata`.

O script de deploy recusa continuar se 80 ou 443 já pertencerem a outro processo. Isso protege os demais sistemas desta VPS.

Nesta VPS as portas 80 e 443 já são do Traefik. Os sites públicos em `https://cadete.tech` e `https://garroprodutora.com.br` continuam na raiz. O sistema entra em `https://garroprodutora.com.br/gestaogarro`, com `DOMAIN=garroprodutora.com.br` e `BASE_PATH=/gestaogarro`. O host www também é atendido e o endereço anterior em cadete.tech permanece disponível. As imagens de `public/images` saem nesse mesmo prefixo; o otimizador `/_next/image` não é usado, porque ele busca o arquivo sem o prefixo e recebe HTML.

Uma troca apenas de domínio, mantendo `/gestaogarro`, reutiliza a imagem já compilada: após preservar uma cópia privada do `.env`, atualizar `DOMAIN` e revisar as labels, executar `docker compose -f compose.yaml -f compose.vps.yaml up -d --no-build --wait app`. Não aplicar seed nem alterar o banco. Validar HTTPS, login, healthcheck, imagens, ações de formulário e sites públicos. Next.js verifica a origem das Server Actions contra o Host/X-Forwarded-Host; domínios adicionais em allowedOrigins só são necessários quando esses hosts divergem.

## Antes do primeiro deploy

Estes passos são manuais para uma VPS nova. A instalação em `/opt/garro` já foi realizada; atualizações preservam configuração privada e dados existentes.

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

Nesta VPS, usar sempre o modo atrás do proxy existente, sem seed:

```bash
cd /opt/garro
bash scripts/deploy.sh --pull --behind-proxy
```

Referências de acesso estão em `docs/ACESSOS_E_CREDENCIAIS.md`. Nunca incluir valores do `.env` em logs ou documentação.

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

A aplicação Next.js, Prisma, migrations e `/api/health` estão implementados. Em 14/10/2026, o acesso à VPS confirmou app e PostgreSQL saudáveis em `/opt/garro`, revisão `ebd5e34`. A atualização do logo foi validada localmente com lint, typecheck, 8 testes, build e smoke test HTTP sob `/gestaogarro`. O resultado de cada publicação deve ser conferido nos containers e na URL pública.

## Documentos do Script

A migration `20261015030000_script_attachments` adiciona documentos privados aos entregáveis. Os bytes ficam em PostgreSQL (BYTEA), com limite de 10 MB por arquivo e integridade de tamanho no banco. O backup PostgreSQL inclui os documentos. Não é necessário abrir portas, criar URLs públicas nem configurar novo volume. Acompanhar tamanho dos backups e crescimento do banco.
