# API Reference

Base URL: `http://localhost:5175/api`

---

## Survey

### `POST /api/survey`

Создаёт новый опрос-черновик. Тело запроса не требуется.

**Response** `200 OK`

```
42
```

Возвращает `id` созданного опроса.

---

### `GET /api/survey`

Список всех опросов, отсортированных по дате создания (сначала новые).

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
    "closedAt": "0001-01-01T00:00:00"
  }
]
```

---

### `GET /api/survey/{id}`

Детальная информация об опросе: вопросы, ответы, назначения.

**Response** `200 OK`

```json
{
  "survey": { ... },
  "questions": [
    {
      "id": 1,
      "surveyId": 42,
      "text": "Как вы оцениваете работу коллеги?",
      "type": "rating"
    }
  ],
  "answers": [
    {
      "id": 1,
      "questionId": 1,
      "userId": 1,
      "text": "5",
      "type": "rating"
    }
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

**Response** `404 Not Found`

---

### `DELETE /api/survey/{id}`

Удаляет опрос по id (каскадно удаляются связанные вопросы, ответы, назначения).

**Response** `204 No Content`

**Response** `404 Not Found`

---

### `PUT /api/survey/{id}`

Обновляет основные поля опроса (название, описание, даты начала/завершения).

**Request body**

```json
{
  "name": "Новое название",
  "description": "Новое описание",
  "startedAt": "2026-08-01T00:00:00Z",
  "closedAt": "2026-08-15T00:00:00Z"
}
```

**Response** `204 No Content`

**Response** `404 Not Found`

---

## User

### `POST /api/user`

Создаёт пользователя.

**Request body**

```json
{
  "name": "Иван Иванов",
  "email": "ivan@company.ru"
}
```

**Response** `200 OK`

```
1
```

Возвращает `id` созданного пользователя.

---

### `GET /api/user/{id}`

Получить пользователя по id.

**Response** `200 OK`

```json
{
  "id": 1,
  "name": "Иван Иванов",
  "email": "ivan@company.ru",
  "createdAt": "2026-07-09T10:00:00Z",
  "updatedAt": "2026-07-09T10:00:00Z"
}
```

**Response** `404 Not Found`

---

## Question

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

**Response** `200 OK`

```
1
```

**Response** `404 Not Found` — опрос не найден

---

### `GET /api/question/{id}`

Детальная информация о вопросе с ответами.

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

**Response** `404 Not Found`

---

### `DELETE /api/question/{id}`

Удаляет вопрос и все его ответы.

**Response** `204 No Content`

**Response** `404 Not Found`

---

## Answer

### `POST /api/answer`

Создаёт ответ на вопрос от пользователя.

**Request body**

```json
{
  "questionId": 1,
  "userId": 1,
  "text": "5",
  "type": "rating"
}
```

**Response** `200 OK`

```
1
```

**Response** `404 Not Found` — вопрос или пользователь не найден

---

### `GET /api/answer/{id}`

Получить ответ по id.

**Response** `200 OK`

```json
{
  "id": 1,
  "questionId": 1,
  "userId": 1,
  "text": "5",
  "type": "rating"
}
```

**Response** `404 Not Found`

---

## Database

### `DELETE /api/database`

Удаляет **все** данные из БД (ответы → назначения → вопросы → опросы → пользователи).  
Работает **только в Development** окружении.

**Response** `204 No Content`

**Response** `404 Not Found` — вне Development

---

## Settings

### `GET /api/settings`

Возвращает содержимое секции `MySettings` из `appsettings.json`.

**Response** `200 OK`

```json
{
  "value1": "value",
  "value2": 2,
  "value3": false
}
```

---

## Services (demo DI)

### `GET /api/services/lifecycle`

Демонстрация времени жизни DI-сервисов. Возвращает `DateTime` из Transient, Scoped и Singleton сервисов (каждый инжектится дважды — в контроллер и во view).

**Response** `200 OK`

```json
{
  "transient": { "controller": "...", "view": "..." },
  "scoped": { "controller": "...", "view": "..." },
  "singleton": { "controller": "...", "view": "..." }
}
```
