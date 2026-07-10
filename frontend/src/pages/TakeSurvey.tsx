import { useEffect, useState } from 'react'
import { answerApi, surveyApi, userApi } from '../api'
import { Modal } from '../components/Modal'
import { apiQuestionToQuestion, mapQuestionTypeToApi } from '../mappers'
import type { ApiSurvey, ApiUser, Question } from '../types'

interface TakeSurveyProps {
  surveyId: number
  onBack: () => void
}

interface TargetEntry {
  user: ApiUser
  completed: boolean
}

function UserPicker({
  surveyId,
  onSelect,
  onBack,
}: {
  surveyId: number
  onSelect: (id: number) => void
  onBack: () => void
}) {
  const [users, setUsers] = useState<ApiUser[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  useEffect(() => {
    setLoading(true)
    surveyApi
      .getMatrix(surveyId)
      .then((matrix) => {
        setUsers(matrix.respondents)
        setSelectedId(matrix.respondents[0]?.id ?? null)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [surveyId])

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Укажите, за кого вы проходите опрос. Ответы будут записаны в базу данных под этим пользователем.
      </p>
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Участники опроса</span>
        {loading ? (
          <p className="text-sm text-gray-400 mt-3">Загрузка…</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-gray-400 mt-3">Нет пользователей, назначенных на этот опрос</p>
        ) : (
          <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
            {users.map((user) => {
              const isActive = user.id === selectedId
              return (
                <label
                  key={user.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="participant"
                    checked={isActive}
                    onChange={() => setSelectedId(user.id)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{user.name}</div>
                    <div className="text-xs text-gray-500 truncate">{user.email}</div>
                  </div>
                </label>
              )
            })}
          </div>
        )}
      </div>
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer"
        >
          Назад
        </button>
        <button
          type="button"
          onClick={() => selectedId !== null && onSelect(selectedId)}
          disabled={selectedId === null}
          className="flex-1 bg-[#FF8600] hover:bg-[#FF6B00] disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-xl transition shadow-sm cursor-pointer"
        >
          Далее
        </button>
      </div>
    </div>
  )
}

function TargetPicker({
  surveyId,
  userId,
  onSelect,
  onBack,
}: {
  surveyId: number
  userId: number
  onSelect: (id: number) => void
  onBack: () => void
}) {
  const [targets, setTargets] = useState<TargetEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([surveyApi.get(surveyId), userApi.list()])
      .then(([details, users]) => {
        const entries = details.assignments
          .filter((a) => a.isAssigned && a.reviewerId === userId)
          .map((a) => {
            const user = users.find((u) => u.id === a.targetId)
            return user ? { user, completed: a.isCompleted } : null
          })
          .filter((e): e is TargetEntry => e !== null)
        setTargets(entries)
        setSelectedId(entries.find((t) => !t.completed)?.user.id ?? null)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [surveyId, userId])

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        По кому вы хотите пройти опрос? Один и тот же пользователь может оценивать несколько целей.
      </p>
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Доступные цели</span>
        {loading ? (
          <p className="text-sm text-gray-400 mt-3">Загрузка…</p>
        ) : targets.length === 0 ? (
          <p className="text-sm text-gray-400 mt-3">Для этого пользователя нет назначенных целей</p>
        ) : (
          <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
            {targets.map(({ user, completed }) => {
              const isActive = user.id === selectedId && !completed
              return (
                <label
                  key={user.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition ${
                    completed
                      ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                      : isActive
                        ? 'border-blue-500 bg-blue-50 cursor-pointer'
                        : 'border-gray-100 hover:bg-gray-50 cursor-pointer'
                  }`}
                >
                  <input
                    type="radio"
                    name="target"
                    checked={isActive}
                    disabled={completed}
                    onChange={() => setSelectedId(user.id)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900 truncate">{user.name}</div>
                    <div className="text-xs text-gray-500 truncate">{user.email}</div>
                  </div>
                  {completed && (
                    <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Пройден
                    </span>
                  )}
                </label>
              )
            })}
          </div>
        )}
      </div>
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer"
        >
          Сменить пользователя
        </button>
        <button
          type="button"
          onClick={() => selectedId !== null && onSelect(selectedId)}
          disabled={selectedId === null}
          className="flex-1 bg-[#FF8600] hover:bg-[#FF6B00] disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-xl transition shadow-sm cursor-pointer"
        >
          Перейти к опросу
        </button>
      </div>
    </div>
  )
}

export function TakeSurvey({ surveyId, onBack }: TakeSurveyProps) {
  const [survey, setSurvey] = useState<ApiSurvey | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [users, setUsers] = useState<ApiUser[]>([])
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [userId, setUserId] = useState<number | null>(null)
  const [targetId, setTargetId] = useState<number | null>(null)
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [targetModalOpen, setTargetModalOpen] = useState(false)

  const showUserModal = userModalOpen || userId === null
  const showTargetModal = !showUserModal && (targetModalOpen || targetId === null)

  useEffect(() => {
    setLoading(true)
    surveyApi
      .get(surveyId)
      .then(async (details) => {
        setSurvey(details.survey)
        setQuestions(details.questions.map(apiQuestionToQuestion))
        setUsers(await userApi.list())
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [surveyId])

  const storageKey =
    userId !== null && targetId !== null ? `take-survey:${surveyId}:${userId}:${targetId}` : null

  useEffect(() => {
    if (!storageKey) {
      setAnswers({})
      return
    }
    try {
      const saved = localStorage.getItem(storageKey)
      setAnswers(saved ? (JSON.parse(saved) as Record<number, string>) : {})
    } catch {
      setAnswers({})
    }
  }, [storageKey])

  useEffect(() => {
    if (!storageKey) return
    try {
      localStorage.setItem(storageKey, JSON.stringify(answers))
    } catch {
      /* storage unavailable */
    }
  }, [answers, storageKey])

  const respondent = userId !== null ? users.find((u) => u.id === userId) ?? null : null
  const target = targetId !== null ? users.find((u) => u.id === targetId) ?? null : null

  const setAnswer = (questionId: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const handleSelectUser = (id: number) => {
    setUserId(id)
    setTargetId(null)
    setUserModalOpen(false)
    setTargetModalOpen(true)
  }

  const handleSelectTarget = (id: number) => {
    setTargetId(id)
    setTargetModalOpen(false)
  }

  const handleBackToUsers = () => {
    setSubmitted(false)
    setTargetModalOpen(false)
    setUserModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (userId === null || targetId === null) return
    const answered = questions.filter((q) => (answers[q.id] ?? '').trim() !== '')
    if (answered.length === 0) {
      setError('Заполните хотя бы один вопрос')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      for (const question of answered) {
        await answerApi.create({
          questionId: question.id,
          userId,
          text: answers[question.id].trim(),
          type: mapQuestionTypeToApi(question.type),
        })
      }
      await surveyApi.completeAssignment(surveyId, { reviewerId: userId, targetId })
      setSubmitted(true)
      if (storageKey) {
        try {
          localStorage.removeItem(storageKey)
        } catch {
          /* storage unavailable */
        }
      }
    } catch (err) {
      console.error(err)
      setError('Не удалось сохранить ответы')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <p className="text-sm text-gray-500">Загрузка опроса…</p>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <div className="mx-auto w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mt-4">Спасибо!</h2>
          <p className="text-sm text-gray-500 mt-1">Ваши ответы успешно сохранены в базе данных.</p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={handleBackToUsers}
              className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer"
            >
              Другой пользователь
            </button>
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 text-sm font-medium text-white bg-[#FF8600] hover:bg-[#FF6B00] rounded-xl cursor-pointer"
            >
              Вернуться к опросам
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Назад
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setUserModalOpen(true)}
            className="text-xs font-medium text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 cursor-pointer"
          >
            Сменить пользователя
          </button>
          <button
            type="button"
            onClick={() => setTargetModalOpen(true)}
            className="text-xs font-medium text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 cursor-pointer"
          >
            Сменить цель
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mb-5">
        <h1 className="text-2xl font-semibold text-gray-900">{survey?.name}</h1>
        {survey?.description && (
          <p className="text-sm text-gray-500 mt-1">{survey.description}</p>
        )}
        {respondent && (
          <p className="text-xs text-gray-400 mt-2">
            Ответы записываются за пользователя: <span className="font-medium text-gray-600">{respondent.name}</span>
          </p>
        )}
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-orange-100 border-2 border-orange-300 px-4 py-3 shadow-sm">
          <svg className="w-6 h-6 text-[#FF6B00] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-sm text-gray-600">
            Опрос по:{' '}
            <span className="ml-1 text-lg font-bold text-gray-900">
              {target ? target.name : '— не задано —'}
            </span>
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {questions.length === 0 ? (
          <p className="text-sm text-gray-400">В этом опросе пока нет вопросов.</p>
        ) : (
          questions.map((question, index) => (
            <div key={question.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <label className="block text-sm font-medium text-gray-900 mb-3">
                <span className="text-gray-400 mr-1.5">{index + 1}.</span>
                {question.text}
              </label>
              <QuestionInput question={question} value={answers[question.id] ?? ''} onChange={(v) => setAnswer(question.id, v)} />
            </div>
          ))
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={submitting || questions.length === 0}
          className="w-full bg-[#FF8600] hover:bg-[#FF6B00] disabled:opacity-50 text-white font-medium py-3 px-4 rounded-xl transition shadow-sm cursor-pointer"
        >
          {submitting ? 'Отправка…' : 'Отправить ответы'}
        </button>
      </form>

      {showUserModal && (
        <Modal title="Выбор пользователя">
          <UserPicker surveyId={surveyId} onSelect={handleSelectUser} onBack={onBack} />
        </Modal>
      )}

      {showTargetModal && userId !== null && (
        <Modal title="Выбор цели опроса">
          <TargetPicker
            surveyId={surveyId}
            userId={userId}
            onSelect={handleSelectTarget}
            onBack={handleBackToUsers}
          />
        </Modal>
      )}
    </div>
  )
}

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: Question
  value: string
  onChange: (value: string) => void
}) {
  if (question.type === 'scale') {
    const selected = value ? Number(value) : null
    return (
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(String(n))}
            className={`flex-1 py-3 rounded-xl border text-sm font-semibold transition cursor-pointer ${
              selected === n
                ? 'border-[#FF8600] bg-orange-50 text-[#FF6B00]'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    )
  }

  if (question.type === 'radio') {
    const options = question.options ?? []
    if (options.length === 0) {
      return (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ваш ответ"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
        />
      )
    }
    return (
      <div className="space-y-2">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
              value === opt.label ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:bg-gray-50'
            }`}
          >
            <input
              type="radio"
              name={`q-${question.id}`}
              checked={value === opt.label}
              onChange={() => onChange(opt.label)}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm text-gray-800">{opt.label || String(opt.value)}</span>
          </label>
        ))}
      </div>
    )
  }

  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={4}
      placeholder="Ваш развёрнутый ответ…"
      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 resize-none"
    />
  )
}
