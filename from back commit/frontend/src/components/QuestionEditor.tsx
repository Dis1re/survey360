import { useEffect, useState } from 'react'
import type { Question, QuestionProps } from '../types'

interface QuestionEditorProps {
  question: Question | null
  saving?: boolean
  readOnly?: boolean
  onSave: (question: Question) => Promise<void>
}

const typeLabels: Record<Question['type'], string> = {
  radio: 'Один вариант из списка (Radio)',
  scale: 'Шкала оценок',
  text: 'Развернутый текстовый ответ',
}

function parseStep(value: unknown): number | '' {
  if (value == null || value === '') return ''
  const v = Math.round(Number(value))
  return v < 1 ? 1 : v
}

export function QuestionEditor({ question, saving = false, readOnly = false, onSave }: QuestionEditorProps) {
  const [text, setText] = useState('')
  const [type, setType] = useState<Question['type']>('scale')
  const [options, setOptions] = useState<{ value: number; label: string }[]>([])
  const [isRequired, setIsRequired] = useState(false)
  const [min, setMin] = useState<number | ''>('')
  const [max, setMax] = useState<number | ''>('')
  const [step, setStep] = useState<number | ''>('')

  useEffect(() => {
    if (question) {
      setText(question.text)
      setType(question.type)
      setIsRequired(question.isRequired ?? false)
      if (question.type === 'scale') {
        setMin(question.props?.min != null ? Number(question.props.min) : '')
        setMax(question.props?.max != null ? Number(question.props.max) : '')
        setStep(parseStep(question.props?.step))
        setOptions([])
      } else if (question.type === 'radio') {
        setOptions(
          Object.entries(question.props ?? {})
            .map(([k, v]) => ({ value: Number(k), label: String(v) }))
            .sort((a, b) => a.value - b.value),
        )
        setMin('')
        setMax('')
        setStep('')
      } else {
        setMin('')
        setMax('')
        setStep('')
        setOptions([])
      }
    }
  }, [question])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question || !text.trim()) return
    try {
      let props: QuestionProps | undefined
      if (type === 'scale') {
        const scaleProps: QuestionProps = {}
        if (min !== '') scaleProps['min'] = Number(min)
        if (max !== '') scaleProps['max'] = Number(max)
        if (step !== '') scaleProps['step'] = Number(step)
        props = scaleProps
      } else if (type === 'radio') {
        const radioProps: QuestionProps = {}
        options
          .map((o) => o.label.trim())
          .filter((label) => label !== '')
          .forEach((label, i) => {
            radioProps[String(i + 1)] = label
          })
        props = radioProps
      }
      await onSave({
        ...question,
        text,
        type,
        isRequired,
        props,
      })
    } catch (err) {
      console.error(err)
    }
  }

  const handleReset = () => {
    if (!question) return
    setText(question.text)
    setType(question.type)
    setIsRequired(question.isRequired ?? false)
    if (question.type === 'scale') {
      setMin(question.props?.min != null ? Number(question.props.min) : '')
      setMax(question.props?.max != null ? Number(question.props.max) : '')
      setStep(parseStep(question.props?.step))
      setOptions([])
    } else if (question.type === 'radio') {
      setOptions(
        Object.entries(question.props ?? {})
          .map(([k, v]) => ({ value: Number(k), label: String(v) }))
          .sort((a, b) => a.value - b.value),
      )
      setMin('')
      setMax('')
      setStep('')
    } else {
      setMin('')
      setMax('')
      setStep('')
      setOptions([])
    }
  }

  if (!question) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex items-center justify-center h-48">
        <p className="text-gray-400 text-sm">Выберите вопрос из списка</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={`bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-5 ${readOnly ? 'opacity-80' : ''}`}>
      {readOnly && (
        <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          Режим просмотра — изменить вопросы нельзя
        </p>
      )}
      <div>
        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
          Формулировка вопроса
        </label>
        <input
          type="text"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 text-sm shadow-sm font-medium disabled:bg-gray-50 disabled:cursor-default"
          value={text}
          onChange={(e) => setText(e.target.value)}
          readOnly={readOnly}
          disabled={readOnly}
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
          Тип ответа
        </label>
        <select
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 bg-white focus:outline-none focus:border-blue-500 text-sm shadow-sm disabled:bg-gray-50 disabled:cursor-default"
          value={type}
          onChange={(e) => setType(e.target.value as Question['type'])}
          disabled={readOnly}
        >
          {(Object.keys(typeLabels) as Question['type'][]).map((key) => (
            <option key={key} value={key}>{typeLabels[key]}</option>
          ))}
        </select>
      </div>

      {type === 'scale' && (
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Мин.
            </label>
            <input
              type="number"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 disabled:bg-gray-50 disabled:cursor-default"
              value={min}
              onChange={(e) => setMin(e.target.value === '' ? '' : Number(e.target.value))}
              readOnly={readOnly}
              disabled={readOnly}
              placeholder="1"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Макс.
            </label>
            <input
              type="number"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 disabled:bg-gray-50 disabled:cursor-default"
              value={max}
              onChange={(e) => setMax(e.target.value === '' ? '' : Number(e.target.value))}
              readOnly={readOnly}
              disabled={readOnly}
              placeholder="5"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Шаг
            </label>
            <input
              type="number"
              step={1}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 disabled:bg-gray-50 disabled:cursor-default"
              value={step}
              onChange={(e) => setStep(e.target.value === '' ? '' : Math.max(1, Math.round(Number(e.target.value))))}
              readOnly={readOnly}
              disabled={readOnly}
              placeholder="1"
            />
          </div>
        </div>
      )}

      {type === 'radio' && (
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Варианты ответов
          </label>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs bg-gray-100 text-gray-500 font-bold w-6 h-6 rounded-md flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <input
                  type="text"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 disabled:bg-gray-50 disabled:cursor-default"
                  value={opt.label}
                  onChange={(e) => {
                    const next = [...options]
                    next[i] = { ...opt, label: e.target.value }
                    setOptions(next)
                  }}
                  readOnly={readOnly}
                  disabled={readOnly}
                  placeholder={`Вариант ${i + 1}`}
                />
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => setOptions(options.filter((_, idx) => idx !== i))}
                    className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition cursor-pointer shrink-0"
                    title="Удалить вариант"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          {!readOnly && (
            <button
              type="button"
              onClick={() => setOptions([...options, { value: options.length + 1, label: '' }])}
              className="mt-2 w-full py-2 border-2 border-dashed border-gray-200 hover:border-blue-400 hover:text-blue-600 text-gray-500 text-sm font-medium rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Добавить вариант
            </button>
          )}
        </div>
      )}

      {!readOnly && (
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isRequired}
            onChange={(e) => setIsRequired(e.target.checked)}
            className="w-4 h-4 text-[#FF8600] rounded focus:ring-[#FF8600]"
          />
          <span className="text-sm text-gray-700">
            Обязательный вопрос
            <span className="text-gray-400"> — нельзя отправить опрос, не ответив на него</span>
          </span>
        </label>
      )}

      {!readOnly && (
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
      )}
    </form>
  )
}
