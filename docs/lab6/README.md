# ЛР6 Ansible та DoneGone етап 5

## Загальна частина

Керуючий вузол — macOS arm64 з ansible-core в окремому Python venv. Цільові вузли — три ізольовані Ubuntu 24.04 контейнери, доступні по SSH: web1 (22261), web2 (22262), db1 (22263). Це навчальні Linux-контейнери зі службою nginx через SysV/service, без systemd. macOS не змінюється плейбуками apt/user.

```bash
cd labs/lr6/ansible
mkdir -p .local-ssh
ssh-keygen -t ed25519 -N '' -f .local-ssh/id_ed25519 -C donegone-lr6-lab
docker compose build web1
docker compose up -d --no-build
ansible all -m ping
ansible-playbook webserver.yml --syntax-check
ansible-playbook webserver.yml --check
ansible-playbook webserver.yml
ansible-playbook playbook.yml --syntax-check
ansible-playbook playbook.yml --check
ansible-playbook playbook.yml
ansible-playbook site.yml --syntax-check
ansible-playbook site.yml --check
ansible-playbook site.yml
ansible-playbook advanced.yml --check
ansible-playbook advanced.yml
ansible-playbook playbook.yml
ansible-playbook site.yml
ansible-playbook advanced.yml
curl -H 'Host: lr6.local' http://127.0.0.1:18061
curl -H 'Host: lr6.local' http://127.0.0.1:18062
```

SSH-ключ приватний і виключений з Git. Повторно генерувати наявний ключ не потрібно. Початковий dry run в чистому образі потребує індексу apt; під час виконання індекс попередньо оновлено. Валідація шаблону відбувається до заміни конфігурації через helper nginx-site-check. Посилання у check-mode дозволено планувати до фактичного створення конфігурації. На реальному apply спочатку успішно записується перевірений template, а потім створюється посилання.

Локальна перевірка виконується всередині Ubuntu web1:

```bash
docker compose exec -T -e ANSIBLE_LOCAL_TEMP=/tmp/lr6-ansible -w /lab web1 ansible-playbook -i inventory-local.ini playbook.yml --connection=local
```

Inventory-local включає localhost до webservers. На macOS локальні apt/user playbooks не запускаються. RedHat-гілка присутня в коді й перевірено її skipping на Ubuntu; фактичне застосування до RedHat не виконувалося.

## Етап 5

Jenkinsfile виконує Checkout, перевірку tracked credentials, встановлення залежностей, lint, Jest, Docker build, окремий Compose+Newman запуск, gate, публікацію протестованих образів у GHCR та розгортання цих образів через Docker Compose. Невдала API-перевірка блокує публікацію й deployment.

Образи мають окремий тег stage5-BUILD_NUMBER-COMMIT; попередні теги latest не перезаписуються. Перевірка manifest підтверджує доступність тега після push. Тимчасовий Docker auth-каталог видаляється trap-обробником. Токен передається через stdin, shell tracing для секретів вимкнено.

Jenkins Credentials:

- ghcr-credentials — username/password; password містить GitHub PAT із правом write:packages.
- donegone-ci-db-password та donegone-ci-jwt-secret — Secret text для ізольованого API-тестування.
- donegone-stage5-db-password та donegone-stage5-jwt-secret — Secret text для окремого stage5 deployment (48/64 або більше hex-символів відповідно).

Для CI-перевірки використовується docker-compose.ci.yml, нова мережа й новий тестовий том. Після тесту вони видаляються. Для deployment використовується docker-compose.stage5.yml та окремий постійний том. Програма доступна на http://127.0.0.1:8086.

Приватний локальний файл .local-stage5/.env створюється з Jenkins Credentials з правами 600. Він виключений із Git і архівів Jenkins. Кореневий локальний .env також ігнорується; .env.example містить тільки зразок імен змінних. Credentials Jenkins зберігаються поза репозиторієм. Локальний Docker та його адміністратор мають доступ до середовища контейнерів; збереження credentials не приховує їх від адміністратора вузла.

Параметри PUBLISH_IMAGES і DEPLOY_APP дозволяють перевіряти конвеєр частково. SUCCESS із вимкненою публікацією не є підтвердженням GHCR. VERIFY_FAILURE_GATE навмисно очікує HTTP 201 замість 200 для перевірки блокування наступних стадій.

Для локального створення .env попередніх етапів використовується .env.example; наявні .env і томи попередніх етапів не змінюються.
