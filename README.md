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

- API: http://localhost:5175
- Swagger: http://localhost:5175/swagger

Для локальной разработки с Vite используйте **HTTP**-профиль (прокси frontend смотрит на `http://localhost:5175`).

HTTPS (опционально):

```bash
dotnet run --launch-profile https
# https://localhost:7126 и http://localhost:5175
```

Миграции БД применяются автоматически при старте. SQLite-файл: `WebApp/survay.db`.

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

### Проверка

1. Откройте http://localhost:5173 — должно быть «Connected».
2. Или вручную: http://localhost:5175/api/entities → `[]` (пустой массив, если нет данных).

## Сборка

```bash
# frontend
cd frontend && npm run build

# backend
cd WebApp && dotnet build
```
