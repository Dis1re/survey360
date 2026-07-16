import { useEffect, useState } from 'react'
import { answerApi, surveyApi, userApi } from '../api'
import { Modal } from '../components/Modal'
import { QuestionInput } from '../components/QuestionInput'
import { apiQuestionToQuestion, mapQuestionTypeToApi, mapSurveyStatus } from '../mappers'
import { parseSurveyResponseParams } from '../routing'
import type { ApiSurvey, ApiUser, Question } from '../types'

interface TakeSurveyProps {
  surveyId: number
  onBack?: () => void
  standalone?: boolean
  authUserId?: number | null
  hideUserSwitch?: boolean
  lockedReviewerId?: number
  preview?: boolean
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
      <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">
        Укажите, за кого вы проходите опрос. Ответы будут записаны в базу данных под этим пользователем.
      </p>
      <div className="bg-white dark:bg-[#1e222e] border border-gray-200 dark:border-[#3a4250] rounded-2xl p-5 shadow-sm">
        <span className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">Участники опроса</span>
        {loading ? (
          <p className="text-sm text-gray-400 dark:text-gray-400 mt-3">Загрузка…</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-400 mt-3">Нет пользователей, назначенных на этот опрос</p>
        ) : (
          <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
            {users.map((user) => {
              const isActive = user.id === selectedId
              return (
                <label
                  key={user.id}
                  className={`soft-lift flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${
                    isActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="participant"
                    checked={isActive}
                    onChange={() => setSelectedId(user.id)}
                    className="w-4 h-4 text-blue-600 dark:text-blue-400"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-300 truncate">{user.email}</div>
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
            className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-200 border border-gray-200 dark:border-[#3a4250] rounded-xl hover:bg-gray-50 dark:hover:bg-[#1e222e] cursor-pointer"
          >
            Назад
          </button>
        )}
        <button
          type="button"
          onClick={() => selectedId !== null && onSelect(selectedId)}
          disabled={selectedId === null}
          className={`${showBack ? 'flex-1' : 'w-full'} bg-[#FF8600] hover:bg-[#FF6B00] disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-xl soft-press shadow-sm cursor-pointer`}
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
  backLabel = 'Сменить пользователя',
  hideBackButton = false,
}: {
  surveyId: number
  userId: number
  onSelect: (id: number, completed: boolean) => void
  onBack: () => void
  backLabel?: string
  hideBackButton?: boolean
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
      <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">
        По кому вы хотите пройти опрос? Один и тот же пользователь может оценивать несколько целей.
      </p>
      <div className="bg-white dark:bg-[#1e222e] border border-gray-200 dark:border-[#3a4250] rounded-2xl p-5 shadow-sm">
        <span className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">Доступные цели</span>
        {loading ? (
          <p className="text-sm text-gray-400 dark:text-gray-400 mt-3">Загрузка…</p>
        ) : targets.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-400 mt-3">Для этого пользователя нет назначенных целей</p>
        ) : (
          <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
            {targets.map(({ user, completed }) => {
              const isActive = user.id === selectedId
              return (
                <label
                  key={user.id}
                  className={`soft-lift flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    isActive
                      ? 'border-[#FF8600] bg-orange-50 dark:bg-[#FF8600]/12'
                      : 'border-gray-200 dark:border-[#3a4250] bg-white dark:bg-[#1e222e] hover:border-gray-300 dark:hover:border-[#454f60] hover:bg-gray-50 dark:hover:bg-[#262d3a]'
                  }`}
                >
                  <input
                    type="radio"
                    name="target"
                    checked={isActive}
                    onChange={() => setSelectedId(user.id)}
                    className="w-4 h-4 text-[#FF8600] dark:text-[#FF8600]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-300 truncate">{user.email}</div>
                  </div>
                  {completed && (
                    <span className="text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
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
        {!hideBackButton && (
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-200 border border-gray-200 dark:border-[#3a4250] rounded-xl hover:bg-gray-50 dark:hover:bg-[#1e222e] cursor-pointer"
          >
            {backLabel}
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
          className={`${hideBackButton ? 'w-full' : 'flex-1'} bg-[#FF8600] hover:bg-[#FF6B00] disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-xl soft-press shadow-sm cursor-pointer`}
        >
          {targets.find((t) => t.user.id === selectedId)?.completed ? 'Просмотреть ответы' : 'Перейти к опросу'}
        </button>
      </div>
    </div>
  )
}

export function TakeSurvey({
  surveyId,
  onBack,
  standalone = false,
  authUserId = null,
  hideUserSwitch = false,
  lockedReviewerId,
  preview = false,
}: TakeSurveyProps) {
  const initialParams = parseSurveyResponseParams()
  const initialReviewerId = authUserId ?? lockedReviewerId ?? initialParams.reviewerId
  const [survey, setSurvey] = useState<ApiSurvey | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [users, setUsers] = useState<ApiUser[]>([])
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [autoResolvingTarget, setAutoResolvingTarget] = useState(() => {
    const params = parseSurveyResponseParams()
    const initialUser = authUserId ?? lockedReviewerId ?? params.reviewerId
    return Boolean(hideUserSwitch && lockedReviewerId === undefined && initialUser != null && params.targetId === null)
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [thanksPopupOpen, setThanksPopupOpen] = useState(true)
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

  const lockedUserId = authUserId ?? lockedReviewerId ?? userId
  const reviewerLocked = lockedReviewerId !== undefined
  const userPickerLocked = hideUserSwitch || reviewerLocked
  const autoPickTarget = hideUserSwitch && !reviewerLocked
  const showUserModal = !preview && !userPickerLocked && (userModalOpen || userId === null)
  const showTargetModal =
    !preview &&
    !showUserModal &&
    lockedUserId !== null &&
    (targetModalOpen || (!autoPickTarget && targetId === null))
  const effectiveReadOnly = preview || readOnly

  useEffect(() => {
    if (authUserId !== null) {
      setUserId(authUserId)
    }
  }, [authUserId])

  useEffect(() => {
    if (!autoPickTarget || lockedUserId === null || targetId !== null || targetModalOpen) return

    if (initialParams.targetId !== null) {
      setTargetId(initialParams.targetId)
      return
    }

    let cancelled = false
    setAutoResolvingTarget(true)
    Promise.all([surveyApi.get(surveyId), userApi.list()])
      .then(([details, userList]) => {
        if (cancelled) return
        const entries = details.assignments
          .filter((a) => a.isAssigned && a.reviewerId === lockedUserId)
          .map((a) => {
            const user = userList.find((u) => u.id === a.targetId)
            return user ? { user, completed: a.isCompleted } : null
          })
          .filter((e): e is TargetEntry => e !== null)

        const pick = entries.find((t) => !t.completed) ?? entries[0]
        if (pick) {
          setTargetId(pick.user.id)
          setReadOnly(pick.completed)
          if (!pick.completed) setAnswers({})
        }
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setAutoResolvingTarget(false)
      })

    return () => {
      cancelled = true
    }
  }, [autoPickTarget, lockedUserId, targetId, targetModalOpen, surveyId, initialParams.targetId])

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
    if (lockedUserId === null || targetId === null) {
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
          (a) => a.reviewerId === lockedUserId && a.targetId === targetId && a.isAssigned,
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
            if (answer.userId === lockedUserId && answer.targetId === targetId) {
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
  }, [surveyId, lockedUserId, targetId])

  const storageKey =
    assignmentChecked &&
    !readOnly &&
    lockedUserId !== null &&
    targetId !== null
      ? `take-survey:${surveyId}:${lockedUserId}:${targetId}`
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

  const respondent = lockedUserId !== null ? users.find((u) => u.id === lockedUserId) ?? null : null
  const target = targetId !== null ? users.find((u) => u.id === targetId) ?? null : null

  const setAnswer = (questionId: number, value: string) => {
    if (readOnly) return
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const handleSelectUser = (id: number) => {
    if (hideUserSwitch) return
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
    if (hideUserSwitch && !reviewerLocked) {
      setTargetModalOpen(false)
      return
    }
    if (hideUserSwitch) return
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
    if (readOnly || lockedUserId === null || targetId === null) return
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

    const underMinSelect = questions.filter((q) => {
      if (q.type !== 'checkboxes') return false
      const minSel = Number(q.props?.minSelect ?? 0)
      if (minSel <= 0) return false
      const selected = (answers[q.id] ?? '').split(',').filter(Boolean).length
      return selected < minSel
    })
    if (underMinSelect.length > 0) {
      setError(`Выберите минимум вариантов в вопросе: «${underMinSelect[0].text}»`)
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      for (const question of answered) {
        await answerApi.create({
          questionId: question.id,
          userId: lockedUserId,
          targetId,
          text: answers[question.id].trim(),
          type: mapQuestionTypeToApi(question.type),
        })
      }
      await surveyApi.completeAssignment(surveyId, { reviewerId: lockedUserId, targetId })
      setSubmitted(true)
      setThanksPopupOpen(true)
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

  if (loading || autoResolvingTarget) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh] p-6">
        <p className="text-sm text-gray-500 dark:text-gray-300">Загрузка опроса…</p>
      </div>
    )
  }

  if (hideUserSwitch && lockedUserId !== null && targetId === null && !targetModalOpen) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh] p-6">
        <div className="text-center max-w-md">
          <p className="text-sm text-gray-500 dark:text-gray-300">Для вас нет назначенных целей в этом опросе</p>
        </div>
      </div>
    )
  }

  if (surveyClosed && !effectiveReadOnly && targetId !== null && assignmentChecked) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <div className="bg-white dark:bg-[#1e222e] border border-gray-200 dark:border-[#3a4250] rounded-2xl p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{survey?.name ?? 'Опрос'}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-300 mt-3">
            {mapSurveyStatus(survey?.status ?? '') === 'closed'
              ? 'Этот опрос завершён. Новые ответы отправить нельзя — выберите цель с уже отправленными ответами для просмотра.'
              : 'Опрос ещё не опубликован. Дождитесь, пока организатор запустит его.'}
          </p>
          {hideUserSwitch && (
            <button
              type="button"
              onClick={() => {
                setTargetId(null)
                setTargetModalOpen(true)
              }}
              className="mt-6 px-4 py-2 text-sm font-medium text-white bg-[#FF8600] hover:bg-[#FF6B00] rounded-xl cursor-pointer"
            >
              Выбрать цель для просмотра
            </button>
          )}
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <>
        {thanksPopupOpen && (
          <div className="fixed top-4 right-4 z-50 w-72 bg-white dark:bg-[#1e222e] border border-gray-200 dark:border-[#3a4250] rounded-2xl shadow-lg p-4 flex items-start gap-3">
            <img src="/sobaka.webp" alt="" className="cat-glow w-12 h-12 rounded-full object-cover shrink-0" />
            <p className="flex-1 min-w-0 text-sm font-medium text-gray-900 dark:text-gray-100">
              Спасибо за помощь в улучшении работы! Ты крут!
            </p>
            <button
              type="button"
              onClick={() => setThanksPopupOpen(false)}
              className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#303a48] transition cursor-pointer"
              aria-label="Закрыть"
            >
              ✕
            </button>
          </div>
        )}
        <div className="max-w-2xl mx-auto p-6 text-center">
          <div className="bg-white dark:bg-[#1e222e] border border-gray-200 dark:border-[#3a4250] rounded-2xl p-8 shadow-sm">
            <div className="cat-glow mx-auto w-20 h-20 rounded-full bg-green-100 dark:bg-green-500/15 flex items-center justify-center overflow-hidden">
              <img src="/cat_icon.webp" alt="Успешное завершение" className="w-full h-full object-cover" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-4">Спасибо!</h2>
            <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">Ваши ответы успешно сохранены в базе данных.</p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false)
                  setTargetId(null)
                  if (!hideUserSwitch) setTargetModalOpen(true)
                }}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-200 border-2 border-orange-300 dark:border-[#FF8600]/45 rounded-xl hover:bg-orange-50 dark:hover:bg-[#FF8600]/12 cursor-pointer"
              >
                {standalone || userPickerLocked ? 'Оценить ещё' : 'Другой пользователь'}
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
      </>
    )
  }



  return (
    <div className="max-w-2xl mx-auto p-6">
      {!preview && hideUserSwitch && !standalone && lockedUserId !== null && targetId !== null && (
        <div className="flex justify-end mb-4">
          <button
            type="button"
            onClick={() => setTargetModalOpen(true)}
            className="soft-press text-xs font-medium text-gray-600 dark:text-gray-200 border border-gray-200 dark:border-[#3a4250] rounded-lg px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-[#1e222e] cursor-pointer"
          >
            Сменить цель
          </button>
        </div>
      )}

      {!preview && !standalone && onBack && (
        <div className="flex items-start justify-between gap-3 mb-4">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Назад
            </button>
          <div className="flex gap-2">
            {!userPickerLocked && (
              <button
                type="button"
                onClick={() => setUserModalOpen(true)}
                className="text-xs font-medium text-gray-600 dark:text-gray-200 border border-gray-200 dark:border-[#3a4250] rounded-lg px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-[#1e222e] cursor-pointer"
              >
                Сменить пользователя
              </button>
            )}
              <button
                type="button"
                onClick={() => setTargetModalOpen(true)}
                className="text-xs font-medium text-gray-600 dark:text-gray-200 border border-gray-200 dark:border-[#3a4250] rounded-lg px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-[#1e222e] cursor-pointer"
              >
                Сменить цель
              </button>
          </div>
        </div>
      )}

      {!preview && standalone && lockedUserId !== null && targetId !== null && (
        <div className="flex justify-end gap-2 mb-4">
          {!userPickerLocked && (
            <button
              type="button"
              onClick={() => setUserModalOpen(true)}
              className="text-xs font-medium text-gray-600 dark:text-gray-200 border border-gray-200 dark:border-[#3a4250] rounded-lg px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-[#1e222e] cursor-pointer"
            >
              Сменить пользователя
            </button>
          )}
          <button
            type="button"
            onClick={() => setTargetModalOpen(true)}
            className="text-xs font-medium text-gray-600 dark:text-gray-200 border border-gray-200 dark:border-[#3a4250] rounded-lg px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-[#1e222e] cursor-pointer"
          >
            Сменить цель
          </button>
        </div>
      )}

      {!preview && (
        <div className="bg-white dark:bg-[#1e222e] border border-gray-200 dark:border-[#3a4250] rounded-2xl p-5 shadow-sm mb-5">
          {effectiveReadOnly && !preview && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-gray-100 dark:bg-[#303a48] border border-gray-200 dark:border-[#3a4250] px-4 py-2.5 text-sm text-gray-600 dark:text-gray-200">
              <svg className="w-4 h-4 text-gray-400 dark:text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              {surveyClosed
                ? 'Опрос завершён — просмотр ваших отправленных ответов'
                : 'Режим просмотра — ответы нельзя изменить'}
            </div>
          )}
          {survey?.description && (
            <p className="text-sm text-gray-500 dark:text-gray-300 mt-1 break-words">{survey.description}</p>
          )}
          {respondent && (
            <p className="text-xs text-gray-400 dark:text-gray-400 mt-2">
              Ответы записываются за пользователя: <span className="font-medium text-gray-600 dark:text-gray-200">{respondent.name}</span>
            </p>
          )}
          {!preview && (
            <div className="mt-4 flex items-center gap-3 rounded-xl bg-orange-100 dark:bg-[#FF8600]/18 border-2 border-orange-300 dark:border-[#FF8600]/45 px-4 py-3 shadow-sm">
              <svg className="w-6 h-6 text-[#FF6B00] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            <span className="text-sm text-gray-600 dark:text-gray-200">
              Опрос по:{' '}
              <span className="ml-1 text-lg font-bold text-gray-900 dark:text-gray-100">
                {target ? target.name : '— не задано —'}
              </span>
            </span>
          </div>
        )}
        {!preview && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="text-red-500">*</span> — обязательный вопрос для заполнения
          </p>
        )}
        </div>
      )}

      <form onSubmit={handleSubmit} className={`space-y-4  ${effectiveReadOnly ? 'opacity-75' : ''}`}>
        {questions.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-400">В этом опросе пока нет вопросов.</p>
        ) : (
          questions.map((question, index) => (
            <div key={question.id} className="soft-lift bg-white dark:bg-[#1e222e] border border-gray-200 dark:border-[#3a4250] rounded-2xl p-5 shadow-sm">
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                <span className="text-gray-400 dark:text-gray-400 mr-1.5">{index + 1}.</span>
                {question.text}
                {question.isRequired && (
                  <span className="ml-1.5 text-red-500" title="Обязательный вопрос">
                    *
                  </span>
                )}
                {question.type === 'checkboxes' && (() => {
                  const minSel = Number(question.props?.minSelect ?? 0)
                  const maxSel = Number(question.props?.maxSelect ?? 0)
                  if (minSel <= 0 && maxSel <= 0) return null
                  const text =
                    minSel > 0 && maxSel > 0
                      ? `выберите от ${minSel} до ${maxSel} вариантов`
                      : minSel > 0
                        ? `выберите минимум ${minSel} вариантов`
                        : `можно выбрать не более ${maxSel}`
                  return (
                    <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-400">
                      ({text})
                    </span>
                  )
                })()}
              </label>
              <QuestionInput
                question={question}
                value={answers[question.id] ?? ''}
                onChange={(v) => setAnswer(question.id, v)}
                readOnly={effectiveReadOnly}
              />
            </div>
          ))
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        {!effectiveReadOnly && (
          <button
            type="submit"
            disabled={submitting || questions.length === 0}
            className="w-full bg-[#FF8600] hover:bg-[#FF6B00] disabled:opacity-50 text-white font-medium py-3 px-4 rounded-xl soft-press shadow-sm cursor-pointer"
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

      {showTargetModal && lockedUserId !== null && (
        <Modal
          title="Выбор цели опроса"
          onClose={targetId !== null ? () => setTargetModalOpen(false) : undefined}
        >
          <TargetPicker
            surveyId={surveyId}
            userId={lockedUserId}
            onSelect={handleSelectTarget}
            onBack={hideUserSwitch && !reviewerLocked ? () => setTargetModalOpen(false) : handleBackToUsers}
            backLabel={hideUserSwitch ? 'Отмена' : 'Сменить пользователя'}
            hideBackButton={userPickerLocked}
          />
        </Modal>
      )}
    </div>
  )
}

