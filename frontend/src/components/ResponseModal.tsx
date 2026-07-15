import { useEffect, useState } from 'react'
import { surveyApi } from '../api'
import { Modal } from './Modal'

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
  const [items, setItems] = useState<{ questionText: string; answerText: string }[]>([])

  useEffect(() => {
    setLoading(true)
    setItems([])
    surveyApi
      .getResponses(surveyId, reviewerId, targetId)
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [surveyId, reviewerId, targetId])

  const content = loading ? (
    <p className="text-sm text-gray-400 py-4 text-center">Загрузка…</p>
  ) : items.length === 0 ? (
    <p className="text-sm text-gray-400 py-4 text-center">Нет ответов</p>
  ) : (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <div className="text-sm font-medium text-gray-900 mb-2">
            <span className="text-gray-400 mr-1.5">{index + 1}.</span>
            {item.questionText}
          </div>
          <div className="text-sm text-gray-700 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
            {item.answerText?.trim() ? (
              item.answerText
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
      <div
        className="fixed top-0 right-0 bottom-0 z-40 bg-gray-100 flex flex-col border-l border-gray-200 transition-[left] duration-300 ease-out"
        style={{ left: sidebarWidth }}
      >
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
