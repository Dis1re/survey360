import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { answerApi, databaseApi, questionApi, surveyApi, userApi } from '../api'
import { Layout } from '../components/Layout'
import { Link } from '../router'
import type { ApiAnswer, ApiQuestionDetails, ApiSurvey, ApiUser } from '../types'

function formatDate(value: string) {
  if (!value || value.startsWith('0001')) return '—'
  return new Date(value).toLocaleString()
}

function JsonBlock({ data }: { data: unknown }) {
  if (data === null || data === undefined) return null
  return (
    <pre className="bg-light border rounded p-2 small mb-0">
      {JSON.stringify(data, null, 2)}
    </pre>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint: string
  children: ReactNode
}) {
  return (
    <div>
      <label className="form-label small fw-semibold mb-1">{label}</label>
      {children}
      <div className="form-text">{hint}</div>
    </div>
  )
}

export function EntitiesPage() {
  const [surveys, setSurveys] = useState<ApiSurvey[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [userName, setUserName] = useState('Иван Иванов')
  const [userEmail, setUserEmail] = useState('ivan@example.com')
  const [userGetId, setUserGetId] = useState('')
  const [userResult, setUserResult] = useState<ApiUser | null>(null)
  const [userBusy, setUserBusy] = useState(false)

  const [questionSurveyId, setQuestionSurveyId] = useState('')
  const [questionText, setQuestionText] = useState('Как вы оцениваете работу коллеги?')
  const [questionType, setQuestionType] = useState('rating')
  const [questionGetId, setQuestionGetId] = useState('')
  const [questionResult, setQuestionResult] = useState<ApiQuestionDetails | null>(null)
  const [questionBusy, setQuestionBusy] = useState(false)

  const [answerQuestionId, setAnswerQuestionId] = useState('')
  const [answerUserId, setAnswerUserId] = useState('')
  const [answerText, setAnswerText] = useState('5')
  const [answerType, setAnswerType] = useState('rating')
  const [answerGetId, setAnswerGetId] = useState('')
  const [answerResult, setAnswerResult] = useState<ApiAnswer | null>(null)
  const [answerBusy, setAnswerBusy] = useState(false)
  const [clearingDb, setClearingDb] = useState(false)

  const loadSurveys = () => {
    setError(null)
    return surveyApi.list().then(setSurveys)
  }

  useEffect(() => {
    loadSurveys()
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const handleCreateSurvey = async () => {
    setCreating(true)
    setError(null)
    try {
      const id = await surveyApi.create()
      await loadSurveys()
      setQuestionSurveyId(String(id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать опрос')
    } finally {
      setCreating(false)
    }
  }

  const handleRefresh = async () => {
    setLoading(true)
    setError(null)
    try {
      await loadSurveys()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить список')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSurvey = async (id: number, name: string) => {
    const isConfirmed = confirm(`Удалить опрос «${name}» (id ${id})?`)
    if (!isConfirmed) return

    setSurveys((prev) => prev.filter((survey) => survey.id !== id))
    setError(null)
    try {
      await surveyApi.delete(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить опрос')
      await loadSurveys()
    }
  }

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault()
    setUserBusy(true)
    setError(null)
    try {
      const id = await userApi.create({ name: userName, email: userEmail })
      setUserGetId(String(id))
      setAnswerUserId(String(id))
      const user = await userApi.get(id)
      setUserResult(user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать пользователя')
    } finally {
      setUserBusy(false)
    }
  }

  const handleGetUser = async () => {
    const id = Number(userGetId)
    if (!id) return

    setUserBusy(true)
    setError(null)
    try {
      setUserResult(await userApi.get(id))
    } catch (err) {
      setUserResult(null)
      setError(err instanceof Error ? err.message : 'Не удалось получить пользователя')
    } finally {
      setUserBusy(false)
    }
  }

  const loadQuestionDetails = (id: number) => questionApi.get(id).then(setQuestionResult)

  const handleCreateQuestion = async (e: FormEvent) => {
    e.preventDefault()
    const surveyId = Number(questionSurveyId)
    if (!surveyId) return

    setQuestionBusy(true)
    setError(null)
    try {
      const id = await questionApi.create({
        surveyId,
        text: questionText,
        type: questionType,
      })
      setQuestionGetId(String(id))
      setAnswerQuestionId(String(id))
      await loadQuestionDetails(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать вопрос')
    } finally {
      setQuestionBusy(false)
    }
  }

  const handleGetQuestion = async () => {
    const id = Number(questionGetId)
    if (!id) return

    setQuestionBusy(true)
    setError(null)
    try {
      setQuestionResult(await questionApi.get(id))
    } catch (err) {
      setQuestionResult(null)
      setError(err instanceof Error ? err.message : 'Не удалось получить вопрос')
    } finally {
      setQuestionBusy(false)
    }
  }

  const handleDeleteQuestion = async () => {
    const id = Number(questionGetId)
    if (!id) return

    const isConfirmed = confirm(`Удалить вопрос id ${id}?`)
    if (!isConfirmed) return

    setQuestionBusy(true)
    setError(null)
    try {
      await questionApi.delete(id)
      setQuestionResult(null)
      setQuestionGetId('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить вопрос')
    } finally {
      setQuestionBusy(false)
    }
  }

  const handleCreateAnswer = async (e: FormEvent) => {
    e.preventDefault()
    const questionId = Number(answerQuestionId)
    const userId = Number(answerUserId)
    if (!questionId || !userId) return

    setAnswerBusy(true)
    setError(null)
    try {
      const id = await answerApi.create({
        questionId,
        userId,
        text: answerText,
        type: answerType,
      })
      setAnswerGetId(String(id))
      setAnswerResult(await answerApi.get(id))
      if (String(questionId) === questionGetId) {
        await loadQuestionDetails(questionId)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать ответ')
    } finally {
      setAnswerBusy(false)
    }
  }

  const handleGetAnswer = async () => {
    const id = Number(answerGetId)
    if (!id) return

    setAnswerBusy(true)
    setError(null)
    try {
      setAnswerResult(await answerApi.get(id))
    } catch (err) {
      setAnswerResult(null)
      setError(err instanceof Error ? err.message : 'Не удалось получить ответ')
    } finally {
      setAnswerBusy(false)
    }
  }

  const resetLocalState = () => {
    setSurveys([])
    setUserGetId('')
    setUserResult(null)
    setQuestionSurveyId('')
    setQuestionGetId('')
    setQuestionResult(null)
    setAnswerQuestionId('')
    setAnswerUserId('')
    setAnswerGetId('')
    setAnswerResult(null)
  }

  const handleClearDatabase = async () => {
    const isConfirmed = confirm(
      'Удалить ВСЕ данные из базы?\n\nОпросы, пользователи, вопросы, ответы и назначения будут удалены безвозвратно.',
    )
    if (!isConfirmed) return

    setClearingDb(true)
    setError(null)
    try {
      await databaseApi.clearAll()
      resetLocalState()
      await loadSurveys()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось очистить базу данных')
    } finally {
      setClearingDb(false)
    }
  }

  return (
    <Layout title="Тест API — сущности">
      <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
        <h1 className="mb-0">Тест API</h1>
        <button
          type="button"
          className="btn btn-outline-danger"
          onClick={handleClearDatabase}
          disabled={clearingDb}
          title="DELETE /api/database — удалить все записи из БД"
        >
          {clearingDb ? 'Очистка…' : 'Очистить всю БД'}
        </button>
      </div>
      {error && <p className="text-danger">{error}</p>}

      <section className="mb-5">
        <h2>Опросы</h2>
        <p className="text-muted">
          <code>GET /api/survey</code> · <code>POST /api/survey</code> ·{' '}
          <code>DELETE /api/survey/&#123;id&#125;</code>
        </p>

        <div className="d-flex gap-2 mb-3">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCreateSurvey}
            disabled={creating}
            title="POST /api/survey — создаёт черновик «Новый опрос» и возвращает id"
          >
            {creating ? 'Создание…' : 'Создать пустой опрос'}
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={handleRefresh}
            disabled={loading}
            title="GET /api/survey — перезагрузить список опросов"
          >
            Обновить
          </button>
        </div>

        {loading ? (
          <p>Загрузка…</p>
        ) : (
          <>
            <table className="table table-hover">
              <thead>
                <tr>
                  <td>Id</td>
                  <td>Название</td>
                  <td>Описание</td>
                  <td>Статус</td>
                  <td>Создан</td>
                  <td />
                </tr>
              </thead>
              <tbody>
                {surveys.map((survey) => (
                  <tr key={survey.id}>
                    <td>{survey.id}</td>
                    <td>
                      <Link to={`/surveys/${survey.id}`}>{survey.name}</Link>
                    </td>
                    <td>{survey.description || '—'}</td>
                    <td>{survey.status}</td>
                    <td>{formatDate(survey.createdAt)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDeleteSurvey(survey.id, survey.name)}
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {surveys.length === 0 && <p>Опросов пока нет — создайте первый.</p>}
          </>
        )}
      </section>

      <section className="mb-5">
        <h2>Пользователи</h2>
        <p className="text-muted">
          <code>POST /api/user</code> · <code>GET /api/user/&#123;id&#125;</code>
        </p>

        <form className="row g-3 mb-3" onSubmit={handleCreateUser}>
          <div className="col-md-4">
            <Field
              label="Имя"
              hint="ФИО или отображаемое имя. Поле name в POST /api/user."
            >
              <input
                className="form-control"
                placeholder="Например: Иван Иванов"
                title="ФИО участника опроса — уходит в поле name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                required
              />
            </Field>
          </div>
          <div className="col-md-4">
            <Field
              label="Email"
              hint="Контактный email пользователя. Поле email в POST /api/user."
            >
              <input
                className="form-control"
                type="email"
                placeholder="Например: ivan@company.ru"
                title="Email для идентификации пользователя"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                required
              />
            </Field>
          </div>
          <div className="col-md-4 d-flex align-items-end">
            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={userBusy}
              title="POST /api/user — создать пользователя, вернуть id"
            >
              {userBusy ? '…' : 'Создать пользователя'}
            </button>
          </div>
        </form>

        <div className="row g-3 mb-2">
          <div className="col-md-4">
            <Field
              label="Id для просмотра"
              hint="Введите id пользователя или оставьте после создания — подставится сам. GET /api/user/{id}."
            >
              <input
                className="form-control"
                type="number"
                min={1}
                placeholder="Например: 1"
                title="Числовой id пользователя из ответа POST или из JSON ниже"
                value={userGetId}
                onChange={(e) => setUserGetId(e.target.value)}
              />
            </Field>
          </div>
          <div className="col-md-8 d-flex align-items-end gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={handleGetUser}
              disabled={userBusy || !userGetId}
              title="GET /api/user/{id} — загрузить данные пользователя"
            >
              Получить
            </button>
          </div>
        </div>
        <JsonBlock data={userResult} />
      </section>

      <section className="mb-5">
        <h2>Вопросы</h2>
        <p className="text-muted">
          <code>POST /api/question</code> · <code>GET /api/question/&#123;id&#125;</code> ·{' '}
          <code>DELETE /api/question/&#123;id&#125;</code>
        </p>

        <form className="row g-3 mb-3" onSubmit={handleCreateQuestion}>
          <div className="col-md-2">
            <Field
              label="Survey id"
              hint="Id опроса из таблицы «Опросы». Поле surveyId."
            >
              <input
                className="form-control"
                type="number"
                min={1}
                placeholder="Например: 1"
                title="Id существующего опроса — без него вопрос не создастся"
                value={questionSurveyId}
                onChange={(e) => setQuestionSurveyId(e.target.value)}
                required
              />
            </Field>
          </div>
          <div className="col-md-5">
            <Field
              label="Текст вопроса"
              hint="Формулировка, которую увидит респондент. Поле text."
            >
              <input
                className="form-control"
                placeholder="Например: Как вы оцениваете работу коллеги?"
                title="Текст вопроса в опроснике"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                required
              />
            </Field>
          </div>
          <div className="col-md-2">
            <Field
              label="Тип вопроса"
              hint="Произвольная строка: rating, text, choice. Поле type."
            >
              <input
                className="form-control"
                placeholder="rating"
                title="Тип вопроса — влияет на формат ответа"
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value)}
                required
              />
            </Field>
          </div>
          <div className="col-md-3 d-flex align-items-end">
            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={questionBusy}
              title="POST /api/question — создать вопрос в опросе"
            >
              {questionBusy ? '…' : 'Создать вопрос'}
            </button>
          </div>
        </form>

        <div className="row g-3 mb-2">
          <div className="col-md-4">
            <Field
              label="Id для просмотра / удаления"
              hint="Id вопроса после создания подставится сам. GET или DELETE /api/question/{id}."
            >
              <input
                className="form-control"
                type="number"
                min={1}
                placeholder="Например: 1"
                title="Числовой id вопроса"
                value={questionGetId}
                onChange={(e) => setQuestionGetId(e.target.value)}
              />
            </Field>
          </div>
          <div className="col-md-8 d-flex align-items-end gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={handleGetQuestion}
              disabled={questionBusy || !questionGetId}
              title="GET /api/question/{id}"
            >
              Получить
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleDeleteQuestion}
              disabled={questionBusy || !questionGetId}
              title="DELETE /api/question/{id} — удалит вопрос и его ответы"
            >
              Удалить
            </button>
          </div>
        </div>
        <JsonBlock data={questionResult} />
        {questionResult && (
          <p className="form-text mt-1">
            Ответы к вопросу: {questionResult.answers.length}. После создания ответа блок обновится
            автоматически.
          </p>
        )}
      </section>

      <section className="mb-5">
        <h2>Ответы</h2>
        <p className="text-muted">
          <code>POST /api/answer</code> · <code>GET /api/answer/&#123;id&#125;</code>
        </p>

        <form className="row g-3 mb-3" onSubmit={handleCreateAnswer}>
          <div className="col-md-2">
            <Field
              label="Question id"
              hint="Id вопроса из раздела «Вопросы». Поле questionId."
            >
              <input
                className="form-control"
                type="number"
                min={1}
                placeholder="Например: 1"
                title="Id существующего вопроса"
                value={answerQuestionId}
                onChange={(e) => setAnswerQuestionId(e.target.value)}
                required
              />
            </Field>
          </div>
          <div className="col-md-2">
            <Field
              label="User id"
              hint="Id пользователя-респондента. Поле userId."
            >
              <input
                className="form-control"
                type="number"
                min={1}
                placeholder="Например: 1"
                title="Id пользователя, который дал ответ"
                value={answerUserId}
                onChange={(e) => setAnswerUserId(e.target.value)}
                required
              />
            </Field>
          </div>
          <div className="col-md-3">
            <Field
              label="Текст ответа"
              hint="Значение: «5» для rating, произвольный текст для text. Поле text."
            >
              <input
                className="form-control"
                placeholder="Например: 5"
                title="Содержимое ответа респондента"
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                required
              />
            </Field>
          </div>
          <div className="col-md-2">
            <Field
              label="Тип ответа"
              hint="Обычно совпадает с типом вопроса. Поле type."
            >
              <input
                className="form-control"
                placeholder="rating"
                title="Тип ответа — rating, text и т.д."
                value={answerType}
                onChange={(e) => setAnswerType(e.target.value)}
                required
              />
            </Field>
          </div>
          <div className="col-md-3 d-flex align-items-end">
            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={answerBusy}
              title="POST /api/answer — сохранить ответ пользователя на вопрос"
            >
              {answerBusy ? '…' : 'Создать ответ'}
            </button>
          </div>
        </form>

        <div className="row g-3 mb-2">
          <div className="col-md-4">
            <Field
              label="Id для просмотра"
              hint="Id ответа после создания подставится сам. GET /api/answer/{id}."
            >
              <input
                className="form-control"
                type="number"
                min={1}
                placeholder="Например: 1"
                title="Числовой id сохранённого ответа"
                value={answerGetId}
                onChange={(e) => setAnswerGetId(e.target.value)}
              />
            </Field>
          </div>
          <div className="col-md-8 d-flex align-items-end gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={handleGetAnswer}
              disabled={answerBusy || !answerGetId}
              title="GET /api/answer/{id}"
            >
              Получить
            </button>
          </div>
        </div>
        <JsonBlock data={answerResult} />
      </section>
    </Layout>
  )
}
