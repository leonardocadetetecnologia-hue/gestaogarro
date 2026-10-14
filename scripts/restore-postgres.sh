#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

file="${1:-}"
confirm="${2:-}"

if [[ -z "$file" || "$confirm" != "--yes" ]]; then
  echo "Uso: bash scripts/restore-postgres.sh /caminho/garro-AAAAMMDDTHHMMSSZ.dump --yes" >&2
  echo "Substitui os dados atuais do banco. A aplicação é parada. O volume Docker não é apagado." >&2
  exit 2
fi

if [[ ! -f "$file" ]]; then
  echo "Arquivo de backup não encontrado." >&2
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "Arquivo .env ausente." >&2
  exit 1
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

POSTGRES_USER="$(get_env POSTGRES_USER)"
POSTGRES_DB="$(get_env POSTGRES_DB)"

for name in POSTGRES_USER POSTGRES_DB; do
  value="${!name}"
  if [[ ! "$value" =~ ^[a-zA-Z0-9_]+$ ]]; then
    echo "${name} deve conter apenas letras, números e _." >&2
    exit 1
  fi
done

echo "Restaurando $file no banco ${POSTGRES_DB}."
docker compose up -d --wait db
docker compose stop app
docker compose exec -T db psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${POSTGRES_DB}' AND pid <> pg_backend_pid();"
docker compose exec -T db pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --exit-on-error < "$file"
docker compose start app
echo "Restauração concluída. Confira a aplicação e o healthcheck."
