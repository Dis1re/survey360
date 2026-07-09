# Survey360

Структура проекта:

```
survey360/
├── frontend/   # React + TypeScript (Vite)
└── WebApp/     # .NET API + SQLite
```

## Запуск локально

Нужны: .NET 10 SDK, Node.js 18+.

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
- Тест API: http://localhost:5173/surveys

### Проверка

1. Откройте http://localhost:5173 — главная страница с дизайном опросов.
2. Или вручную: http://localhost:5175/api/survey → `[]` (пустой массив, если нет данных).

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

### Добавить данные (записи, не структуру)

**1. Через API** (основной для MVP)

`POST /api/survey` в Swagger — создать черновик опроса.

**2. Seed при старте**

В `Program.cs` или отдельном классе — при первом запуске создаёте тестовых сотрудников и шаблон опроса (см. `BACKEND_STRUCTURE.md`).

**3. Вручную**

[DB Browser for SQLite](https://sqlitebrowser.org/) — открыть `WebApp/survey.db` и смотреть/править данные. Для разработки ок, в проде — нет.
