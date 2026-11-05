#!/usr/bin/env bash
set -euo pipefail
set +x
: "${GHCR_USER:?Jenkins username credential required}"
: "${GHCR_TOKEN:?Jenkins token credential required}"
: "${IMAGE_TAG:?Image tag required}"
REGISTRY=ghcr.io
GHCR_NAMESPACE=${GHCR_NAMESPACE:-yemelyanovahanna}
# Disposable Docker auth directory: never alter the user's docker login.
auth_dir=$(mktemp -d)
umask 077
printf '%s\n' '{"auths":{"ghcr.io":{}}}' > "$auth_dir/config.json"
export DOCKER_CONFIG="$auth_dir"
cleanup() { docker logout "$REGISTRY" >/dev/null 2>&1 || true; rm -rf "$auth_dir"; }
trap cleanup EXIT
printf '%s' "$GHCR_TOKEN" | docker login "$REGISTRY" -u "$GHCR_USER" --password-stdin
mkdir -p reports
: > reports/published-images.txt
for component in backend frontend; do
  remote="$REGISTRY/$GHCR_NAMESPACE/donegone-$component:$IMAGE_TAG"
  docker tag "donegone-$component:$IMAGE_TAG" "$remote"
  docker push "$remote"
  # Verify that the immutable build tag can be resolved in the registry.
  docker manifest inspect "$remote" >/dev/null
  printf '%s\n' "$remote" >> reports/published-images.txt
done
