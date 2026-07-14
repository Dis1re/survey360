# REST API Survey360

Backend отдаёт JSON по адресу **`http://localhost:5175/api`**.

Frontend в dev-режиме ходит на **`/api/...`** — Vite проксирует запросы на порт 5175 (см. `frontend/vite.config.ts`).

## Как пользоваться этим документом

- **Метод + путь** — что вызывать (`GET`, `POST`, `PUT`, `DELETE`).
- **Тело запроса** — JSON в теле (для POST/PUT).
- **Ответ** — что вернёт сервер; коды `200`, `204`, `404`, `400`.
- Имена полей в JSON — **camelCase** (`surveyId`, `createdAt`).

Swagger (интерактивная документация): http://localhost:5175/swagger — только в Development.

---

## Обзор: что за чем идёт

Типичный сценарий настройки опроса 360°:

1. `POST /api/survey` — создать черновик.
2. `PUT /api/survey/{id}` — задать название, описание, статус.
3. `POST /api/question` — добавить вопросы.
4. `POST /api/user` — завести пользователей (если ещё нет).
5. `POST /api/survey/{id}/participants` — добавить targets и respondents.
6. `GET /api/survey/{id}/matrix` — получить матрицу для UI.
7. `PUT /api/survey/{id}/assignments` — сохранить галочки «кто кого оценивает».
8. `POST /api/answer` — сохранить ответы (когда респондент заполняет форму).

---

---

## Auth — вход и сессия

Авторизация через **cookie** (`Survey360.Auth`). Frontend отправляет `credentials: 'include'` на все запросы к `/api`.

### `POST /api/auth/login`

Вход обычного пользователя по email.

**Request body**

```json
{ "email": "ivan@company.ru" }
```

**Response** `200 OK`

```json
{ "id": 1, "name": "Иван Иванов", "email": "ivan@company.ru", "isAdmin": false }
```

**Response** `404` — пользователь не найден.

---

### `POST /api/auth/admin-login`

Вход администратора. Логин `Admin` / `Админ` создаёт dev-админа автоматически.

**Response** `403` — email найден, но `isAdmin = false`.

---

### `GET /api/auth/me`

Текущий пользователь по cookie. **Response** `401` — не авторизован.

---

### `POST /api/auth/logout`

Выход, сброс cookie. **Response** `204 No Content`.

---

## Survey — опросы

### `POST /api/survey`

Создаёт новый опрос-черновик от имени текущего пользователя. Тело запроса **не нужно**. Требуется авторизация.

Поле `createdByUserId` в БД заполняется id вошедшего пользователя.

**Response** `200 OK` — id нового опроса (число, не JSON-объект):

```
42
```

---

### `GET /api/survey`

Список опросов для **текущего пользователя**, **сначала новые** (по `createdAt`). Требуется авторизация.

**Администратор** (`isAdmin: true`) — только debug-флаг в UI (кнопка «База данных»). Список опросов **тот же**, что у обычного пользователя.

**Любой авторизованный пользователь** видит:

| Категория | Условие |
|-----------|---------|
| Свои черновики | `status` = черновик **и** `createdByUserId` = id пользователя |
| Активные к прохождению | пользователь — **респондент** в матрице (`SurveyAssignments.reviewerId`, `isAssigned = true`), статус не черновик |
| Пройденные | те же назначения респондента; на UI ответы только для просмотра (`isCompleted = true` на паре reviewer → target) |

Участие только как **target** (объект оценки) без назначения респондентом **не** попадает в список.

**Response** `200 OK`

```json
[
  {
    "id": 42,
    "name": "Новый опрос",
    "description": "",
    "status": "Черновик",
    "createdAt": "2026-07-09T10:00:00Z",
    "startedAt": "0001-01-01T00:00:00",
    "closedAt": "0001-01-01T00:00:00",
    "createdByUserId": 1
  }
]
```

**Response** `401` — не авторизован.

---

### `GET /api/survey/{id}`

Полная карточка опроса: сам опрос + все вопросы + все ответы на эти вопросы + все назначения.

**Response** `200 OK`

