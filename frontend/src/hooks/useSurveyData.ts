import { useCallback, useEffect, useState } from 'react'
import { questionApi, surveyApi, userApi } from '../api'
import { apiQuestionToQuestion, mapSurveyStatus, mapSurveyStatusToApi, inputDateToApi, apiDateToInput, mapQuestionTypeToApi } from '../mappers'
import type { ApiSurvey, ApiUser, Question, SurveyReportInfo } from '../types'

export interface UseSurveyDataReturn {
  survey: ApiSurvey | null
  setSurvey: React.Dispatch<React.SetStateAction<ApiSurvey | null>>
  questions: Question[]
  allUsers: ApiUser[]
  activeQuestionId: number | null
  setActiveQuestionId: React.Dispatch<React.SetStateAction<number | null>>
  surveyStatus: 'draft' | 'active' | 'closed'
  surveyEditable: boolean
  reportInfo: SurveyReportInfo | null
  loading: boolean
  loadError: string | null
  savingSurvey: boolean
  startingSurvey: boolean
  stoppingSurvey: boolean
  creatingQuestion: boolean
  savingQuestion: boolean
  deletingQuestion: boolean
  deletingAll: boolean
  confirmDeleteAll: boolean
  setConfirmDeleteAll: (v: boolean) => void
  loadSurvey: (id: number) => Promise<void>
  loadUsers: () => Promise<void>
  handleSaveSurvey: (data: { title: string; description: string }) => Promise<void>
  handleStartSurvey: (data: { title: string; description: string; startDate: string; endDate: string }) => Promise<void>
  handleStopSurvey: (data: { title: string; description: string }) => Promise<void>
  handleCreateQuestion: (text: string) => Promise<void>
  handleSaveQuestion: (updated: Question) => Promise<void>
  handleDeleteQuestion: (id: number) => Promise<void>
  handleReorderQuestions: (orderedIds: number[]) => Promise<void>
  handleConfirmDeleteAll: () => Promise<void>
  handleDeleteSurvey: () => Promise<void>
  activeQuestion: Question | null
}

