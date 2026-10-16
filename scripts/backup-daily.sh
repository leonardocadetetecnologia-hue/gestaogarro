#!/usr/bin/env bash
# Backup local e, se o rclone estiver configurado, cópia para o Google Drive.
# O token do Drive fica só na VPS, em /root/.config/rclone/rclone.conf.
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

bash "$ROOT/scripts/backup-postgres.sh"

remote="$(get_env BACKUP_DRIVE_REMOTE)"
if [[ -z "$remote" ]]; then
  echo "Cópia para o Google Drive desligada. Defina BACKUP_DRIVE_REMOTE no .env."
  exit 0
fi

if ! command -v rclone >/dev/null 2>&1; then
  echo "rclone não está instalado. O backup local foi gravado e não foi enviado." >&2
  exit 1
fi

if ! rclone listremotes | grep -qx "${remote}:"; then
  echo "O remote '${remote}' não existe no rclone. O backup local foi gravado e não foi enviado." >&2
  exit 1
fi

dir="$(get_env BACKUP_DRIVE_DIR)"
dir="${dir:-Garro/backups}"
dir="${dir#/}"
dir="${dir%/}"
keep="$(get_env BACKUP_DRIVE_KEEP)"
keep="${keep:-30}"
if [[ ! "$keep" =~ ^[0-9]+$ ]] || [[ "$keep" -lt 1 ]]; then
  echo "BACKUP_DRIVE_KEEP deve ser um número maior que zero." >&2
  exit 1
fi

backup_dir="$(get_env BACKUP_DIR)"
backup_dir="${backup_dir:-/var/backups/garro}"
latest="$(ls -1t "$backup_dir"/garro-*.dump | head -n 1)"
name="$(basename "$latest")"

rclone mkdir "${remote}:${dir}"
rclone copyto "$latest" "${remote}:${dir}/${name}" --retries 3 --low-level-retries 10

mapfile -t remote_files < <(rclone lsf "${remote}:${dir}" --files-only | grep -E '^garro-[0-9]{8}T[0-9]{6}Z\.dump$' | sort || true)
if [[ ${#remote_files[@]} -gt "$keep" ]]; then
  remove=$(( ${#remote_files[@]} - keep ))
  for ((i = 0; i < remove; i++)); do
    rclone deletefile "${remote}:${dir}/${remote_files[$i]}"
  done
fi

echo "Cópia enviada ao Google Drive: ${dir}/${name}"
