#!/usr/bin/env bash
set -euo pipefail
set +x
cd "$(dirname "$0")/.."
: "${STAGE5_DB_PASSWORD:?Jenkins credential required}"
: "${STAGE5_JWT_SECRET:?Jenkins credential required}"
: "${IMAGE_TAG:?Image tag required}"
# Values generated for this pipeline are hex strings, safe for URL/env use.
[[ "$STAGE5_DB_PASSWORD" =~ ^[a-f0-9]{48,}$ ]] || { echo 'DB secret must be at least 48 hex characters'; exit 1; }
[[ "$STAGE5_JWT_SECRET" =~ ^[a-f0-9]{64,}$ ]] || { echo 'JWT secret must be at least 64 hex characters'; exit 1; }
umask 077
mkdir -p .local-stage5
export STAGE5_BACKEND_IMAGE="ghcr.io/${GHCR_NAMESPACE:-yemelyanovahanna}/donegone-backend:$IMAGE_TAG"
export STAGE5_FRONTEND_IMAGE="ghcr.io/${GHCR_NAMESPACE:-yemelyanovahanna}/donegone-frontend:$IMAGE_TAG"
# Private local file, excluded from Git and build artifacts.
printf 'STAGE5_DB_PASSWORD=%s\nSTAGE5_JWT_SECRET=%s\nSTAGE5_BACKEND_IMAGE=%s\nSTAGE5_FRONTEND_IMAGE=%s\n' \
 "$STAGE5_DB_PASSWORD" "$STAGE5_JWT_SECRET" "$STAGE5_BACKEND_IMAGE" "$STAGE5_FRONTEND_IMAGE" > .local-stage5/.env
# The exact images were pushed and verified by the preceding stage.
docker compose --env-file .local-stage5/.env -f docker-compose.stage5.yml up -d --wait --wait-timeout 180
ready=0
for attempt in $(seq 1 60); do
 if curl -fsS --max-time 3 http://127.0.0.1:8086/api/ready >/dev/null; then ready=1; break; fi
 sleep 1
done
[[ "$ready" == 1 ]] || { echo 'Stage 5 readiness failed'; exit 1; }
mkdir -p reports
printf 'DoneGone stage 5 ready: http://127.0.0.1:8086\n' | tee reports/deployment.txt