```json
{
  "survey": {
    "id": 42,
    "name": "Оценка Q2 2026",
    "description": "Квартальный 360",
    "status": "Черновик",
    "createdAt": "2026-07-09T10:00:00Z",
    "startedAt": "0001-01-01T00:00:00",
    "closedAt": "0001-01-01T00:00:00",
    "createdByUserId": 1
  },
  "questions": [
    {
      "id": 1,
      "surveyId": 42,
      "text": "Как вы оцениваете работу коллеги?",
      "type": "rating"
    }
  ],
  "answers": [],
  "assignments": [
    {
      "id": 1,
      "surveyId": 42,
      "reviewerId": 1,
      "targetId": 2,
      "isAssigned": true,
      "isCompleted": false
    }
  ]
}
```

**Response** `404` — опрос не найден.

---

### `PUT /api/survey/{id}`

Обновляет метаданные опроса (название, описание, статус, даты).

**Request body**

```json
{
  "name": "Оценка Q2 2026",
  "description": "Квартальный 360",
  "status": "Активный",
  "startedAt": "2026-07-10T09:00:00Z",
  "closedAt": null
}
```

`startedAt` / `closedAt` можно передать `null` — тогда в БД запишется пустая дата (`0001-01-01`).

**Response** `200 OK` — обновлённый объект опроса.

**Response** `404` — опрос не найден.

---

### `DELETE /api/survey/{id}`

Удаляет опрос. Связанные вопросы, участники, назначения удаляются каскадом на уровне БД.

**Response** `204 No Content`

**Response** `404` — опрос не найден.

---

### `GET /api/survey/{id}/matrix`

Данные для **матрицы назначений** на UI: списки targets, respondents и текущие назначения.

**Response** `200 OK`

```json
{
  "targets": [
    { "id": 2, "name": "Пётр Петров", "email": "petr@company.ru", "createdAt": "...", "updatedAt": "..." }
  ],
  "respondents": [
    { "id": 1, "name": "Иван Иванов", "email": "ivan@company.ru", "createdAt": "...", "updatedAt": "..." }
  ],
  "assignments": [
    {
      "id": 1,
      "surveyId": 42,
      "reviewerId": 1,
      "targetId": 2,
      "isAssigned": true,
      "isCompleted": false
    }
  ]
}
```

**Response** `404` — опрос не найден.

---

### `POST /api/survey/{id}/participants`

Добавляет пользователя в опрос с ролью **target** (оцениваемый) или **respondent** (оценивающий).

Если пользователь уже есть в опросе — обновляется соответствующий флаг (`isTarget` / `isRespondent`).

**Request body**

```json
{
  "userId": 2,
  "role": "target"
}
```

`role` — строка `"target"` или `"respondent"` (регистр не важен).

**Response** `204 No Content`

**Response** `404` — опрос или пользователь не найден.

**Response** `400` — неверный `role`.

---

### `DELETE /api/survey/{id}/participants`

Удаляет пользователя из опроса с указанной ролью. Если у участника были обе роли (target и respondent) — снимается только указанная; если обе стали `false` — запись удаляется. Связанные назначения (assignments) удаляются каскадно.

**Query parameters**

| Параметр | Тип | Описание |
|----------|-----|----------|
| `userId` | int | id пользователя |
| `role` | string | `"target"` или `"respondent"` |

**Response** `204 No Content`

**Response** `400` — неверный `role`.

**Response** `404` — опрос или пользователь не найден.

---

### `PUT /api/survey/{id}/assignments`

Сохраняет матрицу назначений. **Полностью заменяет** все назначения опроса: старые удаляются, записываются только пары с `isAssigned: true`.

Пары проверяются: reviewer должен быть respondent, target — target в этом опросе. Невалидные пары **молча пропускаются**.

**Request body**

```json
{
  "entries": [
    { "reviewerId": 1, "targetId": 2, "isAssigned": true },
    { "reviewerId": 1, "targetId": 3, "isAssigned": false }
  ]
}
```

**Response** `204 No Content`

**Response** `404` — опрос не найден.

---

## User — пользователи

### `POST /api/user`

Создаёт пользователя.

**Request body**

```json
{
  "name": "Иван Иванов",
  "email": "ivan@company.ru"
}
```

**Response** `200 OK` — id (число):

```
1
```

