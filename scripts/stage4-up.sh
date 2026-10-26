#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
TF="${TF_BIN:-terraform}"
SOCKET="${DOCKER_SOCKET:-$HOME/.docker/run/docker.sock}"
if [[ ! -S "$SOCKET" ]]; then echo "Start Docker Desktop; missing socket: $SOCKET"; exit 1; fi
docker info >/dev/null
docker build -t donegone-backend:stage4 ./backend
docker build -t donegone-frontend:stage4 ./frontend
"$TF" -chdir=infra/local init
"$TF" -chdir=infra/local apply -var="docker_host=unix://$SOCKET"
