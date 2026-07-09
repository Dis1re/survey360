import { useState } from 'react'
import type { ApiQuestion } from '../types'

interface AnswerPanelProps {
  question: ApiQuestion | null
  onAnswer: (text: string) => void
}

const typeLabels: Record<string, string> = {
  radio: 'Один вариант из списка',
  scale: 'Шкала оценок (от 1 до 5)',
  text: 'Развернутый текстовый ответ',
}

export function AnswerPanel({ question, onAnswer }: AnswerPanelProps) {
  const [text, setText] = useState('')
  const [scaleValue, setScaleValue] = useState<number | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!question) return
    if (question.type === 'scale') {
      if (scaleValue === null) return
      onAnswer(String(scaleValue))
    } else {
      if (!text.trim()) return
      onAnswer(text.trim())
    }
  }

  if (!question) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex items-center justify-center h-48">
        <p className="text-gray-400 text-sm">Выберите вопрос из списка слева</p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-5"
    >
      <div>
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          Вопрос #{question.id}
        </span>
        <h3 className="text-lg font-semibold text-gray-900 mt-1">{question.text}</h3>
        <p className="text-xs text-gray-400 mt-1">
          {typeLabels[question.type] ?? question.type}
        </p>
      </div>

      {question.type === 'scale' ? (
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Ваша оценка
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setScaleValue(value)}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition cursor-pointer ${
                  scaleValue === value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      ) : question.type === 'radio' ? (
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Ваш ответ
          </label>
          <input
            type="text"
            placeholder="Введите вариант ответа"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 text-sm shadow-sm"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
      ) : (
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Ваш ответ
          </label>
          <textarea
            rows={5}
            placeholder="Введите развёрнутый ответ"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 text-sm shadow-sm resize-none"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
      )}

      <div className="pt-4 border-t border-gray-100 flex justify-end">
        <button
          type="submit"
          className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-sm cursor-pointer"
        >
          Отправить ответ
        </button>
      </div>
    </form>
  )
}
