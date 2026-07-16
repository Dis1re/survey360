# База данных Survey360

Данные хранятся в **SQLite** — один файл `WebApp/survey.db`. Схема описывается C#-классами в `Models/` и применяется через **Entity Framework Core** и папку `Migrations/`.

## Зачем эта база

Survey360 — система опросов **360°**:

1. Создаётся **опрос** с **вопросами**.
2. В опрос добавляются **участники** — кого оценивают и кто оценивает.
3. В **матрице** отмечается, кто именно кого оценивает (пары reviewer → target).
4. **Ответы** сохраняются на каждый вопрос от конкретного пользователя.

База как раз хранит все эти сущности и связи между ними.

---

## Схема связей (картинка словами)

```
users ─────────────────────────────────────────────┐
  │                                                 │
  │         survey_participants                     │
  ├──────── (user_id, survey_id, роли) ──── surveys │
  │                                                 │
  │         survey_assignments                      │
  ├──────── (reviewer_id → target_id) ──────────────┤
  │                                                 │
  │         answers                                 │
  └──────── (user_id + question_id) ─── questions ──┘
                                              │
                                         survey_id
```

- Один **опрос** → много **вопросов**, **участников**, **назначений**.
- **Ответ** всегда привязан к **вопросу** и **пользователю** (кто ответил).
- **Назначение** — это пара «оценивающий (reviewer) оценивает оцениваемого (target)» в рамках одного опроса.

---

## Таблицы

### `Users` — пользователи системы

Люди, которые могут участвовать в опросах (оцениваемые, оценивающие, авторы).

| Колонка | Тип | Описание |
|---------|-----|----------|
| `Id` | integer | Первичный ключ |
| `Name` | text | ФИО или отображаемое имя |
| `Email` | text | Email |
| `IsAdmin` | bool | Debug-флаг: доп. кнопки в UI (просмотр БД). **Не** даёт доступ ко всем опросам |
| `CreatedAt` | timestamp | Когда создан |
| `UpdatedAt` | timestamp | Когда последний раз обновлён |

---

### `Surveys` — опросы

| Колонка | Тип | Описание |
|---------|-----|----------|
| `Id` | integer | Первичный ключ |
| `Name` | text | Название опроса |
| `Description` | text | Описание |
| `Status` | text | Статус, например «Черновик», «Активный», «Закрыт» |
| `CreatedByUserId` | integer, nullable | FK → `Users.Id` — кто создал опрос. Заполняется при `POST /api/survey`. Для старых записей без автора проставляется администратор |
| `CreatedAt` | timestamp | Дата создания |
| `StartedAt` | timestamp | Когда опрос запущен (пустая дата = ещё не запускали) |
| `ClosedAt` | timestamp | Когда закрыт |

При создании через API опрос получает имя «Новый опрос», статус «Черновик» и `CreatedByUserId` текущего авторизованного пользователя.

**Кто видит опрос в списке (`GET /api/survey`):**

- **Администратор** (`IsAdmin`) — только debug в UI, список опросов как у всех.
- **Любой пользователь** (`POST /api/survey`):
  - свои **черновики** (`CreatedByUserId` = он);
  - **активные** и **завершённые** опросы, где он **респондент** и у него есть назначение в матрице (`SurveyAssignments.ReviewerId`, `IsAssigned = true`).

Простое участие как «объект оценки» (target) без назначения респондентом **не** добавляет опрос в личный список.

---

### `Questions` — вопросы опроса

| Колонка | Тип | Описание |
|---------|-----|----------|
| `Id` | integer | Первичный ключ |
| `SurveyId` | integer | FK → `Surveys.Id` — к какому опросу относится |
| `Text` | text | Текст вопроса |
| `Type` | text | Тип ответа: `rating`, `text`, `radio` и т.д. (строка, без enum в БД) |

Удаление опроса **каскадом** удаляет все его вопросы.

