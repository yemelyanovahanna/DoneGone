#!/usr/bin/env bash
# Run this script yourself in macOS Terminal to collect genuine console screenshots.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
OUT="$ROOT/docs/lab5/screenshots/terminal"
mkdir -p "$OUT"
TF="${TF_BIN:-terraform}"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
WINDOW_ID="$(osascript -e 'tell application "Terminal" to id of front window')"
capture() {
  printf '\nScreenshot: %s\n' "$1"
  sleep 2
  screencapture -x -l "$WINDOW_ID" "$OUT/$1.png"
}
start() { clear; printf '%s\n\n' "$1"; }
start 'ЛР5 — встановлені інструменти'
sw_vers
uname -m
docker --version
"$TF" version | head -n 2
helm version --short
kubectl version
capture 01-versions
start 'ЛР5 — Vault і файл секрету в поді'
printf '%s\n' '$ kubectl get pods -n lr5'
kubectl get pods -n lr5
printf '\n%s\n' '$ kubectl exec ... vault kv get secret/myapp/config'
# Show only the deliberately public teaching secret, never arbitrary real Vault values.
kubectl exec -n lr5 vault-0 -- sh -ec 'export VAULT_TOKEN=root VAULT_ADDR=http://127.0.0.1:8200; test "$(vault kv get -field=password secret/myapp/config)" = lr5-demo-only; vault kv get -field=username secret/myapp/config; echo; vault kv get -field=password secret/myapp/config; echo'
printf '\n%s\n' '$ kubectl exec -n lr5 deployment/myapp -c app -- cat /vault/secrets/config'
kubectl exec -n lr5 deployment/myapp -c app -- cat /vault/secrets/config
capture 02-vault-secret
start 'ЛР5 — автентифікація та впровадження Vault Agent'
printf '%s\n' '$ kubectl logs -n lr5 deployment/myapp -c vault-agent-init'
kubectl logs -n lr5 deployment/myapp -c vault-agent-init | grep -E 'authentication successful|rendered|template server|exiting' | tail -n 12
capture 03-vault-agent
start 'ЛР5 — перевірка конфігурацій Terraform без AWS'
for dir in basic environments/dev environments/prod backend-setup; do
  printf '\n$ terraform -chdir=labs/lr5/terraform/%s validate\n' "$dir"
  "$TF" -chdir="labs/lr5/terraform/$dir" validate -no-color
done
capture 04-terraform-validate
start 'ЛР5 — mock-плани без створення AWS-ресурсів'
for dir in environments/dev backend-setup; do
  printf '\n$ terraform -chdir=labs/lr5/terraform/%s test\n' "$dir"
  "$TF" -chdir="labs/lr5/terraform/$dir" test -no-color
done
capture 05-terraform-mock
start 'ЛР5 — локальні робочі простори Terraform'
printf '%s\n' '$ terraform -chdir=labs/lr5/terraform/workspaces workspace list'
"$TF" -chdir=labs/lr5/terraform/workspaces workspace list
printf '\nЗбережений журнал виконаних локальних apply/destroy:\n'
tail -n 11 docs/lab5/results/workspaces-local.txt
capture 06-workspaces
start 'DoneGone етап 4 — контейнери Terraform'
printf '%s\n' '$ docker ps --filter name=donegone-stage4'
docker ps --filter name=donegone-stage4 --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
printf '\n%s\n' '$ curl http://127.0.0.1:8085/api/ready'
curl -fsS http://127.0.0.1:8085/api/ready
printf '\n\n%s\n' '$ terraform -chdir=infra/local plan'
"$TF" -chdir=infra/local plan -var="docker_host=unix://$HOME/.docker/run/docker.sock" -no-color | tail -n 4
capture 07-local-infrastructure
start 'DoneGone етап 4 — Jest'
printf '%s\n' '$ npm test --prefix backend'
npm test --prefix backend 2>&1 | tail -n 13
capture 08-jest
start 'DoneGone етап 4 — Newman'
printf '%s\n' '$ API_BASE_URL=http://127.0.0.1:8085 npm run test:api'
API_BASE_URL=http://127.0.0.1:8085 npm run test:api | tail -n 23
capture 09-newman
printf '\nЗбережено справжні знімки Terminal у %s\n' "$OUT"
