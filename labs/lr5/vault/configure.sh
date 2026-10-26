#!/usr/bin/env bash
set -euo pipefail
NS=lr5
# Dev Vault is educational and stores secrets in memory. Never use real credentials here.
kubectl exec -n "$NS" vault-0 -- sh -ec '
export VAULT_ADDR=http://127.0.0.1:8200
export VAULT_TOKEN=root
# Dev mode already mounts secret/ as KV v2; do not enable it a second time.
vault kv put secret/myapp/config username=lab-admin password=lr5-demo-only >/dev/null
vault auth list -format=json | grep -q '\''"kubernetes/"'\'' || vault auth enable kubernetes
vault write auth/kubernetes/config kubernetes_host="https://${KUBERNETES_SERVICE_HOST}:${KUBERNETES_SERVICE_PORT}" >/dev/null
'
cat "$(dirname "$0")/myapp-policy.hcl" | kubectl exec -i -n "$NS" vault-0 -- sh -ec 'export VAULT_ADDR=http://127.0.0.1:8200 VAULT_TOKEN=root; vault policy write myapp-policy -'
kubectl exec -n "$NS" vault-0 -- sh -ec 'export VAULT_ADDR=http://127.0.0.1:8200 VAULT_TOKEN=root; vault write auth/kubernetes/role/myapp bound_service_account_names=myapp-sa bound_service_account_namespaces=lr5 policies=myapp-policy ttl=1h >/dev/null'
kubectl apply -f "$(dirname "$0")/myapp.yaml"
kubectl rollout status -n "$NS" deployment/myapp --timeout=240s
