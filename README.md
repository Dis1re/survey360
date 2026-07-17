# Survey360

Структура проекта:

```
survey360/
├── frontend/   # React + TypeScript (Vite)
└── WebApp/     # .NET API + SQLite
```

## Запуск локально

Нужны: .NET 10 SDK, Node.js 20+.

Все команды ниже — из корня `survey360/`. Нужны **два терминала**.

### 1. Backend (терминал 1)

```bash
cd WebApp
dotnet run --launch-profile http
```

или

```bash
dotnet watch run --launch-profile http
```

(сервер пересобирается автоматически при изменении .cs файлов)

- API: http://localhost:5175
- Swagger: http://localhost:5175/swagger

Для локальной разработки с Vite используйте **HTTP**-профиль (прокси frontend смотрит на `http://localhost:5175`).

HTTPS (опционально):

```bash
dotnet run --launch-profile https
# https://localhost:7126 и http://localhost:5175
```

Миграции БД применяются автоматически при старте. SQLite-файл: `WebApp/survey.db`.

`dotnet-ef` нужен только если вы **создаёте** новые миграции:

```bash
dotnet tool install --global dotnet-ef   # один раз
dotnet ef migrations add <Имя>
```

### 2. Frontend (терминал 2)

```bash
cd frontend
npm install   # первый раз
npm run dev
```

- UI: http://localhost:5173
- Запросы к `/api/*` проксируются на backend (см. `frontend/vite.config.ts`)
- Тест API: кнопка «Тест API / БД» на главной странице редактора

### Проверка

1. Откройте http://localhost:5173 — главная страница с дизайном опросов.
2. Или вручную: http://localhost:5175/api/survey → `[]` (пустой массив, если нет данных).

## Настройка AI ( саммари опросов)

AI-анализ результатов опросов работает через OpenAI-совместимый API. Провайдер настраивается через `appsettings.json` или `dotnet user-secrets`.

### Поля конфигурации

| Поле | Описание | Примеры |
|------|----------|---------|
| `Enabled` | Включить/выключить AI | `true` / `false` |
| `ChatBaseUrl` | Базовый URL API | `https://api.openai.com` |
| `ChatEndpoint` | Путь к chat completions | `/v1/chat/completions` |
| `Model` | Название модели | `gpt-4o`, `GigaChat` |
| `AuthType` | Тип авторизации | `none`, `bearer`, `basic`, `oauth` |
| `ApiKey` | Ключ API (для bearer/basic) | `sk-...` |
| `OAuthBaseUrl` | URL OAuth (для oauth) | `https://ngw.devices.sberbank.ru:9443` |
| `ClientId` | Client ID (для oauth) | UUID |
| `ClientSecret` | Client Secret (для oauth) | UUID |
| `Scope` | OAuth scope (для oauth) | `GIGACHAT_API_PERS` |

### Примеры провайдеров

**GigaChat** (текущий):
```json
{
  "ChatBaseUrl": "https://gigachat.devices.sberbank.ru",
  "ChatEndpoint": "/api/v1/chat/completions",
  "Model": "GigaChat",
  "AuthType": "oauth",
  "OAuthBaseUrl": "https://ngw.devices.sberbank.ru:9443",
  "ClientId": "ваш-client-id",
  "ClientSecret": "ваш-client-secret",
  "Scope": "GIGACHAT_API_PERS"
}
```

**OpenAI / Azure / Groq** (bearer token):
```json
{
  "ChatBaseUrl": "https://api.openai.com",
  "ChatEndpoint": "/v1/chat/completions",
  "Model": "gpt-4o",
  "AuthType": "bearer",
  "ApiKey": "sk-..."
}
```

**локальное ИИ без авторизации**:
```json
{
  "ChatBaseUrl": "http://localhost:8080",
  "ChatEndpoint": "/chat/completions",
  "Model": "my-model",
  "AuthType": "none"
}
```

### Настройка через user-secrets