export function useSurveyData(
  surveyId: number | null,
  onSurveyUpdated?: () => void,
  onSurveyDeleted?: () => void | Promise<void>,
  loadMatrix?: (id: number) => Promise<void>,
  loadRespondentLinks?: (id: number) => Promise<void>,
  clearMatrix?: () => void,
): UseSurveyDataReturn {
  const [survey, setSurvey] = useState<ApiSurvey | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [allUsers, setAllUsers] = useState<ApiUser[]>([])
  const [activeQuestionId, setActiveQuestionId] = useState<number | null>(null)
  const [reportInfo, setReportInfo] = useState<SurveyReportInfo | null>(null)
  const [loading, setLoading] = useState(() => surveyId !== null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [savingSurvey, setSavingSurvey] = useState(false)
  const [startingSurvey, setStartingSurvey] = useState(false)
  const [stoppingSurvey, setStoppingSurvey] = useState(false)
  const [creatingQuestion, setCreatingQuestion] = useState(false)
  const [savingQuestion, setSavingQuestion] = useState(false)
  const [deletingQuestion, setDeletingQuestion] = useState(false)
  const [deletingAll, setDeletingAll] = useState(false)
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)

  const loadUsers = useCallback(async () => {
    const users = await userApi.list()
    setAllUsers(users)
  }, [])

  const loadSurveyInner = useCallback(async (id: number) => {
    const details = await surveyApi.get(id)
    setSurvey(details.survey)
    const mappedQuestions = details.questions.map(apiQuestionToQuestion)
    setQuestions(mappedQuestions)
    setActiveQuestionId((prev) => {
      if (prev !== null && mappedQuestions.some((q) => q.id === prev)) return prev
      return mappedQuestions[0]?.id ?? null
    })
    try {
      setReportInfo(await surveyApi.getReportInfo(id))
    } catch (err) {
      console.error(err)
      setReportInfo(null)
    }
    if (loadMatrix) {
      try {
        await loadMatrix(id)
      } catch (err) {
        console.error(err)
        clearMatrix?.()
      }
    }
    if (mapSurveyStatus(details.survey.status) === 'active' && loadRespondentLinks) {
      try {
        await loadRespondentLinks(id)
      } catch (err) {
        console.error(err)
      }
    }
  }, [loadMatrix, loadRespondentLinks, clearMatrix])

  useEffect(() => {
    if (surveyId === null) {
      setSurvey(null)
      setQuestions([])
      setAllUsers([])
      setActiveQuestionId(null)
      setReportInfo(null)
      clearMatrix?.()
      return
    }

    let cancelled = false
    setLoading(true)
    setLoadError(null)
    setSurvey(null)
    setQuestions([])
    setActiveQuestionId(null)
    clearMatrix?.()

    Promise.all([loadSurveyInner(surveyId), loadUsers()])
      .catch((err) => {
        console.error(err)
        if (!cancelled) {
          setLoadError('Не удалось загрузить опрос')
          setSurvey(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [surveyId, loadSurveyInner, loadUsers, clearMatrix])

  const surveyStatus = survey ? mapSurveyStatus(survey.status) : 'draft'
  const surveyEditable = surveyStatus === 'draft'
  const activeQuestion = questions.find((q) => q.id === activeQuestionId) ?? null

  const handleSaveSurvey = useCallback(async (data: { title: string; description: string }) => {
    if (surveyId === null || !survey || !surveyEditable) return
    setSavingSurvey(true)
    try {
      const updated = await surveyApi.update(surveyId, {
        name: data.title.trim(),
        description: data.description.trim(),
        status: survey.status,
        startedAt: inputDateToApi(apiDateToInput(survey.startedAt ?? '')),
        closedAt: inputDateToApi(apiDateToInput(survey.closedAt ?? '')),
      })
      setSurvey(updated)
      onSurveyUpdated?.()
    } catch (err) {
      console.error(err)
      throw err
    } finally {
      setSavingSurvey(false)
    }
  }, [surveyId, survey, surveyEditable, onSurveyUpdated])

  const handleStartSurvey = useCallback(async (data: { title: string; description: string; startDate: string; endDate: string }) => {
    if (surveyId === null || !survey) return
    setStartingSurvey(true)
    try {
      const updated = await surveyApi.update(surveyId, {
        name: data.title.trim(),
        description: data.description.trim(),
        status: mapSurveyStatusToApi('active'),
        startedAt: inputDateToApi(data.startDate),
        closedAt: inputDateToApi(data.endDate),
      })
      setSurvey(updated)
      onSurveyUpdated?.()
      if (loadRespondentLinks) await loadRespondentLinks(surveyId)
    } catch (err) {
      console.error(err)
      throw err
    } finally {
      setStartingSurvey(false)
    }
  }, [surveyId, survey, onSurveyUpdated, loadRespondentLinks])

  const handleStopSurvey = useCallback(async (data: { title: string; description: string }) => {
    if (surveyId === null || !survey) return
    setStoppingSurvey(true)
    try {
      const today = new Date()
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      const updated = await surveyApi.update(surveyId, {
        name: data.title.trim(),
        description: data.description.trim(),
        status: mapSurveyStatusToApi('closed'),
        startedAt: inputDateToApi(apiDateToInput(survey.startedAt ?? '')),
        closedAt: inputDateToApi(todayStr),
      })
      setSurvey(updated)
      onSurveyUpdated?.()
    } catch (err) {
      console.error(err)
      throw err
    } finally {
      setStoppingSurvey(false)
    }
  }, [surveyId, survey, onSurveyUpdated])

  const handleCreateQuestion = useCallback(async (text: string) => {
    if (surveyId === null || !surveyEditable) return
    setCreatingQuestion(true)
    try {
      const id = await questionApi.create({ surveyId, text, type: 'rating', isRequired: false })
      setQuestions((prev) => [...prev, apiQuestionToQuestion({ id, surveyId, text, type: 'rating' })])
      setActiveQuestionId(id)
    } catch (err) {
      console.error(err)
      throw err
    } finally {
      setCreatingQuestion(false)
    }
  }, [surveyId, surveyEditable])

  const handleSaveQuestion = useCallback(async (updated: Question) => {
    if (!surveyEditable) return
    setSavingQuestion(true)
    try {
      const saved = await questionApi.update(updated.id, {
        text: updated.text,
        type: mapQuestionTypeToApi(updated.type),
        isRequired: updated.isRequired ?? false,
        props: updated.props,
      })
      const mapped = apiQuestionToQuestion(saved)
      setQuestions((prev) => prev.map((q) => (q.id === updated.id ? mapped : q)))
    } catch (err) {
      console.error(err)
      throw err
    } finally {
      setSavingQuestion(false)
    }
  }, [surveyEditable])

  const handleDeleteQuestion = useCallback(async (id: number) => {
    if (surveyId === null || !surveyEditable) return
    setDeletingQuestion(true)
    try {
      await questionApi.delete(id)
      setQuestions((prev) => {
        const next = prev.filter((q) => q.id !== id)
        setActiveQuestionId((curr) => {
          if (curr !== id) return curr
          return next[0]?.id ?? null
        })
        return next
      })
    } catch (err) {
      console.error(err)
    } finally {
      setDeletingQuestion(false)
    }
  }, [surveyId, surveyEditable])

  const handleReorderQuestions = useCallback(async (orderedIds: number[]) => {
    if (surveyId === null || !surveyEditable) return
    const map = new Map(questions.map((q) => [q.id, q]))
    const next = orderedIds.map((id) => map.get(id)).filter((q): q is Question => q !== undefined)
    setQuestions(next)
    try {
      await surveyApi.reorderQuestions(surveyId, orderedIds)
    } catch (err) {
      console.error(err)
      if (surveyId !== null) void loadSurveyInner(surveyId)
    }
  }, [surveyId, surveyEditable, questions, loadSurveyInner])

  const handleConfirmDeleteAll = useCallback(async () => {
    if (surveyId === null) return
    setDeletingAll(true)
    try {
      await surveyApi.deleteAllQuestions(surveyId)
      setQuestions([])
      setActiveQuestionId(null)
      setConfirmDeleteAll(false)
    } catch (err) {
      console.error(err)
    } finally {
      setDeletingAll(false)
    }
  }, [surveyId])

  const handleDeleteSurvey = useCallback(async () => {
    if (surveyId === null) return
    try {
      await surveyApi.delete(surveyId)
      setSurvey(null)
      setQuestions([])
      await onSurveyDeleted?.()
    } catch (err) {
      console.error(err)
      throw err
    }
  }, [surveyId, onSurveyDeleted])

  return {
    survey,
    setSurvey,
    questions,
    allUsers,
    activeQuestionId,
    setActiveQuestionId,
    surveyStatus,
    surveyEditable,
    reportInfo,
    loading,
    loadError,
    savingSurvey,
    startingSurvey,
    stoppingSurvey,
    creatingQuestion,
    savingQuestion,
    deletingQuestion,
    deletingAll,
    confirmDeleteAll,
    setConfirmDeleteAll,
    loadSurvey: loadSurveyInner,
    loadUsers,
    handleSaveSurvey,
    handleStartSurvey,
    handleStopSurvey,
    handleCreateQuestion,
    handleSaveQuestion,
    handleDeleteQuestion,
    handleReorderQuestions,
    handleConfirmDeleteAll,
    handleDeleteSurvey,
    activeQuestion,
  }
}
