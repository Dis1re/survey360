import { useState } from 'react'
import type { Question } from '../types'

interface QuestionListProps {
  questions: Question[]
  activeQuestionId: number | null
  creating?: boolean
  onQuestionSelect: (id: number) => void
  onQuestionCreate: (text: string) => Promise<void>
}

export function QuestionList({
  questions,
  activeQuestionId,
  creating = false,
  onQuestionSelect,
  onQuestionCreate,
}: QuestionListProps) {
  const [newQuestionText, setNewQuestionText] = useState('')
  const [showInput, setShowInput] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = newQuestionText.trim()
    if (!text) return

    try {
      await onQuestionCreate(text)
      setNewQuestionText('')
      setShowInput(false)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col">
      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
        Вопросы анкеты ({questions.length})
      </span>

      <div className="space-y-2 flex-1 overflow-y-auto pr-1">
        {questions.length === 0 ? (
          <p className="text-sm text-gray-400 px-1 py-2">Вопросов пока нет</p>
        ) : (
          questions.map((question, index) => {
            const isActive = question.id === activeQuestionId
            return (
              <div
                key={question.id}
                onClick={() => onQuestionSelect(question.id)}
                className={`p-3 rounded-xl cursor-pointer text-sm font-medium flex items-center justify-between transition ${
                  isActive
                    ? 'bg-gray-50 border border-blue-500 text-gray-900'
                    : 'hover:bg-gray-50 border border-gray-100 text-gray-600'
                }`}
              >
                <span className="truncate">
                  <span className="text-gray-400 mr-1.5">{index + 1}.</span>
                  {question.text}
                </span>
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
                </svg>
              </div>
            )
          })
        )}
      </div>

      {showInput ? (
        <form onSubmit={handleSubmit} className="mt-4 space-y-2">
          <input
            type="text"
            placeholder="Введите текст вопроса"
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
            value={newQuestionText}
            onChange={(e) => setNewQuestionText(e.target.value)}
            autoFocus
            disabled={creating}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={creating || !newQuestionText.trim()}
              className="px-3 py-1.5 text-sm font-medium text-white bg-[#FF8600] hover:bg-[#FF6B00] disabled:opacity-50 rounded-lg transition cursor-pointer"
            >
              {creating ? 'Добавление…' : 'Добавить'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowInput(false)
                setNewQuestionText('')
              }}
              disabled={creating}
              className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 rounded-lg transition cursor-pointer"
            >
              Отмена
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowInput(true)}
          className="mt-4 w-full py-2 border-2 border-dashed border-gray-200 hover:border-blue-400 hover:text-blue-600 text-gray-500 text-sm font-medium rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Добавить вопрос
        </button>
      )}
    </div>
  )
}
