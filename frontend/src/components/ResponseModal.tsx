import { useEffect, useMemo, useState } from 'react'
import { surveyApi } from '../api'
import { apiQuestionToQuestion } from '../mappers'
import type { Question } from '../types'
import { Modal } from './Modal'
import { QuestionInput } from './QuestionInput'

interface ResponseModalProps {
  surveyId: number
  reviewerId?: number
  targetId?: number
  reviewerName?: string
  targetName?: string
  onClose: () => void
  fullscreen?: boolean
  sidebarWidth?: number
  onOpenExport?: (filter: { reviewerId?: number; targetId?: number }) => void
}

interface TargetResponseGroup {
  questionOrder: number
  questionText: string
  answers: Array<{ reviewerId: number; reviewerName: string; answerText: string }>
}

interface ReviewerResponseGroup {
  targetId: number
  targetName: string
  questions: Array<{ questionOrder: number; questionText: string; answerText: string }>
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
  onOpenExport,
}: ResponseModalProps) {
  const mode: 'single' | 'target' | 'reviewer' =
    reviewerId === undefined ? 'target' : targetId === undefined ? 'reviewer' : 'single'
  const [loading, setLoading] = useState(true)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [groups, setGroups] = useState<TargetResponseGroup[]>([])
  const [reviewerGroups, setReviewerGroups] = useState<ReviewerResponseGroup[]>([])

  useEffect(() => {
    setLoading(true)
    setQuestions([])
    setAnswers({})

    const request =
      mode === 'target'
        ? surveyApi.getTargetResponses(surveyId, targetId!)
        : mode === 'reviewer'
          ? surveyApi.getReviewerResponses(surveyId, reviewerId!)
          : surveyApi.get(surveyId)

    request
      .then((data) => {
        if (mode === 'target') {
          setGroups(data as TargetResponseGroup[])
        } else if (mode === 'reviewer') {
          setReviewerGroups(data as ReviewerResponseGroup[])
        } else {
          const details = data as { questions: Parameters<typeof apiQuestionToQuestion>[0][]; answers: { userId: number; targetId: number; questionId: number; text: string }[] }
          setQuestions(details.questions.map(apiQuestionToQuestion))
          const saved: Record<number, string> = {}
          for (const answer of details.answers) {
            if (answer.userId === reviewerId && answer.targetId === targetId) {
              saved[answer.questionId] = answer.text
            }
          }
          setAnswers(saved)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [surveyId, reviewerId, targetId, mode])

  const answeredCount = useMemo(
    () => questions.filter((q) => (answers[q.id] ?? '').trim()).length,
    [questions, answers],
  )

  const singleContent = loading ? (
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
          className="soft-lift bg-white dark:bg-[#262d3a] border border-gray-200 dark:border-[#3a4250] rounded-2xl p-5 shadow-sm dark:shadow-none"
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

  const targetContent = loading ? (
    <p className="text-sm text-gray-400 py-4 text-center">Загрузка…</p>
  ) : groups.length === 0 ? (
    <p className="text-sm text-gray-400 py-4 text-center">Нет ответов</p>
  ) : (
    <div className="space-y-5">
      {groups.map((group, gi) => (
        <div key={gi} className="soft-lift bg-white dark:bg-[#262d3a] border border-gray-200 dark:border-[#3a4250] rounded-2xl p-4 shadow-sm dark:shadow-none">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            <span className="text-gray-400 mr-1.5">{gi + 1}.</span>
            {group.questionText}
          </div>
          <div className="space-y-2">
            {group.answers.length === 0 ? (
              <p className="text-sm text-gray-400">— нет ответов —</p>
            ) : (
              group.answers.map((answer, ai) => (
                <div key={ai} className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-300">{answer.reviewerName}</span>
                  <div className="text-sm text-gray-700 dark:text-gray-100 bg-gray-50 dark:bg-[#1e222e] border border-gray-100 dark:border-[#3a4250] rounded-xl px-3 py-2">
                    {answer.answerText?.trim() ? (
                      answer.answerText
                    ) : (
                      <span className="text-gray-400">— нет ответа —</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  )

  const reviewerContent = loading ? (
    <p className="text-sm text-gray-400 py-4 text-center">Загрузка…</p>
  ) : reviewerGroups.length === 0 ? (
    <p className="text-sm text-gray-400 py-4 text-center">Нет ответов</p>
  ) : (
    <div className="space-y-6">
      {reviewerGroups.map((group, gi) => (
        <div key={gi} className="soft-lift bg-white dark:bg-[#262d3a] border border-gray-200 dark:border-[#3a4250] rounded-2xl p-4 shadow-sm dark:shadow-none">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">Объект</span>
            {group.targetName}
          </div>
          <div className="space-y-3">
            {group.questions.length === 0 ? (
              <p className="text-sm text-gray-400">— нет ответов —</p>
            ) : (
              group.questions.map((question, qi) => (
                <div key={qi} className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-300">
                    <span className="text-gray-400 mr-1.5">{qi + 1}.</span>
                    {question.questionText}
                  </span>
                  <div className="text-sm text-gray-700 dark:text-gray-100 bg-gray-50 dark:bg-[#1e222e] border border-gray-100 dark:border-[#3a4250] rounded-xl px-3 py-2">
                    {question.answerText?.trim() ? (
                      question.answerText
                    ) : (
                      <span className="text-gray-400">— нет ответа —</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  )

  const content =
    mode === 'reviewer' ? reviewerContent : mode === 'target' ? targetContent : singleContent

  const subtitle = (() => {
    if (mode === 'reviewer') {
      return <>Респондент: <span className="font-medium text-gray-700 dark:text-gray-200">{reviewerName ?? 'респондент'}</span></>
    }
    if (mode === 'target') {
      return <>Объект: <span className="font-medium text-gray-700 dark:text-gray-200">{targetName ?? 'объект'}</span></>
    }
    return (
      <>
        <span className="font-medium text-gray-700 dark:text-gray-200">{reviewerName ?? 'Респондент'}</span> оценивает{' '}
        <span className="font-medium text-gray-700 dark:text-gray-200">{targetName ?? 'объект'}</span>
      </>
    )
  })()

  if (fullscreen) {
    return (
      <div
        className="fixed top-0 right-0 bottom-0 z-40 bg-gray-100 dark:bg-[#303a48] flex flex-col border-l border-gray-200 dark:border-[#3a4250] transition-[left] duration-300 ease-out"
        style={{ left: sidebarWidth }}
      >
        <div className="bg-white dark:bg-[#1e222e] border-b border-gray-200 dark:border-[#3a4250] px-6 py-4 flex items-center justify-between shadow-sm shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Ответы</h2>
            <p className="text-sm text-gray-500 dark:text-gray-300 mt-0.5">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            {onOpenExport && (
              <button
                type="button"
                onClick={() =>
                  onOpenExport(
                    mode === 'reviewer'
                      ? { reviewerId: reviewerId }
                      : mode === 'target'
                        ? { targetId: targetId }
                        : {},
                  )
                }
                className="shrink-0 px-3 py-1.5 text-xs font-medium text-[#FF8600] bg-white dark:bg-[#1e222e] border border-[#FF8600]/40 hover:bg-orange-50 dark:hover:bg-[#FF8600]/12 rounded-lg transition cursor-pointer"
              >
                Сформировать результаты
              </button>
            )}
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
        </div>
        <div className="flex-1 overflow-y-auto p-6">{content}</div>
      </div>
    )
  }

  return (
    <Modal
      title="Ответы"
      description={<span className="text-sm">{subtitle}</span>}
      onClose={onClose}
    >
      {content}
    </Modal>
  )
}
