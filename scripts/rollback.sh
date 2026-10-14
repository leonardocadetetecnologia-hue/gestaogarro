#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! docker image inspect garro-app:previous >/dev/null 2>&1; then
  echo "Não existe a imagem garro-app:previous. O rollback da aplicação não está disponível." >&2
  exit 1
fi

echo "Voltando a aplicação para garro-app:previous."
echo "O schema do PostgreSQL não é revertido por este script."
docker tag garro-app:previous garro-app:current
docker compose up -d --no-build --wait app caddy
echo "Aplicação anterior no ar. Se a migration nova for incompatível, restaure o backup feito antes dela."
