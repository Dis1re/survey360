# Database Schema

## Tables

### users

| Column | Type | Constraints |
|--------|------|-------------|
| id | integer | PRIMARY KEY |
| name | text | |
| email | text | |
| updated_at | timestamp | |

### surveys

| Column | Type | Constraints |
|--------|------|-------------|
| id | integer | PRIMARY KEY |
| name | text | |
| discription | text | |
| status | text | |
| created_at | timestamp | |
| started_at | timestamp | |
| closed_at | timestamp | |

### questions

| Column | Type | Constraints |
|--------|------|-------------|
| id | integer | PRIMARY KEY |
| survey_id | integer | FK → surveys.id |
| text | text | |
| type | text | |

### answers

| Column | Type | Constraints |
|--------|------|-------------|
| id | integer | PRIMARY KEY |
| question_id | integer | FK → questions.id |
| user_id | integer | FK → users.id |
| type | text | |
| text | text | |

### survey_assignments

| Column | Type | Constraints |
|--------|------|-------------|
| id | integer | PRIMARY KEY |
| survey_id | integer | FK → surveys.id |
| reviewer_id | integer | FK → users.id |
| target_id | integer | FK → users.id |
| is_assigned | bool | |
| is_completed | bool | |

## Relationships

```
survey_assignments.survey_id  → surveys.id
survey_assignments.reviewer_id → users.id
survey_assignments.target_id   → users.id
surveys.id                     → questions.survey_id
questions.id                   → answers.question_id
answers.user_id                → users.id
```
