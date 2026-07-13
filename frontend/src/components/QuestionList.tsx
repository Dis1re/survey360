import { useState } from 'react'
import type { Question } from '../types'

interface QuestionListProps {
  questions: Question[]
  activeQuestionId: number | null
  creating?: boolean
  deleting?: boolean
  readOnly?: boolean
  onQuestionSelect: (id: number) => void
  onQuestionCreate: (text: string) => Promise<void>
  onQuestionDelete: (id: number) => Promise<void>
  onReorder: (orderedIds: number[]) => Promise<void>
}

export function QuestionList({
  questions,
  activeQuestionId,
  creating = false,
  deleting = false,
  readOnly = false,
  onQuestionSelect,
  onQuestionCreate,
  onQuestionDelete,
  onReorder,
}: QuestionListProps) {
  const [newQuestionText, setNewQuestionText] = useState('')
  const [showInput, setShowInput] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    if (readOnly) return
    setDragIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (index: number) => (e: React.DragEvent) => {
    if (readOnly || dragIndex === null) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (overIndex !== index) setOverIndex(index)
  }

  const handleDrop = (index: number) => async (e: React.DragEvent) => {
    e.preventDefault()
    const from = dragIndex
    setDragIndex(null)
    setOverIndex(null)
    if (readOnly || from === null || from === index) return

    const next = [...questions]
    const [moved] = next.splice(from, 1)
    next.splice(index, 0, moved)
    await onReorder(next.map((q) => q.id))
  }

  const handleDragEnd = () => {
    setDragIndex(null)
    setOverIndex(null)
  }

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
        {!readOnly && questions.length > 1 && (
          <span className="ml-1 font-normal normal-case text-gray-300">· перетащите для сортировки</span>
        )}
      </span>

      <div className="space-y-2 flex-1 overflow-y-auto pr-1">
        {questions.length === 0 ? (
          <p className="text-sm text-gray-400 px-1 py-2">Вопросов пока нет</p>
        ) : (
          questions.map((question, index) => {
            const isActive = question.id === activeQuestionId
            const isDragging = dragIndex === index
            const isOver = overIndex === index && dragIndex !== null && dragIndex !== index
            return (
              <div
                key={question.id}
                draggable={!readOnly}
                onDragStart={handleDragStart(index)}
                onDragOver={handleDragOver(index)}
                onDrop={handleDrop(index)}
                onDragEnd={handleDragEnd}
                onClick={() => onQuestionSelect(question.id)}
                className={`p-3 rounded-xl cursor-pointer text-sm font-medium flex items-center justify-between transition ${
                  isActive
                    ? 'bg-gray-50 border border-blue-500 text-gray-900'
                    : 'hover:bg-gray-50 border border-gray-100 text-gray-600'
                } ${isDragging ? 'opacity-40' : ''} ${
                  isOver ? 'border-blue-400 ring-2 ring-blue-100' : ''
                }`}
              >
                <span className="truncate min-w-0">
                  <span className="text-gray-400 mr-1.5">{index + 1}.</span>
                  {question.text}
                </span>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <svg
                    className={`w-4 h-4 shrink-0 ${readOnly ? 'text-gray-300' : 'text-gray-400 cursor-grab active:cursor-grabbing'}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
                  </svg>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onQuestionDelete(question.id)
                      }}
                      disabled={deleting}
                      className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition disabled:opacity-50 cursor-pointer"
                      title="Удалить вопрос"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m2 0v14a1 1 0 01-1 1H7a1 1 0 01-1-1V6h12z" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {readOnly ? (
        <p className="mt-4 text-xs text-gray-400 text-center px-2">
          Редактирование недоступно — опрос уже запущен или завершён
        </p>
      ) : showInput ? (
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
