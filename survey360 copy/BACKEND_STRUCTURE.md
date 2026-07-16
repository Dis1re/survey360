# Как устроен backend Survey360

Backend — это ASP.NET Core-приложение в папке `WebApp/`. Оно хранит данные в SQLite, отдаёт REST API в JSON и обслуживает frontend (React).

## Общая схема работы

```
Браузер (React, :5173)
        │
        │  fetch('/api/survey')
        ▼
Vite dev-server (прокси /api → :5175)
        │
        ▼
ASP.NET Core (WebApp, :5175)
        │
        ├── Controller  — принимает HTTP-запрос, проверяет данные
        │
        ├── ApplicationDbContext  — «мост» к базе через Entity Framework
        │
        └── SQLite (WebApp/survey.db)
```

**Простыми словами:** frontend не ходит в базу напрямую. Он шлёт HTTP-запросы на `/api/...`. Backend читает или пишет данные в SQLite и возвращает JSON.

При старте backend **сам применяет миграции** — файл `survey.db` создаётся и обновляется без ручных команд (см. `Program.cs`).

---

## Структура папок

```
WebApp/
├── Areas/Api/           ← REST-контроллеры (точки входа API)
│   ├── SurveyController.cs
│   ├── UserController.cs
│   ├── QuestionController.cs
│   ├── AnswerController.cs
│   ├── DatabaseController.cs
│   ├── SettingsController.cs   ← демо чтения appsettings
│   └── ServicesController.cs     ← демо DI, не бизнес-логика
│
├── Models/              ← C#-классы = таблицы в БД
│   ├── Survey.cs
│   ├── Question.cs
│   ├── Answer.cs
│   ├── User.cs
│   ├── SurveyAssignment.cs
│   └── SurveyParticipant.cs
│
├── Data/
│   └── ApplicationDbContext.cs   ← доступ к БД, связи между таблицами
│
├── Migrations/          ← история изменений схемы БД (генерирует EF)
├── Services/            ← только демо времени жизни DI (Transient/Scoped/Singleton)
├── Program.cs           ← запуск: DI, CORS, миграции, маршруты
└── survey.db            ← файл SQLite (создаётся при первом запуске)
```

| Папка / файл | Зачем нужен |
|--------------|-------------|
| `Areas/Api/*Controller.cs` | Один контроллер ≈ одна сущность. Здесь HTTP-методы: GET, POST, PUT, DELETE. |
| `Models/` | Описание данных: какие поля у опроса, вопроса, пользователя. |
| `ApplicationDbContext` | Регистрирует таблицы (`DbSet<>`) и правила связей (FK, каскадное удаление). |
| `Migrations/` | Версии схемы БД. Меняете модель → `dotnet ef migrations add` → при следующем запуске схема обновится. |
| `Program.cs` | «Точка входа»: подключение SQLite, CORS для localhost:5173, Swagger в Development. |

---

## Как устроен один запрос (пример)

**Сценарий:** пользователь нажимает «Создать опрос» на frontend.

1. React вызывает `POST /api/survey` (см. `frontend/src/api.ts`).
2. Vite проксирует запрос на `http://localhost:5175/api/survey`.
3. `SurveyController.Create` создаёт объект `Survey` со статусом «Черновик» и сохраняет через `context.SaveChangesAsync()`.
4. Backend возвращает **число** — `id` нового опроса (не JSON-объект).
5. Frontend может сразу открыть страницу опроса по этому id.

Тот же принцип для вопросов, пользователей, матрицы назначений: **Controller → DbContext → SQLite → ответ**.

---

## Основные сущности и зачем они нужны

Survey360 — опрос **360°**: сотрудники оценивают друг друга по матрице «кто кого оценивает».

