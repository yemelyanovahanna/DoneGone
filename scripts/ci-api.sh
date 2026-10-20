#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export CI_DB_PASSWORD="$(node -e 'process.stdout.write(require("crypto").randomBytes(24).toString("hex"))')"
export CI_JWT_SECRET="$(node -e 'process.stdout.write(require("crypto").randomBytes(32).toString("hex"))')"
export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-donegone-api-$(date +%s)-$$}"
COMPOSE=(docker compose -f docker-compose.ci.yml)
mkdir -p reports
rm -f reports/gate-passed.txt reports/newman.xml reports/summary.json
cleanup() {
  local result=$?
  trap - EXIT
  "${COMPOSE[@]}" logs --no-color > reports/compose.log 2>&1 || true
  "${COMPOSE[@]}" down -v --remove-orphans >> reports/compose.log 2>&1 || true
  exit "$result"
}
trap cleanup EXIT
"${COMPOSE[@]}" up -d --wait --wait-timeout 180
FRONTEND_ADDRESS="$("${COMPOSE[@]}" port frontend 80)"
export API_BASE_URL="http://${FRONTEND_ADDRESS}"
ready=0
for attempt in $(seq 1 60); do
  if curl --silent --fail --max-time 3 "$API_BASE_URL/api/ready" >/dev/null; then ready=1; break; fi
  sleep 1
done
if [[ "$ready" != 1 ]]; then echo 'Backend did not become ready'; exit 1; fi
printf 'Testing DoneGone through Nginx at %s\n' "$API_BASE_URL"
npm run test:api
