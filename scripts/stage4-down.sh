#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
TF="${TF_BIN:-terraform}"
SOCKET="${DOCKER_SOCKET:-$HOME/.docker/run/docker.sock}"
echo 'Destroying only the separate stage4 environment, including its demonstration database.'
"$TF" -chdir=infra/local destroy -var="docker_host=unix://$SOCKET"