| Сущность | Роль |
|----------|------|
| **Survey** | Опрос: название, описание, статус (Черновик / Активный / …), даты. |
| **Question** | Вопрос внутри опроса (текст + тип: rating, text и т.д.). |
| **User** | Участник системы (имя, email). |
| **SurveyParticipant** | Кто участвует в **конкретном** опросе: роль «оцениваемый» (target) и/или «оценивающий» (respondent). |
| **SurveyAssignment** | Ячейка матрицы: respondent X оценивает target Y (`isAssigned`, `isCompleted`). |
| **Answer** | Ответ пользователя на вопрос (пока базовый CRUD, без привязки к паре reviewer–target). |

**SurveyParticipant** и **SurveyAssignment** разделены намеренно:

- Участники — «кто вообще в опросе и в какой роли».
- Назначения — «какие пары reviewer→target включены в матрицу» (галочки в таблице на UI).

---

## Контроллеры и ответственность

| Контроллер | Что делает |
|------------|------------|
| `SurveyController` | CRUD опросов, полная карточка (`GET /{id}`), матрица, участники, сохранение назначений |
| `UserController` | Список, создание, получение по id |
| `QuestionController` | CRUD вопросов (создание привязано к `surveyId`) |
| `AnswerController` | Создание и чтение ответов |
| `DatabaseController` | `DELETE /api/database` — очистка всей БД **только в Development** |
| `SettingsController` | Читает секцию `MySettings` из конфига (демо) |
| `ServicesController` | Демо Transient / Scoped / Singleton (учебный пример DI) |

Бизнес-логика сейчас **в контроллерах**, отдельного слоя `Services/` для опросов нет — это осознанно для MVP.

---

## База данных и миграции

- **СУБД:** SQLite, файл `WebApp/survey.db`.
- **ORM:** Entity Framework Core.
- **Связь код ↔ БД:** класс в `Models/` → `DbSet` в `ApplicationDbContext` → миграция → таблица.

При удалении опроса каскадом удаляются связанные вопросы, участники, назначения (настроено в миграциях). Ответы на вопросы удаляются при удалении вопроса.

Подробная схема таблиц: [`db.md`](db.md).

---

## Конфигурация и окружение

**`Program.cs`:**

- `AddDbContextPool<ApplicationDbContext>` — пул подключений к SQLite.
- `AddCors` — разрешён origin `http://localhost:5173` (Vite).
- При старте: `db.Database.MigrateAsync()` — автоприменение миграций.
- В Development: Swagger UI на `/swagger`.

**Порты:**

| Сервис | URL |
|--------|-----|
| Backend (HTTP) | http://localhost:5175 |
| Frontend (Vite) | http://localhost:5173 |
| Swagger | http://localhost:5175/swagger |

**Строка подключения** — в `appsettings.json`, ключ `ConnectionStrings:SqliteConnection`.

---

## Формат JSON

ASP.NET по умолчанию сериализует свойства в **camelCase** (`createdAt`, `surveyId`), хотя в C# они PascalCase (`CreatedAt`, `SurveyId`). Frontend может использовать те же имена, что в TypeScript-типах (`frontend/src/types.ts`).

Некоторые эндпоинты возвращают **голое число** (id после POST), а не объект — это нормально для текущего API.

---

## Как добавить новую возможность

1. **Модель** — класс в `Models/`.
2. **DbContext** — `DbSet<>` + при необходимости связи в `OnModelCreating`.
3. **Миграция** — `dotnet ef migrations add ИмяИзменения` из папки `WebApp/`.
4. **Контроллер** — `Areas/Api/XxxController.cs` по образцу существующих.
5. **Frontend** — методы в `frontend/src/api.ts` и типы в `types.ts`.

Полный список эндпoинтов с примерами: [`api.md`](api.md).

---

## Что пока не реализовано

- Аутентификация и авторизация (все эндпoинты открыты).
- Отдельный сервисный слой и валидация через FluentValidation.
- Production-конфиг (HTTPS, другая БД) — локально используется SQLite и HTTP-профиль.

Это MVP для редактора опросов и матрицы назначений; архитектура рассчитана на постепенное усложнение без переписывания с нуля.