---

### `GET /api/user`

Список всех пользователей, отсортирован по имени.

**Response** `200 OK`

```json
[
  {
    "id": 1,
    "name": "Иван Иванов",
    "email": "ivan@company.ru",
    "createdAt": "2026-07-09T10:00:00Z",
    "updatedAt": "2026-07-09T10:00:00Z"
  }
]
```

---

### `GET /api/user/{id}`

Один пользователь по id.

**Response** `200 OK` — объект пользователя.

**Response** `404` — не найден.

---

## Question — вопросы

### `POST /api/question`

Создаёт вопрос в указанном опросе.

**Request body**

```json
{
  "surveyId": 42,
  "text": "Как вы оцениваете работу коллеги?",
  "type": "rating"
}
```

**Response** `200 OK` — id вопроса (число).

**Response** `404` — опрос не найден.

---

### `GET /api/question/{id}`

Вопрос и все ответы на него.

**Response** `200 OK`

```json
{
  "question": {
    "id": 1,
    "surveyId": 42,
    "text": "Как вы оцениваете работу коллеги?",
    "type": "rating"
  },
  "answers": []
}
```

**Response** `404` — не найден.

---

### `PUT /api/question/{id}`

Обновляет текст и тип вопроса.

**Request body**

```json
{
  "text": "Оцените взаимодействие с коллегой",
  "type": "scale"
}
```

**Response** `200 OK` — обновлённый вопрос.

**Response** `404` — не найден.

---

### `DELETE /api/question/{id}`

Удаляет вопрос и все его ответы.

**Response** `204 No Content`

**Response** `404` — не найден.

---

## Answer — ответы

### `POST /api/answer`

Создаёт ответ пользователя на вопрос.

**Request body**

```json
{
  "questionId": 1,
  "userId": 1,
  "targetId": 2,
  "text": "5",
  "type": "rating"
}
```

**Response** `200 OK` — id ответа (число).

**Response** `404` — вопрос или пользователь не найден.

---

### `GET /api/answer/{id}`

Один ответ по id.

**Response** `200 OK`

```json
{
  "id": 1,
  "questionId": 1,
  "userId": 1,
  "targetId": 2,
  "text": "5",
  "type": "rating"
}
```

**Response** `404` — не найден.

---

## Assignments — завершение назначений

### `POST /api/survey/{id}/assignments/complete`

Отмечает назначение (reviewer → target) как выполненное. Если все назначения в опросе выполнены — опрос автоматически переводится в статус «Завершен» и фиксируется `closedAt`.

**Request body**

```json
{
  "reviewerId": 1,
  "targetId": 2
}
```

**Response** `204 No Content`

**Response** `400` — назначение не найдено в матрице опроса.

**Response** `404` — опрос не найден.

---

## Report — отчёты

### `GET /api/survey/{id}/report/info`

Возвращает метаинформацию для формирования отчёта: количество ответов, назначенных пар и завершённых.

**Response** `200 OK`

```json
{
  "answerCount": 12,
  "assignedCount": 6,
  "completedCount": 4,
  "allAssignedCompleted": false
}
```

**Response** `404` — опрос не найден.

---

### `GET /api/survey/{id}/report.docx`

Скачивает отчёт по опросу в формате `.docx`. Если ответов нет — возвращает `400`.

**Response** `200 OK` — файл `application/vnd.openxmlformats-officedocument.wordprocessingml.document`.

**Response** `400` — нет ответов для формирования отчёта.

**Response** `404` — опрос не найден.

---

## Survey Template — шаблоны анкет

### `POST /api/survey-template`

Создаёт шаблон анкеты.

**Request body**

```json
{
  "name": "Шаблон оценки 360",
  "description": "Стандартный набор вопросов для квартальной оценки",
  "props": ""
}
```

`props` — произвольный текстовый параметр для хранения дополнительных настроек шаблона.

**Response** `200 OK` — id шаблона (число).

---

### `GET /api/survey-template`

Список всех шаблонов, сначала новые.

**Response** `200 OK`

```json
[
  {
    "id": 1,
    "name": "Шаблон оценки 360",
    "description": "Стандартный набор вопросов",
    "props": "",
    "createdAt": "2026-07-10T10:00:00Z"
  }
]
```

