import { useEffect, useMemo, useState } from 'react'
import { questionApi, surveyApi, userApi } from '../api'
import { MatrixTable } from '../components/MatrixTable'
import { QuestionEditor } from '../components/QuestionEditor'
import { QuestionList } from '../components/QuestionList'
import { SurveyHeader, type SurveyHeaderForm } from '../components/SurveyHeader'
import { TabBar, type Tab } from '../components/TabBar'
import {
  apiDateToInput,
  apiQuestionToQuestion,
  apiUserToParticipant,
  assignmentsToMatrix,
  inputDateToApi,
  mapQuestionTypeToApi,
  mapSurveyStatus,
  getUniqueUserIds,
} from '../mappers'
import type { ApiSurvey, ApiUser, Participant, Question } from '../types'

interface MainPageProps {
  surveyId: number | null
  onSurveyUpdated?: () => void
}

export function MainPage({ surveyId, onSurveyUpdated }: MainPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>('editor')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [survey, setSurvey] = useState<ApiSurvey | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [assignments, setAssignments] = useState<Record<string, Record<string, boolean>>>({})
  const [activeQuestionId, setActiveQuestionId] = useState<number | null>(null)
  const [savingSurvey, setSavingSurvey] = useState(false)
  const [creatingQuestion, setCreatingQuestion] = useState(false)
  const [savingQuestion, setSavingQuestion] = useState(false)

  useEffect(() => {
    if (surveyId === null) {
      setSurvey(null)
      setQuestions([])
      setParticipants([])
      setAssignments({})
      setActiveQuestionId(null)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    surveyApi
      .get(surveyId)
      .then(async (details) => {
        if (cancelled) return

        setSurvey(details.survey)
        const mappedQuestions = details.questions.map(apiQuestionToQuestion)
        setQuestions(mappedQuestions)
        setActiveQuestionId((prev) => {
          if (prev !== null && mappedQuestions.some((question) => question.id === prev)) return prev
          return mappedQuestions[0]?.id ?? null
        })
        setAssignments(assignmentsToMatrix(details.assignments))

        const userIds = getUniqueUserIds(details.assignments)
        if (userIds.length === 0) {
          setParticipants([])
          return
        }

        const users = await Promise.all(
          userIds.map((id) => userApi.get(id).catch(() => null)),
        )
        if (cancelled) return

        const validUsers = users.filter((user): user is ApiUser => user !== null)
        setParticipants(validUsers.map(apiUserToParticipant))
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [surveyId])

  const surveyHeaderInitial = useMemo<SurveyHeaderForm>(
    () => ({
      title: survey?.name ?? '',
      description: survey?.description ?? '',
      startDate: apiDateToInput(survey?.startedAt ?? ''),
      endDate: apiDateToInput(survey?.closedAt ?? ''),
    }),
    [survey],
  )

  const surveyStatus = survey ? mapSurveyStatus(survey.status) : 'draft'

  const activeQuestion = questions.find((question) => question.id === activeQuestionId) ?? null

  const handleSaveSurvey = async (data: SurveyHeaderForm) => {
    if (surveyId === null) return

    setSavingSurvey(true)
    setError(null)
    try {
      const updated = await surveyApi.update(surveyId, {
        name: data.title.trim(),
        description: data.description.trim(),
        status: survey.status,
        startedAt: inputDateToApi(data.startDate),
        closedAt: inputDateToApi(data.endDate),
      })
      setSurvey(updated)
      onSurveyUpdated?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось сохранить опрос'
      setError(message)
      throw err
    } finally {
      setSavingSurvey(false)
    }
  }

  const handleCreateQuestion = async (text: string) => {
    if (surveyId === null) return

    setCreatingQuestion(true)
    setError(null)
    try {
      const id = await questionApi.create({
        surveyId,
        text,
        type: 'rating',
      })
      const newQuestion = apiQuestionToQuestion({
        id,
        surveyId,
        text,
        type: 'rating',
      })
      setQuestions((prev) => [...prev, newQuestion])
      setActiveQuestionId(id)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось добавить вопрос'
      setError(message)
      throw err
    } finally {
      setCreatingQuestion(false)
    }
  }

  const handleSaveQuestion = async (updated: Question) => {
    setSavingQuestion(true)
    setError(null)
    try {
      const saved = await questionApi.update(updated.id, {
        text: updated.text,
        type: mapQuestionTypeToApi(updated.type),
      })
      const mapped = apiQuestionToQuestion(saved)
      const nextQuestion = { ...mapped, options: updated.options }
      setQuestions((prev) =>
        prev.map((question) => (question.id === updated.id ? nextQuestion : question)),
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось сохранить вопрос'
      setError(message)
      throw err
    } finally {
      setSavingQuestion(false)
    }
  }

  const handleSaveMatrix = (_nextAssignments: Record<string, Record<string, boolean>>) => {
    // TODO: сохранить через API
  }

  if (surveyId === null) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <p className="text-sm text-gray-500">
          {loading ? 'Загрузка опросов…' : 'Нет опросов. Создайте первый опрос в боковой панели.'}
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <p className="text-sm text-gray-500">Загрузка опроса…</p>
      </div>
    )
  }

  if (error && !survey) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-900 font-medium">Не удалось загрузить опрос</p>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!survey) return null

  return (
    <>
      {error && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <SurveyHeader
        initial={surveyHeaderInitial}
        status={surveyStatus}
        saving={savingSurvey}
        onSave={handleSaveSurvey}
      />
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'editor' && (
        <div className="p-6">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <QuestionList
                questions={questions}
                activeQuestionId={activeQuestionId}
                creating={creatingQuestion}
                onQuestionSelect={setActiveQuestionId}
                onQuestionCreate={handleCreateQuestion}
              />
            </div>
            <div className="lg:col-span-2">
              <QuestionEditor
                question={activeQuestion}
                saving={savingQuestion}
                onSave={handleSaveQuestion}
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'matrix' && (
        <div className="p-6">
          <div className="max-w-6xl mx-auto">
            {participants.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-sm text-gray-500 shadow-sm">
                Нет назначений респондентов для этого опроса
              </div>
            ) : (
              <MatrixTable
                key={surveyId}
                respondents={participants}
                targets={participants}
                initialAssignments={assignments}
                onSave={handleSaveMatrix}
              />
            )}
          </div>
        </div>
      )}
    </>
  )
}