---

### `Answers` — ответы на вопросы

| Колонка | Тип | Описание |
|---------|-----|----------|
| `Id` | integer | Первичный ключ |
| `QuestionId` | integer | FK → `Questions.Id` |
| `UserId` | integer | FK → `Users.Id` — кто ответил |
| `Text` | text | Содержимое ответа (число, текст и т.д.) |
| `Type` | text | Тип ответа (дублирует логику вопроса для гибкости) |

Удаление вопроса **каскадом** удаляет все ответы на него.

---

### `SurveyParticipants` — участники конкретного опроса

Кто включён в опрос и в какой **роли**. Один пользователь в одном опросе — **одна строка** (уникальный индекс `SurveyId + UserId`).

| Колонка | Тип | Описание |
|---------|-----|----------|
| `Id` | integer | Первичный ключ |
| `SurveyId` | integer | FK → `Surveys.Id` |
| `UserId` | integer | FK → `Users.Id` |
| `IsTarget` | bool | `true` — этого человека **оценивают** (столбец в матрице) |
| `IsRespondent` | bool | `true` — этот человек **оценивает других** (строка в матрице) |

Один человек может быть и target, и respondent одновременно — тогда оба флага `true`.

Добавление через API: `POST /api/survey/{id}/participants` с `role: "target"` или `"respondent"`.

---

### `SurveyAssignments` — матрица «кто кого оценивает»

Каждая строка — одна **галочка** в матрице: reviewer (оценивающий) → target (оцениваемый).

| Колонка | Тип | Описание |
|---------|-----|----------|
| `Id` | integer | Первичный ключ |
| `SurveyId` | integer | FK → `Surveys.Id` |
| `ReviewerId` | integer | FK → `Users.Id` — кто оценивает (respondent) |
| `TargetId` | integer | FK → `Users.Id` — кого оценивают |
| `IsAssigned` | bool | Назначение включено (сохраняются только `true`) |
| `IsCompleted` | bool | Респондент уже заполнил оценку по этой паре |

Сохранение матрицы: `PUT /api/survey/{id}/assignments` — **полная перезапись** всех назначений опроса (старые удаляются, новые записываются).

Backend проверяет, что `ReviewerId` — respondent, а `TargetId` — target в этом опросе; иначе пара игнорируется.

---

## Связи (FK)

| Откуда | Куда | При удалении родителя |
|--------|------|------------------------|
| `Questions.SurveyId` | `Surveys.Id` | CASCADE — вопросы удаляются с опросом |
| `Answers.QuestionId` | `Questions.Id` | CASCADE |
| `Answers.UserId` | `Users.Id` | CASCADE |
| `SurveyParticipants.SurveyId` | `Surveys.Id` | CASCADE |
| `SurveyParticipants.UserId` | `Users.Id` | CASCADE |
| `Surveys.CreatedByUserId` | `Users.Id` | SET NULL |
| `SurveyAssignments.SurveyId` | `Surveys.Id` | CASCADE |
| `SurveyAssignments.ReviewerId` | `Users.Id` | CASCADE |
| `SurveyAssignments.TargetId` | `Users.Id` | CASCADE |

---

## Как менять схему

1. Правите класс в `WebApp/Models/`.
2. При необходимости — связи в `ApplicationDbContext.OnModelCreating`.
3. Из папки `WebApp/`:
   ```bash
   dotnet ef migrations add КраткоеИмяИзменения
   ```
4. Перезапускаете backend — миграция применится автоматически.

**Не редактируйте** `survey.db` вручную и не удаляйте старые файлы миграций — только новые миграции поверх текущих.

---

## Очистка данных (только разработка)

`DELETE /api/database` удаляет все строки из всех таблиц в порядке:

`Answers` → `SurveyAssignments` → `SurveyParticipants` → `Questions` → `Surveys` → `Users`

Работает только когда backend запущен в **Development**.
