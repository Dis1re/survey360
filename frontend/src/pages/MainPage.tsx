import { useEffect, useMemo, useState } from 'react'
import { SurveyHeader } from '../components/SurveyHeader'
import { SurveyEditModal } from '../components/SurveyEditModal'
import { TabBar, type Tab } from '../components/TabBar'
import { QuestionList } from '../components/QuestionList'
import { QuestionEditor } from '../components/QuestionEditor'
import { MatrixTable } from '../components/MatrixTable'
import { surveyApi } from '../api'
import type { ApiQuestion, ApiSurvey, ApiSurveyAssignment, Participant, Question } from '../types'

interface MainPageProps {
  survey: ApiSurvey
  questions: ApiQuestion[]
  assignments: ApiSurveyAssignment[]
  loading: boolean
  onUpdate: () => void
}

const statusMap: Record<string, 'active' | 'draft' | 'closed'> = {
  'Черновик': 'draft',
  'Активен': 'active',
  'Завершён': 'closed',
}

function formatDate(dateStr: string): string {
  if (!dateStr || dateStr.startsWith('0001')) return '—'
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function toQuestion(api: ApiQuestion): Question {
  return { id: api.id, surveyId: api.surveyId, text: api.text, type: api.type as Question['type'] }
}

function toParticipants(assignments: ApiSurveyAssignment[]): Participant[] {
  const map = new Map<number, Participant>()
  for (const a of assignments) {
    for (const id of [a.reviewerId, a.targetId]) {
      if (!map.has(id)) {
        map.set(id, {
          id,
          name: `Участник #${id}`,
          role: '',
          initial: String(id).charAt(0),
          color: 'bg-gray-100 text-gray-600',
        })
      }
    }
  }
  return Array.from(map.values())
}

function toMatrixAssignments(assignments: ApiSurveyAssignment[]): Record<string, Record<string, boolean>> {
  const result: Record<string, Record<string, boolean>> = {}
  for (const a of assignments) {
    const r = String(a.reviewerId), t = String(a.targetId)
    if (!result[r]) result[r] = {}
    result[r][t] = a.isAssigned
  }
  return result
}

export function MainPage({ survey, questions: apiQuestions, assignments, loading, onUpdate }: MainPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>('editor')
  const [questions, setQuestions] = useState<Question[]>([])
  const [activeQuestionId, setActiveQuestionId] = useState<number | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setQuestions(apiQuestions.map(toQuestion))
    setActiveQuestionId(null)
  }, [apiQuestions])

  const activeQuestion = questions.find((q) => q.id === activeQuestionId) ?? null

  const participants = useMemo(() => toParticipants(assignments), [assignments])
  const matrixAssignments = useMemo(() => toMatrixAssignments(assignments), [assignments])

  const handleSaveQuestion = (updated: Question) => {
    setQuestions((prev) => prev.map((q) => (q.id === updated.id ? updated : q)))
  }

  const handleSaveMatrix = (_a: Record<string, Record<string, boolean>>) => {
    // TODO: сохранить через API
  }

  const handleEditSave = async (data: { name: string; description: string; startedAt: string; closedAt: string }) => {
    setSaving(true)
    try {
      await surveyApi.update(survey.id, data)
      setEditOpen(false)
      onUpdate()
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full text-gray-400 text-sm">Загрузка…</div>
  }

  return (
    <>
      <SurveyHeader
        title={survey.name}
        description={survey.description}
        status={statusMap[survey.status] ?? 'draft'}
        startDate={formatDate(survey.startedAt)}
        endDate={formatDate(survey.closedAt)}
        onEdit={() => setEditOpen(true)}
      />
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'editor' && (
        <div className="p-6">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <QuestionList
                questions={questions}
                activeQuestionId={activeQuestionId}
                onQuestionSelect={setActiveQuestionId}
              />
            </div>
            <div className="lg:col-span-2">
              <QuestionEditor question={activeQuestion} onSave={handleSaveQuestion} />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'matrix' && (
        <div className="p-6">
          <div className="max-w-6xl mx-auto">
            <MatrixTable
              respondents={participants}
              targets={participants}
              initialAssignments={matrixAssignments}
              onSave={handleSaveMatrix}
            />
          </div>
        </div>
      )}

      {editOpen && (
        <SurveyEditModal
          name={survey.name}
          description={survey.description}
          startedAt={survey.startedAt}
          closedAt={survey.closedAt}
          onSave={handleEditSave}
          onClose={() => setEditOpen(false)}
          saving={saving}
        />
      )}
    </>
  )
}
