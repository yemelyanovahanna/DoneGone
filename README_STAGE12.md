# DoneGone — Stage 1 Expanded

Реалізовано:
- реєстрацію та авторизацію;
- CRUD проєктів;
- Kanban-дошку;
- CRUD завдань;
- priority, due date, assignee;
- запрошення зареєстрованих користувачів до проєкту;
- командний доступ;
- статистику Active / Done / Overdue;
- PostgreSQL;
- Jest/Supertest;
- Jenkinsfile з Checkout → Install → Lint → Unit Tests.

## Запуск PostgreSQL

```bash
createdb donegone
psql -d donegone -f database/init.sql
```

Якщо стара база вже існує, для лабораторної найпростіше створити її заново:

```bash
dropdb donegone
createdb donegone
psql -d donegone -f database/init.sql
```

## Backend

```bash
cd backend
cp .env.example .env
npm install
npm test
npm run lint
npm start
```

## Frontend

В іншому Terminal:

```bash
cd frontend
npm install
npm run lint
npm run dev
```

Відкрити: http://localhost:5173

## Перевірка командної роботи

1. Зареєструвати користувача A.
2. Створити проєкт.
3. Вийти та зареєструвати користувача B.
4. Знову увійти як A.
5. Запросити B через поле `Invite user by email`.
6. Створити або відредагувати задачу і вибрати B як Assignee.
Webhook test Fri Oct  2 00:34:30 EEST 2026
