import { useState } from 'react'
import type { Question } from '../types'

interface QuestionListProps {
  questions: Question[]
  activeQuestionId: number | null
  onQuestionSelect: (id: number) => void
  onAdd: (text: string, type: string) => void
}

const typeOptions = [
  { value: 'text', label: 'Текст' },
  { value: 'scale', label: 'Шкала' },
  { value: 'radio', label: 'Выбор варианта' },
]

export function QuestionList({ questions, activeQuestionId, onQuestionSelect, onAdd }: QuestionListProps) {
  const [newQuestionText, setNewQuestionText] = useState('')
  const [newQuestionType, setNewQuestionType] = useState('text')
  const [showInput, setShowInput] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newQuestionText.trim()) return
    onAdd(newQuestionText.trim(), newQuestionType)
    setNewQuestionText('')
    setNewQuestionType('text')
    setShowInput(false)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col">
      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
        Вопросы анкеты ({questions.length})
      </span>

      <div className="space-y-2 flex-1 overflow-y-auto pr-1">
        {questions.map((q) => {
          const isActive = q.id === activeQuestionId
          return (
            <div
              key={q.id}
              onClick={() => onQuestionSelect(q.id)}
              className={`p-3 rounded-xl cursor-pointer text-sm font-medium flex items-center justify-between transition ${
                isActive
                  ? 'bg-gray-50 border border-blue-500 text-gray-900'
                  : 'hover:bg-gray-50 border border-gray-100 text-gray-600'
              }`}
            >
              <span className="truncate">{q.text}</span>
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
              </svg>
            </div>
          )
        })}
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
          />
          <div className="flex gap-2">
            <select
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-blue-500"
              value={newQuestionType}
              onChange={(e) => setNewQuestionType(e.target.value)}
            >
              {typeOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <button type="submit" className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition cursor-pointer">
              Добавить
            </button>
            <button
              type="button"
              onClick={() => { setShowInput(false); setNewQuestionText(''); setNewQuestionType('text') }}
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
