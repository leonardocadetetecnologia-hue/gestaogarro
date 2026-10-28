#!/usr/bin/env bash
# Um arquivo de banco e um da aplicação por dia, em AAAA-MM/banco e AAAA-MM/aplicacao.
# Rodar de novo no mesmo dia substitui só o arquivo daquele dia. Dias anteriores ficam.
# Não imprime o .env nem o conteúdo dos arquivos.
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
unset POSTGRES_PASSWORD

if [[ -n "${BACKUP_DAY:-}" ]]; then
  day="$BACKUP_DAY"
else
  day="$(TZ=America/Sao_Paulo date +%F)"
fi
if [[ ! "$day" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
  echo "Data do backup inválida." >&2
  exit 1
fi
month="${day:0:7}"

month_dir="${BACKUP_DIR}/${month}"
db_dir="${month_dir}/banco"
app_dir="${month_dir}/aplicacao"
db_file="${db_dir}/${day}.dump"
app_file="${app_dir}/${day}.tar.gz"

umask 077
mkdir -p "$db_dir" "$app_dir"
chmod 700 "$BACKUP_DIR" "$month_dir" "$db_dir" "$app_dir"

tmp_db=""
tmp_app=""
cleanup() {
  if [[ -n "$tmp_db" && -f "$tmp_db" ]]; then
    rm -f "$tmp_db"
  fi
  if [[ -n "$tmp_app" && -f "$tmp_app" ]]; then
    rm -f "$tmp_app"
  fi
}
trap cleanup EXIT

docker compose up -d --wait db

tmp_db="${db_dir}/.${day}.dump.partial"
docker compose exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "$tmp_db"
chmod 600 "$tmp_db"
mv -f "$tmp_db" "$db_file"
tmp_db=""
chmod 600 "$db_file"

tmp_app="${app_dir}/.${day}.tar.gz.partial"
excludes=(
  --exclude=node_modules
  --exclude=.next
  --exclude=.git
  --exclude=coverage
  --exclude='*.log'
)
if [[ "$BACKUP_DIR" == "$ROOT/"* ]]; then
  excludes+=(--exclude="${BACKUP_DIR#"$ROOT/"}")
fi
tar -C "$ROOT" "${excludes[@]}" -czf "$tmp_app" .
chmod 600 "$tmp_app"
mv -f "$tmp_app" "$app_file"
tmp_app=""
chmod 600 "$app_file"

echo "Backup do banco gravado: $db_file"
echo "Backup da aplicação gravado: $app_file"
