#!/usr/bin/env bash
# Backup diário do sistema: banco e aplicação, um arquivo por dia.
# A cópia vai para a pasta informada do Google Drive. O token fica só na VPS.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

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

day="$(TZ=America/Sao_Paulo date +%F)"
BACKUP_DAY="$day" bash "$ROOT/scripts/backup-system.sh"

remote="$(get_env BACKUP_DRIVE_REMOTE)"
remote="${remote:-garro-drive}"
folder_id="$(get_env BACKUP_DRIVE_FOLDER_ID)"
folder_id="${folder_id:-1cCGKVRnIpwMu7m_0-WOcJmUozQo367bW}"

if [[ ! "$remote" =~ ^[A-Za-z0-9_-]+$ ]]; then
  echo "BACKUP_DRIVE_REMOTE inválido. O backup local foi gravado e não foi enviado." >&2
  exit 1
fi
if [[ ! "$folder_id" =~ ^[A-Za-z0-9_-]+$ ]]; then
  echo "BACKUP_DRIVE_FOLDER_ID inválido. O backup local foi gravado e não foi enviado." >&2
  exit 1
fi

if ! command -v rclone >/dev/null 2>&1; then
  echo "rclone não está instalado. O backup local foi gravado e não foi enviado." >&2
  exit 1
fi

if ! rclone listremotes | grep -qx "${remote}:"; then
  echo "O remote '${remote}' não existe no rclone. O backup local foi gravado e não foi enviado." >&2
  exit 1
fi

backup_dir="$(get_env BACKUP_DIR)"
backup_dir="${backup_dir:-/var/backups/garro}"
month="${day:0:7}"
db_file="${backup_dir}/${month}/banco/${day}.dump"
app_file="${backup_dir}/${month}/aplicacao/${day}.tar.gz"

copy_one() {
  local src="$1"
  local dest="$2"
  timeout 180 rclone copyto \
    --retries 2 \
    --low-level-retries 5 \
    --contimeout 20s \
    --timeout 150s \
    --drive-root-folder-id "$folder_id" \
    "$src" "${remote}:${dest}"
}

copy_one "$db_file" "${month}/banco/${day}.dump"
copy_one "$app_file" "${month}/aplicacao/${day}.tar.gz"

echo "Cópia enviada ao Google Drive: ${month}/banco/${day}.dump e ${month}/aplicacao/${day}.tar.gz"
