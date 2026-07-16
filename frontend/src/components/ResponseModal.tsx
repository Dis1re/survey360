import { useEffect, useMemo, useState } from 'react'
import { surveyApi } from '../api'
import { apiQuestionToQuestion } from '../mappers'
import type { Question } from '../types'
import { Modal } from './Modal'
import { QuestionInput } from './QuestionInput'

interface ResponseModalProps {
  surveyId: number
  reviewerId: number
  targetId: number
  reviewerName?: string
  targetName?: string
  onClose: () => void
  fullscreen?: boolean
  sidebarWidth?: number
}

export function ResponseModal({
  surveyId,
  reviewerId,
  targetId,
  reviewerName,
  targetName,
  onClose,
  fullscreen = false,
  sidebarWidth = 320,
}: ResponseModalProps) {
  const [loading, setLoading] = useState(true)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<number, string>>({})

  useEffect(() => {
    setLoading(true)
    setQuestions([])
    setAnswers({})

    surveyApi
      .get(surveyId)
      .then((details) => {
        setQuestions(details.questions.map(apiQuestionToQuestion))
        const saved: Record<number, string> = {}
        for (const answer of details.answers) {
          if (answer.userId === reviewerId && answer.targetId === targetId) {
            saved[answer.questionId] = answer.text
          }
        }
        setAnswers(saved)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [surveyId, reviewerId, targetId])

  const answeredCount = useMemo(
    () => questions.filter((q) => (answers[q.id] ?? '').trim()).length,
    [questions, answers],
  )

  const content = loading ? (
    <p className="text-sm text-gray-400 dark:text-gray-400 py-4 text-center">Загрузка…</p>
  ) : questions.length === 0 ? (
    <p className="text-sm text-gray-400 dark:text-gray-400 py-4 text-center">В этом опросе нет вопросов</p>
  ) : answeredCount === 0 ? (
    <p className="text-sm text-gray-400 dark:text-gray-400 py-4 text-center">Нет ответов</p>
  ) : (
    <div className="space-y-4">
      {questions.map((question, index) => (
        <div
          key={question.id}
          className="soft-lift bg-white dark:bg-[#1e222e] border border-gray-200 dark:border-[#3a4250] rounded-2xl p-5 shadow-sm"
        >
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
            <span className="text-gray-400 dark:text-gray-400 mr-1.5">{index + 1}.</span>
            {question.text}
            {question.isRequired && (
              <span className="ml-1.5 text-red-500" title="Обязательный вопрос">*</span>
            )}
          </label>
          <QuestionInput
            question={question}
            value={answers[question.id] ?? ''}
            onChange={() => {}}
            readOnly
          />
        </div>
      ))}
    </div>
  )

  if (fullscreen) {
    return (
      <div
        className="fixed top-0 right-0 bottom-0 z-40 bg-gray-100 dark:bg-[#303a48] flex flex-col border-l border-gray-200 dark:border-[#3a4250] transition-[left] duration-300 ease-out"
        style={{ left: sidebarWidth }}
      >
        <div className="bg-white dark:bg-[#1e222e] border-b border-gray-200 dark:border-[#3a4250] px-6 py-4 flex items-center justify-between shadow-sm shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Ответы</h2>
            <p className="text-sm text-gray-500 dark:text-gray-300 mt-0.5">
              <span className="font-medium text-gray-700 dark:text-gray-200">{reviewerName ?? 'Респондент'}</span> оценивает{' '}
              <span className="font-medium text-gray-700 dark:text-gray-200">{targetName ?? 'объект'}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-2 text-white bg-[#FF6B00] hover:bg-[#FF8600] rounded-lg shadow-sm transition cursor-pointer"
            aria-label="Закрыть"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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
          <span className="font-semibold text-gray-700 dark:text-gray-200">{reviewerName ?? 'Респондент'}</span> оценивает{' '}
          <span className="font-semibold text-gray-700 dark:text-gray-200">{targetName ?? 'объект'}</span>
        </span>
      }
      onClose={onClose}
    >
      {content}
    </Modal>
  )
}
