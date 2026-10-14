#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Arquivo .env ausente. Copie .env.example e preencha fora do Git." >&2
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
POSTGRES_PASSWORD="$(get_env POSTGRES_PASSWORD)"
POSTGRES_DB="$(get_env POSTGRES_DB)"
BACKUP_DIR="$(get_env BACKUP_DIR)"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/garro}"

for name in POSTGRES_USER POSTGRES_DB; do
  value="${!name}"
  if [[ ! "$value" =~ ^[a-zA-Z0-9_]+$ ]]; then
    echo "${name} deve conter apenas letras, números e _." >&2
    exit 1
  fi
done

if [[ -z "$POSTGRES_PASSWORD" || "$POSTGRES_PASSWORD" == *change-me* ]]; then
  echo "Defina POSTGRES_PASSWORD real no .env." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

docker compose up -d --wait db

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
file="${BACKUP_DIR}/garro-${stamp}.dump"
umask 077
docker compose exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "$file"
chmod 600 "$file"

mapfile -t old < <(ls -1t "$BACKUP_DIR"/garro-*.dump 2>/dev/null || true)
if [[ ${#old[@]} -gt 14 ]]; then
  rm -f "${old[@]:14}"
fi

echo "Backup gravado: $file"
