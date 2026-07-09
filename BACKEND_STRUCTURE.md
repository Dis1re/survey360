
ebApp/
├── Areas/Api/          ← REST API (JSON) — сюда пишем SurveysController
├── Models/             ← EF-сущности (Surveys, Questions, ...)
├── Data/               ← ApplicationDbContext (DAL)
├── Migrations/         ← схема БД
├── Program.cs          ← DI, CORS, миграции, MapControllers
└── Services/           ← только демо DI, не бизнес-логика

Areas/Api/XxxController.cs  ←  HTTP-эндпоинты
ApplicationDbContext  ←  Чтение/запись в SQLite
Models/  ←  C#-классы = таблицы
