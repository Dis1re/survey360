import { useEffect, useState } from 'react'
import { answerApi, surveyApi, userApi } from '../api'
import { Modal } from '../components/Modal'
import { apiQuestionToQuestion, mapQuestionTypeToApi, mapSurveyStatus } from '../mappers'
import { parseSurveyResponseParams } from '../routing'
import type { ApiSurvey, ApiUser, Question } from '../types'

interface TakeSurveyProps {
  surveyId: number
  onBack?: () => void
  standalone?: boolean
  lockedReviewerId?: number
}

interface TargetEntry {
  user: ApiUser
  completed: boolean
}

function UserPicker({
  surveyId,
  onSelect,
  onBack,
  showBack = true,
}: {
  surveyId: number
  onSelect: (id: number) => void
  onBack: () => void
  showBack?: boolean
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
        {showBack && (
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer"
          >
            Назад
          </button>
        )}
        <button
          type="button"
          onClick={() => selectedId !== null && onSelect(selectedId)}
          disabled={selectedId === null}
          className={`${showBack ? 'flex-1' : 'w-full'} bg-[#FF8600] hover:bg-[#FF6B00] disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-xl transition shadow-sm cursor-pointer`}
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
  reviewerLocked = false,
}: {
  surveyId: number
  userId: number
  onSelect: (id: number, completed: boolean) => void
  onBack: () => void
  reviewerLocked?: boolean
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
        setSelectedId(entries.find((t) => !t.completed)?.user.id ?? entries[0]?.user.id ?? null)
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
              const isActive = user.id === selectedId
              return (
                <label
                  key={user.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition cursor-pointer ${
                    completed
                      ? isActive
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-100 bg-gray-50 hover:bg-gray-100'
                      : isActive
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="target"
                    checked={isActive}
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
        {!reviewerLocked && (
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer"
          >
            Сменить пользователя
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            if (selectedId === null) return
            const entry = targets.find((t) => t.user.id === selectedId)
            onSelect(selectedId, entry?.completed ?? false)
          }}
          disabled={selectedId === null}
          className={`${reviewerLocked ? 'w-full' : 'flex-1'} bg-[#FF8600] hover:bg-[#FF6B00] disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-xl transition shadow-sm cursor-pointer`}
        >
          {targets.find((t) => t.user.id === selectedId)?.completed ? 'Просмотреть ответы' : 'Перейти к опросу'}
        </button>
      </div>
    </div>
  )
}

export function TakeSurvey({ surveyId, onBack, standalone = false, lockedReviewerId }: TakeSurveyProps) {
  const initialParams = parseSurveyResponseParams()
  const initialReviewerId = lockedReviewerId ?? initialParams.reviewerId
  const [survey, setSurvey] = useState<ApiSurvey | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [users, setUsers] = useState<ApiUser[]>([])
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [userId, setUserId] = useState<number | null>(initialReviewerId)
  const [targetId, setTargetId] = useState<number | null>(initialParams.targetId)
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [targetModalOpen, setTargetModalOpen] = useState(false)
  const [readOnly, setReadOnly] = useState(false)
  const [assignmentChecked, setAssignmentChecked] = useState(
    initialReviewerId === null || initialParams.targetId === null,
  )

  const [surveyClosed, setSurveyClosed] = useState(false)

  const reviewerLocked = lockedReviewerId !== undefined
  const showUserModal = !reviewerLocked && (userModalOpen || userId === null)
  const showTargetModal = !showUserModal && (targetModalOpen || targetId === null)

  useEffect(() => {
    setLoading(true)
    surveyApi
      .get(surveyId)
      .then(async (details) => {
        setSurvey(details.survey)
        setQuestions(details.questions.map(apiQuestionToQuestion))
        setUsers(await userApi.list())
        const status = mapSurveyStatus(details.survey.status)
        setSurveyClosed(status !== 'active')
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [surveyId])

  useEffect(() => {
    if (userId === null || targetId === null) {
      setReadOnly(false)
      setAssignmentChecked(true)
      return
    }

    let cancelled = false
    setAssignmentChecked(false)
    surveyApi
      .get(surveyId)
      .then((details) => {
        if (cancelled) return
        const assignment = details.assignments.find(
          (a) => a.reviewerId === userId && a.targetId === targetId && a.isAssigned,
        )
        if (!assignment) {
          setError('Назначение не найдено в матрице опроса')
          setReadOnly(false)
          return
        }

        if (assignment.isCompleted) {
          setReadOnly(true)
          const saved: Record<number, string> = {}
          for (const answer of details.answers) {
            if (answer.userId === userId && answer.targetId === targetId) {
              saved[answer.questionId] = answer.text
            }
          }
          setAnswers(saved)
        } else {
          setReadOnly(false)
        }
        setError(null)
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setAssignmentChecked(true)
      })

    return () => {
      cancelled = true
    }
  }, [surveyId, userId, targetId])

  const storageKey =
    assignmentChecked &&
    !readOnly &&
    userId !== null &&
    targetId !== null
      ? `take-survey:${surveyId}:${userId}:${targetId}`
      : null

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
    if (readOnly) return
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const handleSelectUser = (id: number) => {
    setUserId(id)
    setTargetId(null)
    setUserModalOpen(false)
    setTargetModalOpen(true)
  }

  const handleSelectTarget = (id: number, completed: boolean) => {
    setTargetId(id)
    setTargetModalOpen(false)
    setReadOnly(completed)
    if (!completed) setAnswers({})
  }

  const handleBackToUsers = () => {
    setSubmitted(false)
    setTargetModalOpen(false)
    if (reviewerLocked) {
      setTargetId(null)
      setTargetModalOpen(true)
    } else {
      setUserModalOpen(true)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (readOnly || userId === null || targetId === null) return
    const answered = questions.filter((q) => (answers[q.id] ?? '').trim() !== '')
    if (answered.length === 0) {
      setError('Заполните хотя бы один вопрос')
      return
    }

    const missingRequired = questions.filter(
      (q) => q.isRequired && (answers[q.id] ?? '').trim() === '',
    )
    if (missingRequired.length > 0) {
      setError('Не заполнены обязательные вопросы')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      for (const question of answered) {
        await answerApi.create({
          questionId: question.id,
          userId,
          targetId,
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
      setError(err instanceof Error ? err.message : 'Не удалось сохранить ответы')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh] p-6">
        <p className="text-sm text-gray-500">Загрузка опроса…</p>
      </div>
    )
  }

  if (surveyClosed && !readOnly) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">{survey?.name ?? 'Опрос'}</h2>
          <p className="text-sm text-gray-500 mt-3">
            {mapSurveyStatus(survey?.status ?? '') === 'closed'
              ? 'Этот опрос завершён и больше недоступен для заполнения.'
              : 'Опрос ещё не опубликован. Дождитесь, пока организатор запустит его.'}
          </p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <div className="mx-auto w-20 h-20 rounded-full bg-green-100 flex items-center justify-center overflow-hidden">
            <img src="/cat_icon.webp" alt="Успешное завершение" className="w-full h-full object-cover" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mt-4">Спасибо!</h2>
          <p className="text-sm text-gray-500 mt-1">Ваши ответы успешно сохранены в базе данных.</p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={handleBackToUsers}
              className="px-4 py-2 text-sm font-medium text-gray-600 border-2 border-orange-300 rounded-xl hover:bg-orange-50 cursor-pointer"
            >
              {reviewerLocked ? 'Оценить ещё' : standalone ? 'Оценить ещё' : 'Другой пользователь'}
            </button>
            {!standalone && onBack && (
              <button
                type="button"
                onClick={onBack}
                className="px-4 py-2 text-sm font-medium text-white bg-[#FF8600] hover:bg-[#FF6B00] rounded-xl cursor-pointer"
              >
                Вернуться к опросам
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }



  return (
    <div className="max-w-2xl mx-auto p-6">
      {!standalone && onBack && (
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
            {!reviewerLocked && (
              <button
                type="button"
                onClick={() => setUserModalOpen(true)}
                className="text-xs font-medium text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 cursor-pointer"
              >
                Сменить пользователя
              </button>
            )}
              <button
                type="button"
                onClick={() => setTargetModalOpen(true)}
                className="text-xs font-medium text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 cursor-pointer"
              >
                Сменить цель
              </button>
          </div>
        </div>
      )}

      {standalone && userId !== null && targetId !== null && (
        <div className="flex justify-end gap-2 mb-4">
            {!reviewerLocked && (
              <button
                type="button"
                onClick={() => setUserModalOpen(true)}
                className="text-xs font-medium text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 cursor-pointer"
              >
                Сменить пользователя
              </button>
            )}
          <button
            type="button"
            onClick={() => setTargetModalOpen(true)}
            className="text-xs font-medium text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 cursor-pointer"
          >
            Сменить цель
          </button>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mb-5">
        <h1 className="text-2xl font-semibold text-gray-900">{survey?.name}</h1>
        {readOnly && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-gray-100 border border-gray-200 px-4 py-2.5 text-sm text-gray-600">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Режим просмотра — ответы нельзя изменить
          </div>
        )}
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

      <form onSubmit={handleSubmit} className={`space-y-4 ${readOnly ? 'opacity-75' : ''}`}>
        {questions.length === 0 ? (
          <p className="text-sm text-gray-400">В этом опросе пока нет вопросов.</p>
        ) : (
          questions.map((question, index) => (
            <div key={question.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <label className="block text-sm font-medium text-gray-900 mb-3">
                <span className="text-gray-400 mr-1.5">{index + 1}.</span>
                {question.text}
                {question.isRequired && (
                  <span className="ml-1.5 text-red-500" title="Обязательный вопрос">
                    *
                  </span>
                )}
              </label>
              <QuestionInput
                question={question}
                value={answers[question.id] ?? ''}
                onChange={(v) => setAnswer(question.id, v)}
                readOnly={readOnly}
              />
            </div>
          ))
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        {!readOnly && (
          <button
            type="submit"
            disabled={submitting || questions.length === 0}
            className="w-full bg-[#FF8600] hover:bg-[#FF6B00] disabled:opacity-50 text-white font-medium py-3 px-4 rounded-xl transition shadow-sm cursor-pointer"
          >
            {submitting ? 'Отправка…' : 'Отправить ответы'}
          </button>
        )}
      </form>

      {showUserModal && (
        <Modal title="Выбор пользователя">
          <UserPicker
            surveyId={surveyId}
            onSelect={handleSelectUser}
            onBack={onBack ?? (() => {})}
            showBack={!standalone || userId !== null}
          />
        </Modal>
      )}

      {showTargetModal && userId !== null && (
        <Modal title="Выбор цели опроса">
          <TargetPicker
            surveyId={surveyId}
            userId={userId}
            onSelect={handleSelectTarget}
            onBack={handleBackToUsers}
            reviewerLocked={reviewerLocked}
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
  readOnly = false,
}: {
  question: Question
  value: string
  onChange: (value: string) => void
  readOnly?: boolean
}) {
  if (question.type === 'scale') {
    const selected = value ? Number(value) : null
    const min = Number(question.props?.min ?? 1)
    const max = Number(question.props?.max ?? 5)
    const baseStep = Math.max(1, Math.abs(Math.round(Number(question.props?.step ?? 1))))
    const step = min > max ? -baseStep : baseStep
    const values: number[] = []
    if (baseStep !== 0) {
      if (step > 0) {
        for (let n = min; n <= max; n += step) values.push(Math.round(n))
      } else {
        for (let n = min; n >= max; n += step) values.push(Math.round(n))
      }
    } else {
      for (let n = 1; n <= 5; n++) values.push(n)
    }
    return (
      <div className="flex flex-wrap gap-2">
        {values.map((n) => (
          <button
            key={n}
            type="button"
            disabled={readOnly}
            onClick={() => onChange(String(n))}
            className={`flex-1 min-w-[44px] py-3 rounded-xl border text-sm font-semibold transition ${
              readOnly ? 'cursor-default' : 'cursor-pointer'
            } ${
              selected === n
                ? 'border-[#FF8600] bg-orange-50 text-[#FF6B00]'
                : readOnly
                  ? 'border-gray-200 text-gray-400 bg-gray-50'
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
          readOnly={readOnly}
          disabled={readOnly}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ваш ответ"
          className={`w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 ${
            readOnly ? 'bg-gray-50 text-gray-600 cursor-default' : ''
          }`}
        />
      )
    }
    return (
      <div className="space-y-2">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={`flex items-start gap-3 p-3 rounded-xl border transition ${
              readOnly ? 'cursor-default' : 'cursor-pointer'
            } ${
              value === String(opt.value) ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:bg-gray-50'
            } ${readOnly ? 'opacity-80' : ''}`}
          >
            <input
              type="radio"
              name={`q-${question.id}`}
              checked={value === String(opt.value)}
              disabled={readOnly}
              onChange={() => onChange(String(opt.value))}
              className="w-4 h-4 text-blue-600 mt-0.5 shrink-0"
            />
            <span className="text-sm text-gray-800 min-w-0 flex-1 break-words">
              {opt.label || String(opt.value)}
            </span>
          </label>
        ))}
      </div>
    )
  }

  return (
    <textarea
      value={value}
      readOnly={readOnly}
      disabled={readOnly}
      onChange={(e) => onChange(e.target.value)}
      rows={4}
      placeholder="Ваш развёрнутый ответ…"
      className={`w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 resize-none ${
        readOnly ? 'bg-gray-50 text-gray-600 cursor-default' : ''
      }`}
    />
  )
}

