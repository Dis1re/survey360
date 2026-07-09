import { useEffect, useState } from 'react'
import { surveyApi } from '../api'
import { QuestionList } from '../components/QuestionList'
import { AnswerPanel } from '../components/AnswerPanel'
import type { ApiSurveyDetails } from '../types'

interface EntityPageProps {
  id: number
  onBack: () => void
}

export function EntityPage({ id, onBack }: EntityPageProps) {
  const [details, setDetails] = useState<ApiSurveyDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeQuestionId, setActiveQuestionId] = useState<number | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    surveyApi
      .get(id)
      .then((data) => {
        setDetails(data)
        setActiveQuestionId(data.questions[0]?.id ?? null)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-6xl mx-auto text-sm text-gray-500">Загрузка…</div>
      </div>
    )
  }

  if (error || !details) {
    return (
      <div className="p-6">
        <div className="max-w-6xl mx-auto space-y-4">
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
          >
            ← К списку опросов
          </button>
          <h1 className="text-xl font-bold text-gray-900">Опрос не найден</h1>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}
        </div>
      </div>
    )
  }

  const { survey, questions } = details

  return (
    <>
      <header className="bg-white border-b border-gray-200 p-6 flex-shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={onBack}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer mb-2"
            >
              ← К списку опросов
            </button>
            <h1 className="text-xl font-bold text-gray-900">Опрос: {survey.name}</h1>
            <p className="text-xs text-gray-400 mt-1 font-mono">GET /api/survey/{id}</p>
          </div>
        </div>
      </header>

      <div className="p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Вопросы ({questions.length})</h2>
            {questions.length === 0 ? (
              <p className="text-sm text-gray-500">Вопросов нет</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <QuestionList
                    questions={questions}
                    activeQuestionId={activeQuestionId}
                    onQuestionSelect={setActiveQuestionId}
                    showAddButton={false}
                  />
                </div>
                <div className="lg:col-span-2">
                  <AnswerPanel
                    question={questions.find((q) => q.id === activeQuestionId) ?? null}
                    onAnswer={() => {}}
                  />
                </div>
              </div>
            )}
          </section>

          <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Ответ API (JSON)</h2>
            <pre className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-700 overflow-x-auto">
              {JSON.stringify(details, null, 2)}
            </pre>
          </section>
        </div>
      </div>
    </>
  )
}
