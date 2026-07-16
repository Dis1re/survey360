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
  onDeleteAll?: () => void
  onPreview?: () => void
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
  onDeleteAll,
  onPreview,
}: QuestionListProps) {
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


  return (
    <div className="bg-white dark:bg-[#1e222e] border border-gray-200 dark:border-[#3a4250] rounded-2xl p-4 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">
          Вопросы анкеты ({questions.length})
        </span>
        {!readOnly && questions.length > 0 && (
          <button
            type="button"
            onClick={onDeleteAll}
            className="soft-press shrink-0 text-xs font-medium text-red-500 hover:text-red-600 dark:hover:text-red-400 border border-red-200 dark:border-red-500/40 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg px-2.5 py-1 cursor-pointer"
            title="Удалить все вопросы анкеты"
          >
            Удалить всё
          </button>
        )}
      </div>

      <div className="space-y-2 flex-1 min-h-0 overflow-y-auto pr-1">
        {questions.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-400 px-1 py-2">Вопросов пока нет</p>
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
                className={`soft-lift p-3 rounded-xl cursor-pointer text-sm font-medium flex items-center justify-between ${
                  isActive
                    ? 'bg-gray-50 dark:bg-[#161a22] border border-blue-500 text-gray-900 dark:text-gray-100'
                    : 'hover:bg-gray-50 dark:hover:bg-[#262d3a] border border-gray-100 dark:border-[#303a48] text-gray-600 dark:text-gray-300'
                } ${isDragging ? 'opacity-40' : ''} ${
                  isOver ? 'border-blue-400 ring-2 ring-blue-100' : ''
                }`}
              >
                <span className="truncate min-w-0">
                  <span className="text-gray-400 dark:text-gray-400 mr-1.5">{index + 1}.</span>
                  {question.text}
                  {question.isRequired && (
                    <span className="ml-1.5 text-red-500" title="Обязательный вопрос">*</span>
                  )}
                </span>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <svg
                    className={`w-4 h-4 shrink-0 ${readOnly ? 'text-gray-300' : 'text-gray-400 dark:text-gray-400 cursor-grab active:cursor-grabbing'}`}
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
                      className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 dark:text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition disabled:opacity-50 cursor-pointer"
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
        <p className="mt-4 text-xs text-gray-400 dark:text-gray-400 text-center px-2">
          Редактирование недоступно — опрос уже запущен или завершён
        </p>
      ) : (
        <button
          onClick={() => onQuestionCreate('')}
          disabled={creating}
          className="mt-4 w-full py-2 border-2 border-dashed border-gray-200 dark:border-[#3a4250] hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 text-gray-500 dark:text-gray-300 text-sm font-medium rounded-xl soft-press flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
        >
          {creating ? (
            'Добавление…'
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Добавить вопрос
            </>
          )}
        </button>
      )}

      <button
        type="button"
        onClick={onPreview}
        disabled={questions.length === 0}
        className="mt-2 w-full text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-gray-100 py-2.5 rounded-lg border border-gray-200 dark:border-[#3a4250] hover:border-gray-300 dark:hover:border-[#3a4250] transition disabled:opacity-40 disabled:cursor-default cursor-pointer"
      >
        Предпросмотр
      </button>
    </div>
  )
}
