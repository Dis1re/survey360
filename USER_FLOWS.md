# Survey360 — Полная карта пользовательских сценариев

> Дата: 2026-07-17

---

## Содержание

1. [Роли в системе](#1-роли-в-системе)
2. [Цепочка 1: Администратор — начальная настройка](#2-цепочка-1-администратор--начальная-настройка)
3. [Цепочка 2: Создатель опроса — полный жизненный цикл](#3-цепочка-2-создатель-опроса--полный-жизненный-цикл)
4. [Цепочка 3: Респондент — прохождение опроса](#4-цепочка-3-респондент--прохождение-опроса)
5. [Цепочка 4: Шаблоны — создание и reuse](#5-цепочка-4-шаблоны--создание-и-reuse)
6. [Цепочка 5: Отчёты — DOCX / CSV / XLSX](#6-цепочка-5-отчёты--docx--csv--xlsx)
7. [Цепочка 6: AI-саммари](#7-цепочка-6-ai-саммари)
8. [Цепочка 7: Живые обновления (SignalR)](#8-цепочка-7-живые-обновления-signalr)
9. [Перекрёстные связи между цепочками](#9-перекрёстные-связи-между-цепочками)
10. [Полная карта маршрутов](#10-полная-карта-маршрутов)

---

## 1. Роли в системе

| Роль | Определяется | Права |
|------|-------------|-------|
| **Администратор** | `User.IsAdmin == true` | CRUD всех пользователей, групп, БД reset, доступ ко всем опросам |
| **Создатель опроса** | `Survey.CreatedByUserId == текущий` | Полный контроль над своим опросом: вопросы, матрица, аналитика, отчёты, AI |
| **Респондент** | `SurveyParticipant.IsRespondent == true` | Заполнение анкеты для назначенных целей. Не видит матрицу/аналитику |
| **Цель (оцениваемый)** | `SurveyParticipant.IsTarget == true` | Пассивная роль — его оценивают. Может видеть свои результаты в ResponseModal |
| **Любой авторизованный** | Есть валидная cookie/token | Просмотр списка опросов, создание новых опросов, вход |

---

## 2. Цепочка 1: Администратор — начальная настройка

```
START: Первый запуск приложения
  │
  ▼
Авто-миграция БД + бэкап PasswordHash
  │  Program.cs: db.Database.Migrate()
  │  Backfill: для User без PasswordHash → хэширует "123456"
  ▼
Открыть /?dev=1  →  DevRoutePage → автологин как Admin
  │
  ├──► Импорт CSV юзеров
  │      POST /api/user/import-csv
  │      Формат: Name;Email
  │      Дедупликация по email, дефолтный пароль: 123456
  │
  ├──► Создание User вручную
  │      POST /api/user
  │      { name, email, password } → BCrypt hash
  │
  ├──► Управление группами
  │      CRUD: /api/usergroup
  │
  └──► Очистка БД (если нужно)
         DELETE /api/database
         Только в Development. Удаляет всё.
```

### API детали

| Операция | Метод | Роут | Тело |
|----------|-------|------|------|
| Создать юзера | `POST` | `/api/user` | `{ name, email, password }` |
| Список юзеров | `GET` | `/api/user` | — |
| Импорт CSV | `POST` | `/api/user/import-csv` | `multipart/form-data` (файл .csv) |
| Экспорт CSV | `GET` | `/api/user/export-csv` | — |
| Создать группу | `POST` | `/api/usergroup` | `{ name, userIds[] }` |
| Список групп | `GET` | `/api/usergroup` | — |
| Очистить БД | `DELETE` | `/api/database` | — (dev only) |

---

## 3. Цепочка 2: Создатель опроса — полный жизненный цикл

```
START: Нажимает «+ Новый»
  │
  ▼
POST /api/survey  →  Черновик, Name: "Новый опрос"
  │
  ▼
MainPage → Вкладка «Вопросы» (Editor)
  │
  ├──► Добавить вопрос вручную
  │      POST /api/question
  │      { text, type, isRequired, props, surveyId }
  │
  ├──► Загрузить из шаблона
  │      POST /api/survey-template/{id}/create-survey
  │      Или: TemplatesModal → «Заменить» (replace все вопросы)
  │
  ├──► Заполнить название и описание
  │      PUT /api/survey/{id}
  │      { name, description }
  │
  └──► Настроить вопрос
         Текст, тип, обязательный, props (опции/min/max)
         │
         ▼
       Drag-and-drop reorder
         PUT /api/survey/{id}/questions/order
         Body: [{ id, order }, ...]
```

### Шаг: Вкладка «Матрица»

```
Вкладка «Матрица»
  │
  ├──► Добавить оцениваемых (targets)
  │      UserPickerModal → POST /api/survey/{id}/participants
  │      { userId, role: "target" }
  │
  ├──► Добавить респондентов (respondents)
  │      UserPickerModal → POST /api/survey/{id}/participants
  │      { userId, role: "respondent" }
  │
  ├──► Отметить пересечения в матрице
  │      Автосохранение (debounce 500ms)
  │      PUT /api/survey/{id}/assignments
  │      Body: { entries: [{ reviewerId, targetId, isAssigned }] }
  │      SignalR → SurveyUpdated всем клиентам
  │
  ├──► Отправка приглашений
  │      POST /api/survey/{id}/send-invites
  │      { reviewerId? } — опционально для одного
  │      ─ SurveyRespondentLinkService: синхронизация токенов
  │      ─ SurveyInviteEmailService: HTML письмо → Mailtrap
  │      ─ Параллельная отправка (Task.WhenAll)
  │
  └──► Активация опроса
         PUT /api/survey/{id} { status: "Активен" }
         Валидация:
           1. questions.length > 0
           2. targets.length > 0
           3. Есть хотя бы одна пара с isAssigned=true
         StartedAt = DateTime.UtcNow
         SignalR → SurveyUpdated
```

### Шаг: Завершение

```
Ожидание ответов
  │  Вкладка «Аналитика» — live-обновления через SignalR
  │  Прогресс: completed / assigned
  ▼
Все ответили → авто-завершение
  │  survey.Status → "Завершен"
  │  survey.ClosedAt = DateTime.UtcNow
  │  Фоновая задача: aiSummaryService.GenerateOverallAsync(id)
  ▼
Пост-завершение
  ├── Просмотр отчётов (DOCX/CSV/XLSX)
  ├── Генерация AI саммари (per-target, per-reviewer)
  ├── Дублирование опроса: POST /api/survey/{id}/duplicate
  └── Экспорт в шаблон: POST /api/survey/{id}/save-as-template
```

### Типы вопросов и Props

| Тип | Props формат | Пример answer.text |
|-----|-------------|-------------------|
| `text` | `null` | `"Отличный руководитель"` |
| `scale` | `{"min":1,"max":10}` | `"7"` |
| `radio` | `{"1":"Да","2":"Нет","3":"Затрудняюсь"}` | `"2"` |
| `checkboxes` | `{"1":"Лидерство","2":"Коммуникация","3":"Экспертиза"}` | `"1,3"` |
| `dropdown` | `{"1":"Отлично","2":"Хорошо","3":"Удовл."}` | `"2"` |
| `date` | `null` | `"2025-07-16"` (ISO) |
| `stars` | `{"maxStars":5}` | `"4"` |

### Сохранение ответов (answer upsert)

```
POST /api/answer
Body: { questionId, userId, targetId, text }

Логика:
1. Валидация: вопрос, user, target существуют
2. Поиск: Answer(QuestionId, UserId, TargetId) — уникальный индекс
3. Найден → UPDATE text
4. Не найден → INSERT новый Answer
```

---

## 4. Цепочка 3: Респондент — прохождение опроса

### 4.1 Вход по персональной ссылке

```
START: Открывает /survey/invite/{token}
  │
  ▼
GET /api/survey/invite/{token}
  │  Resolve token → { surveyId, reviewerId, reviewerEmail, targets[], surveyName }
  ▼
Есть cookie/token?
  ├── НЕТ → Редирект на LoginPage (с redirect обратно на invite/{token})
  │
  └── ДА → Email совпадает?
       ├── НЕТ → Предупреждение: «Вы вошли как другой пользователь»
       │         Кнопка: Войти заново
       │
       └── ДА → TakeSurvey, auto-locked reviewer
                │
                ├── Targets = 1 → автовыбор, сразу к вопросам
                │
                └── Targets > 1 → показать список для выбора
```

### 4.2 Заполнение анкеты

```
TakeSurvey
  │
  ▼
Шаг 1: Выбор респондента (reviewer)
  │  Если preview или auto-locked → пропуск
  ▼
Шаг 2: Выбор цели (target)
  │  Если один target → автовыбор
  ▼
Шаг 3: Анкета
  │  Все вопросы (QuestionInput компонент)
  │  Валидация:
  │    - Обязательные вопросы (isRequired)
  │    - Checkboxes min/max (minSelect, maxSelect)
  │  Черновик в localStorage (auto-save)
  ▼
POST /api/answer для каждого вопроса (upsert)
  │
  ▼
POST /api/survey/{id}/assignments/complete
  │  { reviewerId, targetId }
  │  Валидация: обязательные вопросы отвечены
  │  assignment.IsCompleted = true
  ▼
Все assignments завершены?
  ├── ДА → Авто-завершение опроса + AI саммари
  └── НЕТ → Страница «Спасибо» (с котиком)
```

### 4.3 Прямая ссылка (без invite token)

```
/survey/{id}?reviewer=X&target=Y
  → PublicSurveyPage → TakeSurvey
  → reviewer/target из URL params
  → Нет auto-lock (можно менять)
```

### 4.4 Preview mode

```
/survey/{id}?preview=1
  → TakeSurvey в режиме preview
  → Не отправляет ответы
  → Показывает как будет выглядеть
```

---

## 5. Цепочка 4: Шаблоны — создание и reuse

```
Вкладка «Вопросы» → кнопка «Шаблоны»
  │
  ▼
TemplatesModal (GET /api/survey-template)
  │
  ├──► «Добавить» (append)
  │      POST /api/survey-template/{id}/create-survey
  │      Клонирует шаблон → Survey + копирует вопросы
  │
  ├──► «Заменить» (replace)
  │      DELETE все текущие вопросы
  │      Затем POST create-survey
  │
  └──► «Сохранить как шаблон»
         POST /api/survey/{id}/save-as-template
         { name, description }
         Создаёт SurveyTemplate + копирует QuestionTemplates
```

### TemplateEditor (полный CRUD)

```
POST   /api/survey-template          — создать шаблон
GET    /api/survey-template          — список
GET    /api/survey-template/{id}     — шаблон + вопросы
PUT    /api/survey-template/{id}     — обновить имя/описание
DELETE /api/survey-template/{id}     — удалить

POST   /api/survey-template/{id}/questions              — добавить вопрос
PUT    /api/survey-template/{id}/questions/{questionId}  — обновить вопрос
DELETE /api/survey-template/{id}/questions/{questionId}  — удалить вопрос
```

---

## 6. Цепочка 5: Отчёты — DOCX / CSV / XLSX

```
Вкладка «Матрица» → кнопка «Экспорт»
  │
  ▼
Экспорт-меню:
  ├── DOCX (по целям)
  ├── DOCX (по вопросам)
  ├── CSV
  ├── XLSX
  └── «Сформировать результаты» (из ResponseModal, с фильтром)
  │
  ▼
GET /api/survey/{id}/report/info
  │  → { answerCount, assignedCount, completedCount, allAssignedCompleted }
  │
  │  answerCount == 0? → Alert: «Нет ответов для формирования отчёта»
  ▼
Скачивание:
  ├── GET /report.docx?reviewerId=&targetId=
  ├── GET /report-by-question.docx?reviewerId=&targetId=
  ├── GET /report.csv?reviewerId=&targetId=
  └── GET /report.xlsx?reviewerId=&targetId=
       │
       ▼
  SurveyDocxReportService / SurveyCsvReportService / SurveyXlsxReportService
    ─ Логотип Directum
    ─ Группировка по целям или вопросам
    ─ Форматирование ответов (SurveyAnswerFormatter)
    ─ Фильтрация по reviewerId/targetId (опциональные query params)
```

### Фильтрация из ResponseModal

```
ResponseModal показывает ответы для:
  single:   reviewerId + targetId (конкретная пара)
  reviewer: reviewerId (все цели одного рецензента)
  target:   targetId (все рецензенты одной цели)

Кнопка «Сформировать результаты» → onOpenExport(filter)
  filter: { reviewerId? } или { targetId? }
  → handleExport → downloadReport(..., filter)
  → Backend: ?reviewerId=X&targetId=Y
```

### Форматы отчётов

| Формат | Сервис | Форматирование |
|--------|--------|---------------|
| DOCX (по целям) | SurveyDocxReportService | OpenXML, логотип, заголовки, radio→labels, scale→bold |
| DOCX (по вопросам) | SurveyDocxReportService | То же, но сгруппировано по вопросам |
| CSV | SurveyCsvReportService | Разделитель `;`, UTF-8 BOM, колонки: Target/Reviewer/Question/Answer |
| XLSX | SurveyXlsxReportService | OpenXML SDK, те же колонки |

---

## 7. Цепочка 6: AI-саммари

```
Опрос завершён → вкладка «Аналитика»
  │
  ▼
AnalyticsTab → блок «AI-саммари»
  │  GET /api/survey/{id}/ai-summary
  ▼
Саммари есть?
  ├── ДА → Показать Markdown контент
  │         Кнопки: Обновить / Удалить
  │
  └── НЕТ → Кнопка «Сгенерировать»
              POST /api/survey/{id}/ai-summary/generate
              ?type=overall|target_{id}|reviewer_{id}
              │
              ▼
            AiSummaryService
              ─ Сбор ответов из БД
              ─ Построение промпта с данными
              ─ System prompt: «Ты HR-аналитик. Анализируй 360°. Отвечай на русском. Markdown.»
              ─ Вызов LLM: OpenAI-compatible /chat/completions
              ─ Сохранение в AiSummaries table (upsert по surveyId+summaryType)
```

### Типы саммари

| Тип | Формат | Описание |
|-----|--------|----------|
| `overall` | строка | Общий обзор команды: сильные стороны, зоны роста, рекомендации |
| `target_{userId}` | строка | Оценка конкретного оцениваемого |
| `reviewer_{userId}` | строка | Анализ стиля конкретного рецензента: объективность, типичные оценки |

### Автогенерация

```
При завершении последнего assignment:
1. survey.Status → "Завершен"
2. survey.ClosedAt = DateTime.UtcNow
3. Фоновая задача (fire-and-forget):
   Task.Run(async () => await aiSummaryService.GenerateOverallAsync(surveyId))
   best-effort, ошибки игнорируются
```

### Конфигурация AI

```
appsettings.json → AiSummaryOptions:
  Enabled, ChatBaseUrl, ChatEndpoint, Model,
  AuthType (none|bearer|basic|oauth),
  OAuthBaseUrl, ClientId, ClientSecret, Scope

Типы аутентификации:
  none:    X-Api-Key header
  bearer:  Authorization: Bearer {key}
  basic:   Authorization: Basic base64(key)
  oauth:   POST /oauth2/token → Bearer token
           AiTokenCache — singleton, SemaphoreSlim, double-check locking
           Поддержка SberGigaChat с русским CA сертификатом
```

---

## 8. Цепочка 7: Живые обновления (SignalR)

```
SignalR Hub: /hubs/survey
  Auth: Bearer token (query param ?access_token=)
  │
  ├──► UserApp (sidebar)
  │      useSurveyLive → refresh sidebar surveys list
  │      Обновляет статусы опросов в реальном времени
  │
  └──► MainPage (matrix + status)
         useSurveyLive → refresh matrix assignments
         Обновляет статус опроса и прогресс
```

### Серверная часть

```
SurveyController (любой Update/CompleteAssignment)
  │
  ▼
_hub.Clients.All.SendAsync("SurveyUpdated", { surveyId, status })
  │
  ▼
Все подключённые клиенты получают событие
  │
  ▼
useSurveyLive hook → callback → обновление UI
```

---

## 9. Перекрёстные связи между цепочками

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Admin       │────►│  Creator     │────►│  Respondent  │
│  (настройка) │     │  (создание)  │     │  (заполнение)│
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                     │
       │  Юзеры             │  Опрос + Матрица    │  Ответы
       │  Группы            │  Вопросы            │  Complete
       │                    │  Шаблоны            │
       │                    │                     │
       │                    ▼                     │
       │             ┌──────────────┐             │
       │             │  Analytics   │◄────────────┘
       │             │  (аналитика) │  (агрегация ответов)
       │             └──────┬───────┘
       │                    │
       │                    ▼
       │             ┌──────────────┐
       │             │  Reports     │  DOCX/CSV/XLSX
       │             │  (отчёты)    │
       │             └──────┬───────┘
       │                    │
       │                    ▼
       │             ┌──────────────┐
       └────────────►│  AI Summary  │  LLM анализ
                     │  (AI саммари)│
                     └──────────────┘
```

### Зависимости

| Цепочка | Зависит от | Обновляет |
|---------|-----------|----------|
| Admin | — | Users, Groups |
| Creator | Users (для участников), Templates | Survey, Questions, Assignments |
| Respondent | Survey (active), Assignments | Answers, IsCompleted |
| Analytics | Answers, Assignments, Users | — (read-only) |
| Reports | Answers, Questions, Users | — (generates files) |
| AI Summary | Answers, Questions | AiSummaries table |
| SignalR | Survey.status changes | Client UI (live) |

---

## 10. Полная карта маршрутов

### Frontend routes

| Роут | Страница | Описание |
|------|----------|----------|
| `/` | UserApp | Основной shell: sidebar + main content |
| `/survey/{id}` | PublicSurveyPage | Прямая ссылка на опрос (?preview=1, ?reviewer=X&target=Y) |
| `/survey/invite/{token}` | InviteSurveyPage | Персональная ссылка для респондента |
| `/?dev=1` | DevPage | Dev-панель (автологин как Admin) |

### Backend API routes

| Роут | Методы | Контроллер |
|------|--------|-----------|
| `/api/auth/*` | POST login, POST admin-login, GET me, POST logout | AuthController |
| `/api/survey` | GET list, POST create | SurveyController |
| `/api/survey/{id}` | GET details, PUT update, DELETE delete | SurveyController |
| `/api/survey/{id}/duplicate` | POST | SurveyController |
| `/api/survey/{id}/matrix` | GET | SurveyController |
| `/api/survey/{id}/participants` | POST add, DELETE remove | SurveyController |
| `/api/survey/{id}/assignments` | PUT save all | SurveyController |
| `/api/survey/{id}/questions/order` | PUT | SurveyController |
| `/api/survey/{id}/questions` | DELETE all | SurveyController |
| `/api/survey/{id}/save-as-template` | POST | SurveyController |
| `/api/survey/{id}/assignments/complete` | POST | SurveyController |
| `/api/survey/{id}/report/info` | GET | SurveyController |
| `/api/survey/{id}/report.docx` | GET | SurveyController |
| `/api/survey/{id}/report-by-question.docx` | GET | SurveyController |
| `/api/survey/{id}/report.csv` | GET | SurveyController |
| `/api/survey/{id}/report.xlsx` | GET | SurveyController |
| `/api/survey/{id}/responses/*` | GET (pair, target, reviewer) | SurveyController |
| `/api/survey/{id}/links` | GET | SurveyController |
| `/api/survey/{id}/send-invites` | POST | SurveyController |
| `/api/survey/invite/{token}` | GET | SurveyController |
| `/api/survey/{id}/ai-summary` | GET, DELETE | SurveyController |
| `/api/survey/{id}/ai-summary/generate` | POST | SurveyController |
| `/api/question` | POST create | QuestionController |
| `/api/question/{id}` | GET, PUT, DELETE | QuestionController |
| `/api/answer` | POST (upsert) | AnswerController |
| `/api/answer/{id}` | GET | AnswerController |
| `/api/user` | GET list, POST create | UserController |
| `/api/user/{id}` | GET | UserController |
| `/api/user/export-csv` | GET | UserController |
| `/api/user/import-csv` | POST | UserController |
| `/api/usergroup` | GET list, POST create | UserGroupController |
| `/api/usergroup/{id}` | GET, PUT, DELETE | UserGroupController |
| `/api/survey-template` | GET list, POST create | SurveyTemplateController |
| `/api/survey-template/{id}` | GET, PUT, DELETE | SurveyTemplateController |
| `/api/survey-template/{id}/questions` | POST add | SurveyTemplateController |
| `/api/survey-template/{id}/questions/{qid}` | PUT, DELETE | SurveyTemplateController |
| `/api/survey-template/{id}/create-survey` | POST | SurveyTemplateController |
| `/api/database` | DELETE reset | DatabaseController |
| `/api/settings` | GET | SettingsController |
| `/api/services/lifecycle` | GET | ServicesController |

### SignalR

| Роут | Хаб | События |
|------|-----|---------|
| `/hubs/survey` | SurveyHub | `SurveyUpdated { surveyId, status }` |

---

## Приложение A: Состояния опроса

```
                    ┌─────────────┐
                    │  Черновик    │
                    │  (draft)     │
                    └──────┬──────┘
                           │
                    PUT /api/survey/{id}
                    { status: "Активен" }
                    (валидация: вопросы, матрица, targets)
                           │
                           ▼
                    ┌─────────────┐
                    │  Активен     │◄──── SignalR обновления
                    │  (active)    │      live-прогресс
                    └──────┬──────┘
                           │
                    Все assignments завершены
                    (CompleteAssignment → last)
                    Или: вручную PUT { status: "Завершен" }
                           │
                           ▼
                    ┌─────────────┐
                    │  Завершен    │──── Авто- AI саммари
                    │  (closed)    │
                    └─────────────┘
```

## Приложение B: Хранение ответов

```
Answer{
  Id, QuestionId, UserId, TargetId, Text
  // Нет поле Type — тип определяется через Question
}

Уникальный индекс: (QuestionId, UserId, TargetId)
  → Гарантирует одну запись на тройку (вопрос, рецензент, цель)
  → При повторном POST → upsert (UPDATE text)
```

## Приложение C: Токены приглашений

```
SurveyParticipant{
  Id, SurveyId, UserId, IsTarget, IsRespondent
  Token (nullable, unique index)  ← персональная ссылка
  CreatedAt
}

Токен создаётся при:
  1. POST /send-invites → SurveyRespondentLinkService.SyncRespondentLinksAsync()
     Для каждого reviewer без токена → генерируется 32-hex токен

Токен используется при:
  GET /api/survey/invite/{token} → ResolveTokenAsync()
  → { surveyId, reviewerId, reviewerEmail, targets[], surveyName }
```
