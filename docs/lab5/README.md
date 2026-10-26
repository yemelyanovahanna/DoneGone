# Лабораторна робота 5 та DoneGone етап 4

## Виконано локально

- Vault у Kubernetes через Helm, namespace `lr5`; KV v2, політика читання, Kubernetes auth, роль для `myapp-sa`, Vault Agent Injector та файл `/vault/secrets/config`.
- AWS-конфігурації базового EC2, модулів VPC/EC2 для dev і prod, S3 з versioning/encryption та DynamoDB з ключем LockID. `terraform init -backend=false`, `validate` та `test` з mock-провайдерами виконані без облікового запису AWS.
- Локальні workspaces dev/staging/prod: вибір параметрів t3.micro/t3.small/t3.medium через `terraform_data`; apply/destroy виконано лише для локального ресурсу даних.
- DoneGone: endpoint `/metrics`, лічильник HTTP-запитів, histogram часу відповіді, розподіл статусів, CPU/RAM процесу Node.js, Prometheus, HTTP probe через Blackbox Exporter та Grafana з provisioned dashboard.
- Terraform створює окремі Docker network, три volumes та шість контейнерів (PostgreSQL, backend, frontend, Prometheus, Grafana, Blackbox).
- Дані попередніх етапів не змінюються. Новий PostgreSQL volume `donegone-stage4-postgres` незалежний від попередніх.

## Межі варіанта без AWS

Реальні EC2/VPC/S3/DynamoDB не створювалися; публічна EC2 IP-адреса не отримувалася. S3 backend не ініціалізовано і блокування DynamoDB не перевірено на AWS. Файли `*.tf.example` є шаблонами для майбутнього запуску з реальними ресурсами. Mock plan — перевірка конфігурації із симуляцією провайдера, а не доказ створення хмарної інфраструктури. Workspaces перевірено з локальним state, не з S3.

## Що встановлено

Terraform 1.17.0 darwin_arm64 встановлено локально; `terraform` доступний через `/opt/homebrew/bin/terraform`. Docker Desktop, Minikube, kubectl і Helm вже були встановлені. Vault, Prometheus, Grafana і Blackbox працюють у контейнерах; встановлювати їх окремими програмами macOS не потрібно. Ansible, Vagrant та VirtualBox для цієї роботи не потрібні.

## Запуск DoneGone

```bash
cd /Users/yemelyaa/Downloads/DoneGone-stage12
bash scripts/stage4-up.sh
```

Скрипт збирає образи CLI Docker BuildKit, ініціалізує Terraform і показує план для підтвердження. Перед `apply` можна окремо виконати:

```bash
terraform -chdir=infra/local plan -var="docker_host=unix://$HOME/.docker/run/docker.sock"
```

Адреси: застосунок http://127.0.0.1:8085, Prometheus http://127.0.0.1:9095/targets, Grafana http://127.0.0.1:3005/d/donegone-stage4.

Grafana: користувач `admin`. Пароль згенерований Terraform; отримати локально:

```bash
terraform -chdir=infra/local output -raw grafana_password
```

Не додавайте цей пароль, `*.tfstate`, `*.tfplan`, `.terraform/` чи секретні tfvars до Git. Terraform `sensitive` приховує пароль у звичайному виводі, проте пароль зберігається у локальному state. `/metrics` доступний лише у внутрішній Docker-мережі; Nginx frontend його не проксіює.

## Перевірки

```bash
npm ci --prefix backend
npm test --prefix backend
npm run lint --prefix backend
npm ci
API_BASE_URL=http://127.0.0.1:8085 npm run test:api
curl http://127.0.0.1:8085/api/ready
terraform -chdir=infra/local plan -var="docker_host=unix://$HOME/.docker/run/docker.sock"
```

Jest: 6 тестів у 3 наборах; Newman: 30 запитів, 87 перевірок, 0 помилок. Повторний план Terraform: No changes. Прометеївські HTTP 4xx включають очікувані негативні API-тести, а не лише збої сервера. Процесні CPU/RAM — метрики Node.js, а не сумарні ресурси всіх контейнерів.

## Загальна частина

```bash
minikube start --profile=devops-lr4
helm repo add hashicorp https://helm.releases.hashicorp.com
helm upgrade --install vault hashicorp/vault -n lr5 --create-namespace --set server.dev.enabled=true --set injector.enabled=true --wait
kubectl wait -n lr5 --for=condition=Ready pod/vault-0 --timeout=240s
bash labs/lr5/vault/configure.sh
kubectl get pods -n lr5
kubectl exec -n lr5 deployment/myapp -c app -- cat /vault/secrets/config
```

Секрет у прикладі є виключно навчальним. Dev Vault вже має `secret/` KV v2; повторне ввімкнення того самого шляху не потрібне. Root token dev-режиму не призначений для production. У звіті не відображаються реальні credentials.

AWS-приклади знаходяться у `labs/lr5/terraform`. У кожному кореневому каталозі:

```bash
terraform init -backend=false
terraform validate
terraform test
```

`test` застосовується до basic, environments/dev, environments/prod, backend-setup. У workspaces використовується локальна демонстрація, описана у звіті. Для AWS не використовуйте фіктивні ключі та не представляйте mock-результат як справжній `apply`.

## Зупинка і очищення

Щоб лише вимкнути нові контейнери зі збереженням даних:

```bash
docker stop donegone-stage4-frontend donegone-stage4-backend donegone-stage4-db donegone-stage4-prometheus donegone-stage4-grafana donegone-stage4-blackbox
minikube stop --profile=devops-lr4
```

Щоб видалити виключно навчальне середовище stage4 разом із його новими volumes:

```bash
bash scripts/stage4-down.sh
```

Скрипт просить стандартне підтвердження Terraform. Він не керує контейнерами/томами stage12 або donegone-postman. Навчальний Vault прибирається окремо: `helm uninstall vault -n lr5`, потім `kubectl delete -f labs/lr5/vault/myapp.yaml`. Після зупинки pod Vault dev його секрети потрібно налаштувати повторно.
