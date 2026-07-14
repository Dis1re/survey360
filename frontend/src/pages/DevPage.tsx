import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { answerApi, databaseApi, questionApi, surveyApi, userApi } from '../api'
import { ConfirmModal } from '../components/ConfirmModal'
import type { ApiAnswer, ApiQuestion, ApiQuestionDetails, ApiSurvey, ApiUser } from '../types'

interface EntitiesPageProps {
  onBack: () => void
  onOpenSurvey: (id: number) => void
}

const inputClass =
  'w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 text-sm shadow-sm'
const btnPrimary =
  'px-4 py-2 text-sm font-medium text-white bg-[#FF8600] hover:bg-[#FF6B00] rounded-xl transition shadow-sm disabled:opacity-50 cursor-pointer'
const btnSecondary =
  'px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition disabled:opacity-50 cursor-pointer'
const btnDangerOutline =
  'px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 rounded-xl transition disabled:opacity-50 cursor-pointer'

const thClass =
  'text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider'
const tdClass = 'px-4 py-3 text-sm text-gray-600'

function formatDate(value: string) {
  if (!value || value.startsWith('0001')) return '—'
  return new Date(value).toLocaleString()
}

function JsonBlock({ data }: { data: unknown }) {
  if (data === null || data === undefined) return null
  return (
    <pre className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-700 overflow-x-auto mt-3">
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
      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
        {label}
      </label>
      {children}
      <p className="text-xs text-gray-400 mt-1.5">{hint}</p>
    </div>
  )
}

function Section({
  title,
  endpoints,
  children,
}: {
  title: string
  endpoints: ReactNode
  children: ReactNode
}) {
  return (
    <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-400 mt-1 font-mono">{endpoints}</p>
      </div>
      {children}
    </section>
  )
}

