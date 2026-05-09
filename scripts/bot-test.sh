#!/usr/bin/env bash
# Replay bot fixtures against the local webhook.
#
# Setup:
#   1. Run `npm run dev` in another terminal
#   2. Add to .env.local:
#        TELEGRAM_BOT_WEBHOOK_SECRET=local-test-secret
#        BOT_USERNAME=QuantumClubDev_bot
#   3. ./scripts/bot-test.sh                 # runs all fixtures
#      ./scripts/bot-test.sh price-ton       # runs one fixture by name
#
# Reads $WEBHOOK_URL (default http://localhost:3000/api/bot/webhook)
# and $TELEGRAM_BOT_WEBHOOK_SECRET (default local-test-secret).

set -euo pipefail

URL="${WEBHOOK_URL:-http://localhost:3000/api/bot/webhook}"
SECRET="${TELEGRAM_BOT_WEBHOOK_SECRET:-local-test-secret}"
DIR="$(cd "$(dirname "$0")/bot-fixtures" && pwd)"

run_fixture() {
  local name="$1"
  local file="$DIR/$name.json"
  if [[ ! -f "$file" ]]; then
    echo "✗ fixture not found: $file" >&2
    return 1
  fi
  echo "──── $name ────"
  curl -sS -X POST "$URL" \
    -H "X-Telegram-Bot-Api-Secret-Token: $SECRET" \
    -H "content-type: application/json" \
    --data-binary "@$file" \
    -w "\nHTTP %{http_code}  ·  %{time_total}s\n"
  echo
}

if [[ $# -gt 0 ]]; then
  run_fixture "$1"
else
  for f in "$DIR"/*.json; do
    name="$(basename "$f" .json)"
    run_fixture "$name"
  done
fi