Секреты не коммитятся в git. Настройте через:

```bash
cd WebApp

# GigaChat
dotnet user-secrets set "AiSummary:ClientId" "ваш-client-id"
dotnet user-secrets set "AiSummary:ClientSecret" "ваш-client-secret"

# OpenAI
dotnet user-secrets set "AiSummary:ApiKey" "sk-..."

# Локальный ИИ
dotnet user-secrets set "AiSummary:ChatBaseUrl" "http://corporate-ai.internal:8080"
dotnet user-secrets set "AiSummary:Model" "my-model"
```

Не-секретные поля (`ChatBaseUrl`, `Model`, `AuthType`, `Enabled`) задаются в `appsettings.json`.

### SSL-сертификаты

Если AI-провайдер использует нестандартный SSL-сертификат (например, Russian Trusted Root CA для GigaChat), положите PEM-файл в `WebApp/russian_trusted_root_ca.pem`. Сервис автоматически подхватит его при `AuthType: "oauth"`.

**macOS:** .NET использует Apple Secure Transport, который отклоняет сертификаты GigaChat/Sber с ошибкой `bad certificate format` (кастомный CA-callback даже не вызывается). На macOS при oauth приложение автоматически ходит в GigaChat через `curl` + этот PEM. Нужен установленный `curl` в PATH.

## Сборка

```bash
# frontend
cd frontend && npm run build

# backend
cd WebApp && dotnet build
```

## База данных

Схема: **C#-класс** → `ApplicationDbContext` → **миграция** → `WebApp/survey.db`

### Добавить новую сущность (например, `Employee`)

**1. Создать класс в `Models/`**

```csharp
public class Employee
{
    public int Id { get; set; }
    public string FullName { get; set; } = "";
    public string Email { get; set; } = "";
}
```

**2. Зарегистрировать в `ApplicationDbContext`**

```csharp
public DbSet<Employee> Employees { get; set; }
```

Если нужны связи, уникальность email, индексы — настраиваете в `OnModelCreating`.

**3. Создать миграцию**

Из папки `WebApp/`:

```bash
dotnet ef migrations add AddEmployees
```

EF сравнит модели с текущей БД и сгенерирует файл в `Migrations/`.

**4. Применить миграцию**

Вариант A — просто запустить backend:

```bash
dotnet run
```

Вариант B — вручную:

```bash
dotnet ef database update
```

В `survey.db` появится таблица `Employees`.

**5. Сделать API**

Контроллер по образцу `Areas/Api/SurveyController.cs` — CRUD через `ApplicationDbContext`.

### Изменить структуру существующей таблицы

| Что меняете | Что делаете |
|-------------|-------------|
| Новое поле | Добавляете свойство в класс → `dotnet ef migrations add ...` |
| Связь 1-N | Navigation properties + `OnModelCreating` → миграция |
| Уникальный email | `modelBuilder.Entity<Employee>().HasIndex(e => e.Email).IsUnique()` |
| Переименование поля | Меняете в классе → миграция (иногда EF не угадает — смотрите сгенерированный файл) |
| Удаление таблицы | Убираете `DbSet` и класс → миграция с `DropTable` |

> **Важно:** не правьте `survey.db` руками и не удаляйте старые миграции.  
> Меняете код → новая миграция → применяете.

## Документация

- [`api.md`](api.md) — полное описание REST-эндпоинтов с примерами запросов и ответов.
- [`db.md`](db.md) — схема базы данных (таблицы, колонки, связи).

### Добавить данные (записи, не структуру)

**1. Через API** (основной для MVP)

`POST /api/survey` в Swagger — создать черновик опроса.

**2. Seed при старте**

В `Program.cs` или отдельном классе — при первом запуске создаёте тестовых сотрудников и шаблон опроса.

**3. Вручную**

[DB Browser for SQLite](https://sqlitebrowser.org/) — открыть `WebApp/survey.db` и смотреть/править данные. Для разработки ок, в проде — нет.
