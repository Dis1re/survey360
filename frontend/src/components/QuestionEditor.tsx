import { useEffect, useState } from 'react'
import type { Question } from '../types'

interface QuestionEditorProps {
  question: Question | null
  saving?: boolean
  onSave: (question: Question) => Promise<void>
}

const typeLabels: Record<Question['type'], string> = {
  radio: 'Один вариант из списка (Radio)',
  scale: 'Шкала оценок (от 1 до 5)',
  text: 'Развернутый текстовый ответ',
}

export function QuestionEditor({ question, saving = false, onSave }: QuestionEditorProps) {
  const [text, setText] = useState('')
  const [type, setType] = useState<Question['type']>('scale')
  const [options, setOptions] = useState<{ value: number; label: string }[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (question) {
      setText(question.text)
      setType(question.type)
      setOptions(question.options ?? [])
      setError(null)
    }
  }, [question])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question || !text.trim()) return
    setError(null)
    try {
      await onSave({
        ...question,
        text,
        type,
        options: type === 'scale' || type === 'radio' ? options : undefined,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить вопрос')
    }
  }

  const handleReset = () => {
    if (!question) return
    setText(question.text)
    setType(question.type)
    setOptions(question.options ?? [])
  }

  if (!question) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex items-center justify-center h-48">
        <p className="text-gray-400 text-sm">Выберите вопрос из списка</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-5">
      <div>
        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
          Формулировка вопроса
        </label>
        <input
          type="text"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 text-sm shadow-sm font-medium"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
          Тип ответа
        </label>
        <select
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 bg-white focus:outline-none focus:border-blue-500 text-sm shadow-sm"
          value={type}
          onChange={(e) => setType(e.target.value as Question['type'])}
        >
          {(Object.keys(typeLabels) as Question['type'][]).map((key) => (
            <option key={key} value={key}>{typeLabels[key]}</option>
          ))}
        </select>
      </div>

      {(type === 'scale' || type === 'radio') && (
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            {type === 'scale' ? 'Крайние значения шкалы' : 'Варианты ответов'}
          </label>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs bg-gray-100 text-gray-500 font-bold w-6 h-6 rounded-md flex items-center justify-center shrink-0">
                  {opt.value}
                </span>
                <input
                  type="text"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                  value={opt.label}
                  onChange={(e) => {
                    const next = [...options]
                    next[i] = { ...opt, label: e.target.value }
                    setOptions(next)
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
        <button
          type="button"
          onClick={handleReset}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 rounded-xl transition cursor-pointer"
        >
          Сбросить
        </button>
        <button
          type="submit"
          disabled={saving || !text.trim()}
          className="px-5 py-2 text-sm font-medium text-white bg-[#FF8600] hover:bg-[#FF6B00] disabled:opacity-50 rounded-xl transition shadow-sm cursor-pointer"
        >
          {saving ? 'Сохранение…' : 'Сохранить изменения'}
        </button>
      </div>
    </form>
  )
}
