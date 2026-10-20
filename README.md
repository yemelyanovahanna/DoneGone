# DoneGone Етап 3 Автоматизоване тестування REST API

Цей пакет відповідає етапу 3 на с. 11–12 файлу «Ємельянова DevOps КН41 ЛР1 нов.pdf».
Результат: Postman Collection, запуск через Newman і перевірена інтеграція в Jenkins із зупинкою подальших стадій у разі помилки.

## Перевірені результати

- 30 HTTP-запитів і 87 assertions — усі пройшли локально та в Jenkins.
- 4 unit-тести backend — пройшли; frontend production build і lint — успішні.
- Jenkins job `DoneGone-Stage3-API`, фінальний build #5 — SUCCESS.
- Build #4 — навмисна контрольна помилка: API повернув правильний HTTP 200, тест навмисно очікував 201. Newman завершився кодом 1, Jenkins пропустив `API Gate Passed` і `Push Docker Images`.
- Кожен CI-запуск створює окрему Docker Compose network, PostgreSQL volume та три контейнери. Після тестів ці тимчасові ресурси видаляються, включно з volume. Звичайний docker-compose.yml з етапу 2 та його дані не використовуються цим тестом.

## Файли

- `postman/DoneGone.postman_collection.json`: колекція формату v2.1 для імпорту в Postman;
- `postman/local.postman_environment.json`: локальне оточення, base_url;
- `scripts/run-newman.js`: CLI/JUnit-звіти та стислий JSON без JWT і паролів;
- `scripts/ci-api.sh`: ізольований Compose, очікування готовності, Newman, очищення;
- `docker-compose.ci.yml`: тестове середовище;
- `Jenkinsfile`: CI, Newman перед публікацією образів, fail-fast і архівування звітів;
- `package.json` та `package-lock.json`: зафіксована версія Newman 6.2.1;
- `evidence/`: справжні скріншоти, журнали й результати успішного та контрольного невдалого запусків.

## Відтворення на macOS

Потрібні Docker Desktop із Compose і Node.js/npm. Виконуйте команди з кореня розпакованого проєкту.

```bash
npm ci
docker build -t donegone-api-backend:stage3 ./backend
docker build -t donegone-api-frontend:stage3 ./frontend
bash scripts/ci-api.sh
```

Скрипт автоматично вибирає вільний порт localhost і встановлює `API_BASE_URL`, генерує окремі CI-секрети та очищує лише власний тестовий Compose-проєкт. Успішне завершення повертає код 0, помилка — код 1.

Для запуску проти вже запущеної навчальної копії DoneGone:

```bash
API_BASE_URL=http://127.0.0.1:8081 npm run test:api
```

Колекція створює унікальних тестових користувачів. Проєкт і завдання видаляються наприкінці успішного запуску, користувачі залишаються; тому колекцію слід запускати на тестовій базі. CI-база повністю видаляється після кожного запуску.

Еквівалентний виклик Newman напряму:

```bash
mkdir -p reports
npx --no-install newman run postman/DoneGone.postman_collection.json \
  -e postman/local.postman_environment.json \
  --bail --reporters cli,junit --reporter-junit-export reports/newman.xml
```

У Postman імпортуйте обидва JSON-файли, виберіть environment і запустіть Collection Runner. `base_url` можна змінити під локальну адресу. Реєстрація, токени та ID передаються між запитами автоматично, секрети користувачів не потрібні.

## Jenkins

Використовуйте тип Pipeline from SCM та доставлений `Jenkinsfile`. Агенту потрібні Node/npm, Docker Compose, curl і доступ до Docker daemon.

Стадії: Checkout → Install → Install Newman → Lint → Unit Tests → Docker Build → API Tests with Newman → API Gate Passed → Push Docker Images.

- `PUBLISH_IMAGES=true`: зберігає публікацію з етапу 2, потрібен наявний credential `ghcr-credentials`.
- `PUBLISH_IMAGES=false`: перевіряє локальний конвеєр без відправлення образів у реєстр.
- `VERIFY_FAILURE_GATE=false`: звичайний успішний сценарій.
- `VERIFY_FAILURE_GATE=true`: тільки демонстрація блокування; навмисно змінює очікуваний health status на 201.

Jenkins викликає shell-скрипт без придушення його ненульового коду виходу. JUnit і артефакти публікуються в post/always стадії тестування; падіння Newman не дозволяє перейти до наступних стадій.

Фактичну перевірку виконано в окремому локальному Jenkins 2.580.1 на http://127.0.0.1:8094/job/DoneGone-Stage3-API/. Для цього стенда checkout scm замінено копіюванням локального знімка коду, а PUBLISH_IMAGES=false. Доставлений Jenkinsfile зберігає checkout scm і підтримку GHCR. Власний Jenkins користувачки, GitHub webhook та наявні credentials не змінювалися. На GitHub цей пакет ще не переносився.

## Зміни backend

Додано `/ready` і `/api/ready`, які перевіряють доступність схеми PostgreSQL; liveness `/api/health` збережено. Асинхронні помилки маршрутів перехоплюються та повертають HTTP 503, замість завершення Node.js; idle-помилки пулу БД обробляються. Для цього додано регресійні Jest-тести.

## Документація

Вимоги й відповідність описані у `evidence/requirements-coverage.json`, текст для звіту — у `REPORT_SECTION_UA.md`. Нові файли підготовлено окремо, вихідна папка DoneGone-stage12 не змінена.

Офіційні довідки:
- https://learning.postman.com/docs/reference/newman-cli/newman-options
- https://www.jenkins.io/doc/pipeline/steps/workflow-durable-task-step/
- https://www.jenkins.io/doc/pipeline/tour/tests-and-artifacts/