export function EntitiesPage({ onBack, onOpenSurvey }: EntitiesPageProps) {
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
  const [answerTargetId, setAnswerTargetId] = useState('')
  const [answerText, setAnswerText] = useState('5')
  const [answerType, setAnswerType] = useState('rating')
  const [answerGetId, setAnswerGetId] = useState('')
  const [answerResult, setAnswerResult] = useState<ApiAnswer | null>(null)
  const [answerBusy, setAnswerBusy] = useState(false)
  const [clearingDb, setClearingDb] = useState(false)
  const [deletingSurveyId, setDeletingSurveyId] = useState<number | null>(null)
  const [confirmAction, setConfirmAction] = useState<
    | { kind: 'delete-survey'; id: number; name: string }
    | { kind: 'delete-question'; id: number }
    | { kind: 'clear-database' }
    | null
  >(null)
  const [knownQuestions, setKnownQuestions] = useState<ApiQuestion[]>([])
  const [knownAnswers, setKnownAnswers] = useState<ApiAnswer[]>([])
  const [knownUserIds, setKnownUserIds] = useState<number[]>([])

  const loadRelatedEntities = async (surveyList: ApiSurvey[]) => {
    if (surveyList.length === 0) {
      setKnownQuestions([])
      setKnownAnswers([])
      setKnownUserIds([])
      return
    }

    const details = await Promise.all(surveyList.map((survey) => surveyApi.get(survey.id)))
    const questions = details.flatMap((detail) => detail.questions)
    const answers = details.flatMap((detail) => detail.answers)
    const userIds = [...new Set(answers.map((answer) => answer.userId))].sort((a, b) => a - b)

    setKnownQuestions(questions)
    setKnownAnswers(answers)
    setKnownUserIds(userIds)
  }

  const loadSurveys = async () => {
    setError(null)
    const list = await surveyApi.list()
    setSurveys(list)
    await loadRelatedEntities(list)
    return list
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

  const handleDeleteSurvey = (id: number, name: string) => {
    setConfirmAction({ kind: 'delete-survey', id, name })
  }

  const confirmDeleteSurvey = async () => {
    if (confirmAction?.kind !== 'delete-survey') return
    const { id } = confirmAction

    setDeletingSurveyId(id)
    setError(null)
    try {
      await surveyApi.delete(id)
      setConfirmAction(null)
      await loadSurveys()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить опрос')
      await loadSurveys()
    } finally {
      setDeletingSurveyId(null)
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

  const handleGetUser = async (idOverride?: number) => {
    const id = idOverride ?? Number(userGetId)
    if (!id) {
      setError('Укажите id пользователя')
      return
    }

    setUserGetId(String(id))
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
      await loadSurveys()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать вопрос')
    } finally {
      setQuestionBusy(false)
    }
  }

  const handleGetQuestion = async (idOverride?: number) => {
    const id = idOverride ?? Number(questionGetId)
    if (!id) {
      setError('Укажите id вопроса')
      return
    }

    setQuestionGetId(String(id))
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

  const handleDeleteQuestion = (idOverride?: number) => {
    const id = idOverride ?? Number(questionGetId)
    if (!id) {
      setError('Укажите id вопроса')
      return
    }
    setConfirmAction({ kind: 'delete-question', id })
  }

  const confirmDeleteQuestion = async () => {
    if (confirmAction?.kind !== 'delete-question') return
    const { id } = confirmAction

    setQuestionGetId(String(id))
    setQuestionBusy(true)
    setError(null)
    try {
      await questionApi.delete(id)
      setConfirmAction(null)
      setQuestionResult(null)
      setQuestionGetId('')
      await loadSurveys()
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
    const targetId = Number(answerTargetId)
    if (!questionId || !userId || !targetId) return

    setAnswerBusy(true)
    setError(null)
    try {
      const id = await answerApi.create({
        questionId,
        userId,
        targetId,
        text: answerText,
        type: answerType,
      })
      setAnswerGetId(String(id))
      setAnswerResult(await answerApi.get(id))
      if (String(questionId) === questionGetId) {
        await loadQuestionDetails(questionId)
      }
      await loadSurveys()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать ответ')
    } finally {
      setAnswerBusy(false)
    }
  }

  const handleGetAnswer = async (idOverride?: number) => {
    const id = idOverride ?? Number(answerGetId)
    if (!id) {
      setError('Укажите id ответа')
      return
    }

    setAnswerGetId(String(id))
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
    setKnownQuestions([])
    setKnownAnswers([])
    setKnownUserIds([])
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

  const handleClearDatabase = () => {
    setConfirmAction({ kind: 'clear-database' })
  }

  const confirmClearDatabase = async () => {
    setClearingDb(true)
    setError(null)
    try {
      await databaseApi.clearAll()
      setConfirmAction(null)
      resetLocalState()
      await loadSurveys()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось очистить базу данных')
    } finally {
      setClearingDb(false)
    }
  }

  return (
    <>
      <header className="bg-white border-b border-gray-200 p-6 flex-shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">Тест API</h1>
              <span className="px-2.5 py-1 text-xs font-medium text-amber-800 bg-amber-50 rounded-md border border-amber-200">
                Dev
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 text-sm font-medium text-gray-600 border-2 border-orange-300 rounded-xl hover:bg-orange-50 cursor-pointer"
            >
               К редактору
            </button>
            <button
              type="button"
              className={btnDangerOutline}
              onClick={handleClearDatabase}
              disabled={clearingDb}
              title="DELETE /api/database — удалить все записи из БД"
            >
              {clearingDb ? 'Очистка…' : 'Очистить БД'}
            </button>
          </div>
        </div>
      </header>

      <div className="p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <Section
            title="Опросы"
            endpoints={
              <>
                GET /api/survey · POST /api/survey · DELETE /api/survey/&#123;id&#125;
              </>
            }
          >
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                type="button"
                className={btnPrimary}
                onClick={handleCreateSurvey}
                disabled={creating}
                title="POST /api/survey — создаёт черновик «Новый опрос» и возвращает id"
              >
                {creating ? 'Создание…' : 'Создать пустой опрос'}
              </button>
              <button
                type="button"
                className={btnSecondary}
                onClick={handleRefresh}
                disabled={loading}
                title="GET /api/survey — перезагрузить список опросов"
              >
                Обновить
              </button>
            </div>

            {loading ? (
              <p className="text-sm text-gray-500">Загрузка…</p>
            ) : surveys.length === 0 ? (
              <p className="text-sm text-gray-500">Опросов пока нет — создайте первый.</p>
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-200">
                      <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Id
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Название
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Описание
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Статус
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Создан
                      </th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {surveys.map((survey) => (
                      <tr key={survey.id} className="hover:bg-gray-50/50 transition">
                        <td className="px-4 py-3 text-gray-500 font-mono">{survey.id}</td>
                        <td className="px-4 py-3 font-medium">
                          <button
                            type="button"
                            onClick={() => onOpenSurvey(survey.id)}
                            className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-left"
                          >
                            {survey.name}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{survey.description || '—'}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                            {survey.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{formatDate(survey.createdAt)}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 rounded-lg transition cursor-pointer"
                            onClick={() => handleDeleteSurvey(survey.id, survey.name)}
                          >
                            Удалить
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <Section
            title="Пользователи"
            endpoints={<>POST /api/user · GET /api/user/&#123;id&#125;</>}
          >
            <form className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4" onSubmit={handleCreateUser}>
              <Field label="Имя" hint="ФИО или отображаемое имя. Поле name в POST /api/user.">
                <input
                  className={inputClass}
                  placeholder="Например: Иван Иванов"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  required
                />
              </Field>
              <Field label="Email" hint="Контактный email пользователя. Поле email в POST /api/user.">
                <input
                  className={inputClass}
                  type="email"
                  placeholder="Например: ivan@company.ru"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  required
                />
              </Field>
              <div className="flex items-end">
                <button type="submit" className={`${btnPrimary} w-full`} disabled={userBusy}>
                  {userBusy ? '…' : 'Создать пользователя'}
                </button>
              </div>
            </form>

            {knownUserIds.length > 0 ? (
              <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2 bg-gray-50/80 border-b border-gray-200 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  В базе (из ответов опросов)
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-200">
                      <th className={thClass}>Id</th>
                      <th className={thClass} />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {knownUserIds.map((userId) => (
                      <tr key={userId} className="hover:bg-gray-50/50">
                        <td className={`${tdClass} font-mono`}>{userId}</td>
                        <td className={`${tdClass} text-right`}>
                          <button
                            type="button"
                            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition cursor-pointer disabled:opacity-50"
                            onClick={() => handleGetUser(userId)}
                            disabled={userBusy}
                          >
                            Получить
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-gray-400 mt-3">
                Пользователей в ответах пока нет — создайте пользователя или укажите id вручную.
              </p>
            )}

            <JsonBlock data={userResult} />
          </Section>

          <Section
            title="Вопросы"
            endpoints={
              <>
                POST /api/question · GET /api/question/&#123;id&#125; · DELETE /api/question/&#123;id&#125;
              </>
            }
          >
            <form className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4" onSubmit={handleCreateQuestion}>
              <div className="md:col-span-2">
                <Field label="Survey id" hint="Id опроса из таблицы «Опросы». Поле surveyId.">
                  <input
                    className={inputClass}
                    type="number"
                    min={1}
                    placeholder="1"
                    value={questionSurveyId}
                    onChange={(e) => setQuestionSurveyId(e.target.value)}
                    required
                  />
                </Field>
              </div>
              <div className="md:col-span-5">
                <Field label="Текст вопроса" hint="Формулировка, которую увидит респондент. Поле text.">
                  <input
                    className={inputClass}
                    placeholder="Как вы оцениваете работу коллеги?"
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    required
                  />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Тип вопроса" hint="Произвольная строка: rating, text, choice.">
                  <input
                    className={inputClass}
                    placeholder="rating"
                    value={questionType}
                    onChange={(e) => setQuestionType(e.target.value)}
                    required
                  />
                </Field>
              </div>
              <div className="md:col-span-3 flex items-end">
                <button type="submit" className={`${btnPrimary} w-full`} disabled={questionBusy}>
                  {questionBusy ? '…' : 'Создать вопрос'}
                </button>
              </div>
            </form> 

            {knownQuestions.length > 0 ? (
              <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2 bg-gray-50/80 border-b border-gray-200 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  В базе (из опросов)
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-200">
                      <th className={thClass}>Id</th>
                      <th className={thClass}>Survey</th>
                      <th className={thClass}>Текст</th>
                      <th className={thClass}>Тип</th>
                      <th className={thClass} />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {knownQuestions.map((question) => (
                      <tr key={question.id} className="hover:bg-gray-50/50">
                        <td className={`${tdClass} font-mono`}>{question.id}</td>
                        <td className={tdClass}>{question.surveyId}</td>
                        <td className={tdClass}>{question.text || '—'}</td>
                        <td className={tdClass}>{question.type || '—'}</td>
                        <td className={`${tdClass} text-right whitespace-nowrap`}>
                          <button
                            type="button"
                            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition cursor-pointer disabled:opacity-50 mr-1"
                            onClick={() => handleGetQuestion(question.id)}
                            disabled={questionBusy}
                          >
                            Получить
                          </button>
                          <button
                            type="button"
                            className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 rounded-lg transition cursor-pointer disabled:opacity-50"
                            onClick={() => handleDeleteQuestion(question.id)}
                            disabled={questionBusy}
                          >
                            Удалить
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-gray-400 mt-3">
                Вопросов пока нет — создайте вопрос или укажите id вручную.
              </p>
            )}

            <JsonBlock data={questionResult} />
            {questionResult && (
              <p className="text-xs text-gray-400 mt-2">
                Ответы к вопросу: {questionResult.answers.length}. После создания ответа блок обновится
                автоматически.
              </p>
            )}
          </Section>

          <Section
            title="Ответы"
            endpoints={<>POST /api/answer · GET /api/answer/&#123;id&#125;</>}
          >
            <form className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4" onSubmit={handleCreateAnswer}>
              <div className="md:col-span-2">
                <Field label="Question id" hint="Id вопроса из раздела «Вопросы». Поле questionId.">
                  <input
                    className={inputClass}
                    type="number"
                    min={1}
                    placeholder="1"
                    value={answerQuestionId}
                    onChange={(e) => setAnswerQuestionId(e.target.value)}
                    required
                  />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="User id" hint="Id пользователя-респондента. Поле userId.">
                  <input
                    className={inputClass}
                    type="number"
                    min={1}
                    placeholder="1"
                    value={answerUserId}
                    onChange={(e) => setAnswerUserId(e.target.value)}
                    required
                  />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Target id" hint="Id пользователя, которого оценивают. Поле targetId.">
                  <input
                    className={inputClass}
                    type="number"
                    min={1}
                    placeholder="1"
                    value={answerTargetId}
                    onChange={(e) => setAnswerTargetId(e.target.value)}
                    required
                  />
                </Field>
              </div>
              <div className="md:col-span-3">
                <Field label="Текст ответа" hint="Значение: «5» для rating, текст для text. Поле text.">
                  <input
                    className={inputClass}
                    placeholder="5"
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    required
                  />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Тип ответа" hint="Обычно совпадает с типом вопроса. Поле type.">
                  <input
                    className={inputClass}
                    placeholder="rating"
                    value={answerType}
                    onChange={(e) => setAnswerType(e.target.value)}
                    required
                  />
                </Field>
              </div>
              <div className="md:col-span-3 flex items-end">
                <button type="submit" className={`${btnPrimary} w-full`} disabled={answerBusy}>
                  {answerBusy ? '…' : 'Создать ответ'}
                </button>
              </div>
            </form>

            {knownAnswers.length > 0 ? (
              <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2 bg-gray-50/80 border-b border-gray-200 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  В базе (из опросов)
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-200">
                      <th className={thClass}>Id</th>
                      <th className={thClass}>Question</th>
                      <th className={thClass}>User</th>
                      <th className={thClass}>Текст</th>
                      <th className={thClass} />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {knownAnswers.map((answer) => (
                      <tr key={answer.id} className="hover:bg-gray-50/50">
                        <td className={`${tdClass} font-mono`}>{answer.id}</td>
                        <td className={tdClass}>{answer.questionId}</td>
                        <td className={tdClass}>{answer.userId}</td>
                        <td className={tdClass}>{answer.text || '—'}</td>
                        <td className={`${tdClass} text-right whitespace-nowrap`}>
                          <button
                            type="button"
                            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition cursor-pointer disabled:opacity-50 mr-1"
                            onClick={() => handleGetAnswer(answer.id)}
                            disabled={questionBusy}
                          >
                            Получить
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-gray-400 mt-3">
                Ответов пока нет — создайте ответ или укажите id вручную.
              </p>
            )}

            <JsonBlock data={answerResult} />
          </Section>
        </div>
      </div>

      {confirmAction?.kind === 'delete-survey' && (
        <ConfirmModal
          title="Удалить опрос?"
          variant="danger"
          confirmLabel="Удалить"
          loadingLabel="Удаление…"
          loading={deletingSurveyId === confirmAction.id}
          onConfirm={confirmDeleteSurvey}
          onCancel={() => deletingSurveyId === null && setConfirmAction(null)}
          message={
            <>
              Опрос{' '}
              <span className="font-semibold text-gray-900">
                «{confirmAction.name}» (id {confirmAction.id})
              </span>{' '}
              будет удалён безвозвратно.
            </>
          }
        />
      )}

      {confirmAction?.kind === 'delete-question' && (
        <ConfirmModal
          title="Удалить вопрос?"
          variant="danger"
          confirmLabel="Удалить"
          loadingLabel="Удаление…"
          loading={questionBusy}
          onConfirm={confirmDeleteQuestion}
          onCancel={() => !questionBusy && setConfirmAction(null)}
          message={
            <>
              Вопрос <span className="font-semibold text-gray-900">id {confirmAction.id}</span> будет
              удалён безвозвратно.
            </>
          }
        />
      )}

      {confirmAction?.kind === 'clear-database' && (
        <ConfirmModal
          title="Очистить базу данных?"
          variant="danger"
          confirmLabel="Очистить"
          loadingLabel="Очистка…"
          loading={clearingDb}
          onConfirm={confirmClearDatabase}
          onCancel={() => !clearingDb && setConfirmAction(null)}
          message={
            <>
              Будут удалены <span className="font-semibold text-gray-900">все</span> опросы, пользователи,
              вопросы, ответы и назначения. Это действие нельзя отменить.
            </>
          }
        />
      )}
    </>
  )
}
