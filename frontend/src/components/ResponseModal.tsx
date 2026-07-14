import { useEffect, useState } from 'react'
import { surveyApi } from '../api'
import { apiQuestionToQuestion } from '../mappers'
import { Modal } from './Modal'
import type { ApiSurveyDetails, Question } from '../types'

interface ResponseModalProps {
  surveyId: number
  reviewerId: number
  targetId: number
  reviewerName?: string
  targetName?: string
  onClose: () => void
  fullscreen?: boolean
}

export function ResponseModal({
  surveyId,
  reviewerId,
  targetId,
  reviewerName,
  targetName,
  onClose,
  fullscreen = false,
}: ResponseModalProps) {
  const [loading, setLoading] = useState(true)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<number, string>>({})

  useEffect(() => {
    setLoading(true)
    surveyApi
      .get(surveyId)
      .then((details: ApiSurveyDetails) => {
        setQuestions(details.questions.map(apiQuestionToQuestion))
        const map: Record<number, string> = {}
        for (const answer of details.answers) {
          if (answer.userId === reviewerId && answer.targetId === targetId) {
            map[answer.questionId] = answer.text
          }
        }
        setAnswers(map)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [surveyId, reviewerId, targetId])

  const content = loading ? (
    <p className="text-sm text-gray-400 py-4 text-center">Загрузка…</p>
  ) : questions.length === 0 ? (
    <p className="text-sm text-gray-400 py-4 text-center">Вопросов нет</p>
  ) : (
    <div className="space-y-3">
      {questions.map((q, index) => (
        <div key={q.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <div className="text-sm font-medium text-gray-900 mb-2">
            <span className="text-gray-400 mr-1.5">{index + 1}.</span>
            {q.text}
          </div>
          <div className="text-sm text-gray-700 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
            {answers[q.id]?.trim() ? (
              answers[q.id]
            ) : (
              <span className="text-gray-400">— нет ответа —</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )

  if (fullscreen) {
    return (
      <div className="absolute inset-0 z-50 bg-gray-100 flex flex-col shadow-2xl border-l border-gray-300">
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Ответы</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              <span className="font-medium text-gray-700">{reviewerName ?? 'Респондент'}</span> оценивает{' '}
              <span className="font-medium text-gray-700">{targetName ?? 'объект'}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition cursor-pointer"
            aria-label="Закрыть"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{content}</div>
      </div>
    )
  }

  return (
    <Modal
      title="Ответы"
      description={
        <span className="text-sm">
          <span className="font-semibold text-gray-700">{reviewerName ?? 'Респондент'}</span> оценивает{' '}
          <span className="font-semibold text-gray-700">{targetName ?? 'объект'}</span>
        </span>
      }
      onClose={onClose}
    >
      {content}
    </Modal>
  )
}
