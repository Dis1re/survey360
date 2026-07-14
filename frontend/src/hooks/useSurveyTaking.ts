import { useCallback, useEffect, useState } from 'react'
import { answerApi, surveyApi, userApi } from '../api'
import { apiQuestionToQuestion, mapQuestionTypeToApi, mapSurveyStatus } from '../mappers'
import { parseSurveyResponseParams } from '../routing'
import type { ApiSurvey, ApiUser, Question } from '../types'

interface UseSurveyTakingProps {
  surveyId: number
  authUserId?: number | null
  lockedReviewerId?: number
  hideUserSwitch?: boolean
  preview?: boolean
}

export function useSurveyTaking({
  surveyId,
  authUserId = null,
  lockedReviewerId,
  hideUserSwitch = false,
  preview = false,
}: UseSurveyTakingProps) {
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

  const respondent = lockedUserId !== null ? users.find((u) => u.id === lockedUserId) ?? null : null
  const target = targetId !== null ? users.find((u) => u.id === targetId) ?? null : null

  useEffect(() => {
    if (authUserId !== null) setUserId(authUserId)
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
          .filter((e): e is { user: ApiUser; completed: boolean } => e !== null)
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

    return () => { cancelled = true }
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

    return () => { cancelled = true }
  }, [surveyId, lockedUserId, targetId])

  const storageKey =
    assignmentChecked && !readOnly && lockedUserId !== null && targetId !== null
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
    } catch { /* storage unavailable */ }
  }, [answers, storageKey])

  const setAnswer = useCallback((questionId: number, value: string) => {
    if (readOnly) return
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }, [readOnly])

  const handleSelectUser = useCallback((id: number) => {
    if (hideUserSwitch) return
    setUserId(id)
    setTargetId(null)
    setUserModalOpen(false)
    setTargetModalOpen(true)
  }, [hideUserSwitch])

  const handleSelectTarget = useCallback((id: number, completed: boolean) => {
    setTargetId(id)
    setTargetModalOpen(false)
    setReadOnly(completed)
    if (!completed) setAnswers({})
  }, [])

  const handleBackToUsers = useCallback(() => {
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
  }, [hideUserSwitch, reviewerLocked])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
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
        try { localStorage.removeItem(storageKey) } catch { /* storage unavailable */ }
      }
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Не удалось сохранить ответы')
    } finally {
      setSubmitting(false)
    }
  }, [readOnly, lockedUserId, targetId, questions, answers, surveyId, storageKey])

  return {
    survey,
    questions,
    answers,
    loading,
    autoResolvingTarget,
    submitting,
    submitted,
    thanksPopupOpen,
    setThanksPopupOpen,
    error,
    userId,
    targetId,
    userModalOpen,
    setUserModalOpen,
    targetModalOpen,
    setTargetModalOpen,
    surveyClosed,
    lockedUserId,
    reviewerLocked,
    userPickerLocked,
    showUserModal,
    showTargetModal,
    effectiveReadOnly,
    respondent,
    target,
    setAnswer,
    handleSelectUser,
    handleSelectTarget,
    handleBackToUsers,
    handleSubmit,
    setSubmitted,
    setTargetId,
  }
}
