#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PULL=0
SEED=0
BEHIND_PROXY=0

for arg in "$@"; do
  case "$arg" in
    --pull) PULL=1 ;;
    --seed) SEED=1 ;;
    --behind-proxy) BEHIND_PROXY=1 ;;
    -h|--help)
      cat <<'EOF'
Uso: bash scripts/deploy.sh [--pull] [--seed] [--behind-proxy]

  --pull          atualiza o código com git pull --ff-only
  --seed          executa prisma db seed depois das migrations (só na implantação inicial)
  --behind-proxy  não sobe o Caddy; o proxy já existente encaminha o domínio

O script não apaga volumes e não executa docker compose down.
EOF
      exit 0
      ;;
    *)
      echo "Argumento desconhecido: $arg" >&2
      exit 2
      ;;
  esac
done

if [[ ! -f .env ]]; then
  echo "Arquivo .env ausente. Copie .env.example e preencha fora do Git." >&2
  exit 1
fi

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  if git ls-files --error-unmatch .env >/dev/null 2>&1; then
    echo ".env está versionado. Remova do Git antes de publicar." >&2
    exit 1
  fi
fi

get_env() {
  local key="$1"
  local line value
  line="$(grep -E "^${key}=" .env | tail -n 1 || true)"
  value="${line#"${key}="}"
  value="${value%$'\r'}"
  if [[ ${#value} -ge 2 ]]; then
    if [[ "$value" == \"*\" || "$value" == \'*\' ]]; then
      value="${value:1:$((${#value} - 2))}"
    fi
  fi
  printf '%s' "$value"
}

require() {
  local name="$1"
  local value="$2"
  if [[ -z "$value" ]]; then
    echo "Variável obrigatória ausente: $name" >&2
    exit 1
  fi
}

DOMAIN="$(get_env DOMAIN)"
ACME_EMAIL="$(get_env ACME_EMAIL)"
POSTGRES_USER="$(get_env POSTGRES_USER)"
POSTGRES_PASSWORD="$(get_env POSTGRES_PASSWORD)"
POSTGRES_DB="$(get_env POSTGRES_DB)"
DATABASE_URL="$(get_env DATABASE_URL)"
SESSION_SECRET="$(get_env SESSION_SECRET)"

require DOMAIN "$DOMAIN"
if [[ "$BEHIND_PROXY" -eq 0 ]]; then
  require ACME_EMAIL "$ACME_EMAIL"
fi
require POSTGRES_USER "$POSTGRES_USER"
require POSTGRES_PASSWORD "$POSTGRES_PASSWORD"
require POSTGRES_DB "$POSTGRES_DB"
require DATABASE_URL "$DATABASE_URL"
require SESSION_SECRET "$SESSION_SECRET"

if [[ ! "$DOMAIN" =~ ^[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$ ]]; then
  echo "DOMAIN deve ser um nome DNS, por exemplo sistema.exemplo.com." >&2
  exit 1
fi

if [[ "$BEHIND_PROXY" -eq 0 && ! "$ACME_EMAIL" =~ ^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$ ]]; then
  echo "ACME_EMAIL inválido." >&2
  exit 1
fi

for name in POSTGRES_USER POSTGRES_DB; do
  value="${!name}"
  if [[ ! "$value" =~ ^[a-zA-Z0-9_]+$ ]]; then
    echo "${name} deve conter apenas letras, números e _." >&2
    exit 1
  fi
done

if [[ "$POSTGRES_PASSWORD" == *change-me* || "$DATABASE_URL" == *change-me* || "$SESSION_SECRET" == *change-me* ]]; then
  echo "Substitua os valores change-me do .env.example antes de publicar." >&2
  exit 1
fi

if [[ ${#SESSION_SECRET} -lt 32 ]]; then
  echo "SESSION_SECRET precisa ter pelo menos 32 caracteres." >&2
  exit 1
fi

if [[ "$DATABASE_URL" != *@db:* && "$DATABASE_URL" != *@db/* ]]; then
  echo "DATABASE_URL de produção deve usar o host db da rede Docker." >&2
  exit 1
fi

LOCK_FILE="${ROOT}/.deploy.lock"
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "Outro deploy está em andamento." >&2
  exit 1
fi

if [[ "$PULL" -eq 1 ]]; then
  git pull --ff-only
fi

sha="$(git rev-parse --short HEAD 2>/dev/null || echo sem-git)"
echo "Deploy Garro — revisão ${sha}"

if [[ "$BEHIND_PROXY" -eq 1 ]]; then
  export COMPOSE_FILE="compose.yaml:compose.vps.yaml"
fi

port_busy() {
  local port="$1"
  ss -tln | awk '{print $4}' | grep -Eq "(^|:)${port}$"
}

caddy_running() {
  docker compose ps --status running --format '{{.Service}}' 2>/dev/null | grep -qx caddy
}

if [[ "$BEHIND_PROXY" -eq 0 ]] && { port_busy 80 || port_busy 443; }; then
  if ! caddy_running; then
    echo "As portas 80/443 já estão em uso por outro processo. Deploy interrompido para preservar o que já escuta nesta VPS." >&2
    exit 1
  fi
fi

if docker image inspect garro-app:current >/dev/null 2>&1; then
  docker tag garro-app:current garro-app:previous
  echo "Imagem anterior preservada como garro-app:previous"
fi

docker compose up -d --wait db
docker compose --profile tools build migrate
docker compose build app

set +e
status_out="$(docker compose --profile tools run --rm migrate npx prisma migrate status 2>&1)"
status_code=$?
set -e
printf '%s\n' "$status_out"

migrated=0
if [[ "$status_code" -ne 0 ]]; then
  if printf '%s\n' "$status_out" | grep -qi 'not yet been applied'; then
    echo "Migrations pendentes. Backup antes de aplicar."
    bash "$ROOT/scripts/backup-postgres.sh"
    docker compose stop app || true
    if ! docker compose --profile tools run --rm migrate; then
      echo "Migration falhou. O schema não deve ter ficado pela metade em uma migration Prisma." >&2
      if docker image inspect garro-app:previous >/dev/null 2>&1; then
        docker tag garro-app:previous garro-app:current
        docker compose up -d --no-build app || true
        echo "Aplicação anterior religada." >&2
      fi
      exit 1
    fi
    migrated=1
  else
    echo "prisma migrate status falhou. Nada foi migrado e a aplicação em execução não foi substituída." >&2
    exit 1
  fi
fi

if [[ "$SEED" -eq 1 ]]; then
  require SEED_GESTORA_PASSWORD "$(get_env SEED_GESTORA_PASSWORD)"
  require SEED_ATENDENTE_PASSWORD "$(get_env SEED_ATENDENTE_PASSWORD)"
  gestora_password="$(get_env SEED_GESTORA_PASSWORD)"
  atendente_password="$(get_env SEED_ATENDENTE_PASSWORD)"
  if [[ "$gestora_password" == *change-me* || "$atendente_password" == *change-me* ]]; then
    echo "Defina senhas reais de seed no .env." >&2
    exit 1
  fi
  docker compose --profile tools run --rm migrate npx prisma db seed
fi

front=(app)
if [[ "$BEHIND_PROXY" -eq 0 ]]; then
  front+=(caddy)
fi

if ! docker compose up -d --wait "${front[@]}"; then
  echo "Healthcheck falhou." >&2
  docker compose logs --tail 80 "${front[@]}" || true
  if [[ "$migrated" -eq 0 ]] && docker image inspect garro-app:previous >/dev/null 2>&1; then
    echo "Sem migration nova. Voltando a imagem anterior." >&2
    docker tag garro-app:previous garro-app:current
    docker compose up -d --no-build --wait "${front[@]}" || true
  else
    echo "Houve migration neste deploy. A imagem anterior permanece em garro-app:previous." >&2
    echo "O banco não foi revertido. Restaure o backup se a aplicação nova for incompatível." >&2
  fi
  exit 1
fi

echo "Deploy concluído. Confira https://${DOMAIN}"