---

### `GET /api/survey-template/{id}`

Шаблон со всеми вопросами.

**Response** `200 OK`

```json
{
  "template": {
    "id": 1,
    "name": "Шаблон оценки 360",
    "description": "Стандартный набор вопросов",
    "props": "",
    "createdAt": "2026-07-10T10:00:00Z"
  },
  "questions": [
    {
      "id": 1,
      "surveyTemplateId": 1,
      "text": "Как вы оцениваете работу коллеги?",
      "type": "rating"
    }
  ]
}
```

**Response** `404` — шаблон не найден.

---

### `PUT /api/survey-template/{id}`

Обновляет метаданные шаблона (название, описание, props).

**Request body**

```json
{
  "name": "Шаблон оценки 360 (обновлённый)",
  "description": "Описание",
  "props": "дополнительные настройки"
}
```

**Response** `200 OK` — обновлённый шаблон.

**Response** `404` — шаблон не найден.

---

### `DELETE /api/survey-template/{id}`

Удаляет шаблон и все его вопросы (каскадно).

**Response** `204 No Content`

**Response** `404` — шаблон не найден.

---

### `POST /api/survey-template/{id}/questions`

Добавляет вопрос в шаблон.

**Request body**

```json
{
  "text": "Как вы оцениваете работу коллеги?",
  "type": "rating"
}
```

**Response** `200 OK` — id вопроса (число).

**Response** `404` — шаблон не найден.

---

### `PUT /api/survey-template/{id}/questions/{questionId}`

Обновляет вопрос шаблона.

**Request body**

```json
{
  "text": "Оцените взаимодействие с коллегой",
  "type": "scale"
}
```

**Response** `200 OK` — обновлённый вопрос.

**Response** `404` — шаблон или вопрос не найден.

---

### `DELETE /api/survey-template/{id}/questions/{questionId}`

Удаляет вопрос из шаблона.

**Response** `204 No Content`

**Response** `404` — шаблон или вопрос не найден.

---

### `POST /api/survey-template/{id}/create-survey`

Создаёт новый опрос на основе шаблона. Копирует название, описание и все вопросы. Новый опрос получает статус «Черновик».

**Response** `200 OK` — id нового опроса (число).

**Response** `404` — шаблон не найден.

---

## Database — служебное (только Development)

### `DELETE /api/database`

Удаляет **все** данные из всех таблиц. Удобно для сброса при локальной разработке.

**Response** `204 No Content`

**Response** `404` — если backend **не** в Development (защита от случайного сноса на проде).

---

## Settings — демо конфигурации

### `GET /api/settings`

Возвращает секцию `MySettings` из `appsettings.json` (учебный пример чтения конфига).

**Response** `200 OK`

```json
{
  "value1": "value",
  "value2": 2,
  "value3": false
}
```

---

## Services — демо DI (не бизнес-логика)

### `GET /api/services/lifecycle`

Показывает, как работают **Transient**, **Scoped** и **Singleton** в ASP.NET DI: для каждого типа возвращаются два timestamp (из «контроллера» и «view»).

**Response** `200 OK`

```json
{
  "transient": { "controller": "...", "view": "..." },
  "scoped": { "controller": "...", "view": "..." },
  "singleton": { "controller": "...", "view": "..." }
}
```

---

## Коды ответов

| Код | Когда |
|-----|--------|
| `200` | Успех, в теле данные или id |
| `204` | Успех, тела нет (удаление, сохранение без возврата) |
| `400` | Неверные данные в запросе |
| `401` | Нет авторизации (cookie) |
| `403` | Нет прав (например, admin-login без isAdmin) |
| `404` | Сущность не найдена или эндпoинт недоступен (например, очистка БД вне Dev) |

Защищённые эндпoинты (`POST /api/survey`, `GET /api/survey`, `PUT /api/survey/{id}` и др.) требуют активной сессии.

---

## Связь с frontend

Клиентские обёртки над API: `frontend/src/api.ts` (`authApi`, `surveyApi`, `userApi`, `questionApi`, `answerApi`, `databaseApi`).

Типы запросов/ответов: `frontend/src/types.ts`.
