import { useEffect, useRef, useState } from 'react'
import type { Question, QuestionProps } from '../types'

interface QuestionEditorProps {
  question: Question | null
  saving?: boolean
  readOnly?: boolean
  onSave: (question: Question) => Promise<void>
}

const typeLabels: Record<Question['type'], string> = {
  text: 'Текстовый ответ',
  scale: 'Шкала оценок',
  radio: 'Один из списка',
  checkboxes: 'Несколько из списка',
  dropdown: 'Выпадающий список',
  date: 'Дата',
  stars: 'Оценка звёздами',
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
  const [maxStars, setMaxStars] = useState<number>(5)
  const [minSelect, setMinSelect] = useState<number | ''>('')
  const [maxSelect, setMaxSelect] = useState<number | ''>('')
  const dirtyRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onSaveRef = useRef(onSave)
  useEffect(() => {
    onSaveRef.current = onSave
  }, [onSave])

  const fieldsRef = useRef({
    text: '',
    type: 'scale' as Question['type'],
    isRequired: false,
    options: [] as { value: number; label: string }[],
    min: '' as number | '',
    max: '' as number | '',
    step: '' as number | '',
    maxStars: 5,
    minSelect: '' as number | '',
    maxSelect: '' as number | '',
  })
  fieldsRef.current = { text, type, isRequired, options, min, max, step, maxStars, minSelect, maxSelect }

  const markDirty = () => {
    dirtyRef.current = true
  }

  const loadFromQuestion = (q: Question | null) => {
    if (q) {
      setText(q.text)
      setType(q.type)
      setIsRequired(q.isRequired ?? false)
      if (q.type === 'scale') {
        setMin(q.props?.min != null ? Number(q.props.min) : '')
        setMax(q.props?.max != null ? Number(q.props.max) : '')
        setStep(parseStep(q.props?.step))
        setOptions([])
        setMaxStars(5)
        setMinSelect('')
        setMaxSelect('')
      } else if (q.type === 'radio' || q.type === 'checkboxes' || q.type === 'dropdown') {
        setOptions(
          Object.entries(q.props ?? {})
            .filter(([k]) => !['min', 'max', 'step', 'maxStars', 'minSelect', 'maxSelect'].includes(k))
            .map(([k, v]) => ({ value: Number(k), label: String(v) }))
            .sort((a, b) => a.value - b.value),
        )
        setMin('')
        setMax('')
        setStep('')
        setMaxStars(5)
        setMinSelect(q.type === 'checkboxes' && q.props?.minSelect != null ? Number(q.props.minSelect) : '')
        setMaxSelect(q.type === 'checkboxes' && q.props?.maxSelect != null ? Number(q.props.maxSelect) : '')
      } else if (q.type === 'stars') {
        setMaxStars(Number(q.props?.maxStars ?? q.props?.max ?? 5))
        setMin('')
        setMax('')
        setStep('')
        setOptions([])
        setMinSelect('')
        setMaxSelect('')
      } else {
        setMin('')
        setMax('')
        setStep('')
        setOptions([])
        setMaxStars(5)
        setMinSelect('')
        setMaxSelect('')
      }
    } else {
      setText('')
      setType('scale')
      setIsRequired(false)
      setMin('')
      setMax('')
      setStep('')
      setOptions([])
      setMaxStars(5)
      setMinSelect('')
      setMaxSelect('')
    }
  }

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    loadFromQuestion(question)
    dirtyRef.current = false
  }, [question])

  const buildPayload = (q: Question): Question | null => {
    const f = fieldsRef.current
    if (!f.text.trim()) return null
    let props: QuestionProps | undefined
    if (f.type === 'scale') {
      const scaleProps: QuestionProps = {}
      if (f.min !== '') scaleProps['min'] = Number(f.min)
      if (f.max !== '') scaleProps['max'] = Number(f.max)
      if (f.step !== '') scaleProps['step'] = Number(f.step)
      props = scaleProps
    } else if (f.type === 'radio' || f.type === 'checkboxes' || f.type === 'dropdown') {
      const optionProps: QuestionProps = {}
      f.options.forEach((o, i) => {
        optionProps[String(i + 1)] = o.label.trim()
      })
      if (f.type === 'checkboxes') {
        if (f.minSelect !== '') optionProps['minSelect'] = Number(f.minSelect)
        if (f.maxSelect !== '' && Number(f.maxSelect) > 0) optionProps['maxSelect'] = Number(f.maxSelect)
      }
      props = optionProps
    } else if (f.type === 'stars') {
      props = { maxStars: f.maxStars }
    }
    return { ...q, text: f.text, type: f.type, isRequired: f.isRequired, props }
  }

  useEffect(() => {
    if (!question || readOnly || !dirtyRef.current || !text.trim()) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      dirtyRef.current = false
      const payload = buildPayload(question)
      if (payload) {
        onSaveRef.current(payload).catch(() => {
          dirtyRef.current = true
        })
      }
    }, 500)
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [text, type, isRequired, options, min, max, step, maxStars, minSelect, maxSelect, question, readOnly])

  useEffect(() => {
    return () => {
      if (dirtyRef.current && question && !readOnly) {
        dirtyRef.current = false
        const payload = buildPayload(question)
        if (payload) onSaveRef.current(payload).catch(() => { dirtyRef.current = true })
      }
    }
  }, [question, readOnly])

  const handleReset = () => {
    if (!question) return
    loadFromQuestion(question)
    dirtyRef.current = false
  }

  if (!question) {
    return (
      <div className="bg-white dark:bg-[#1e222e] border border-gray-200 dark:border-[#3a4250] rounded-2xl p-6 shadow-sm flex items-center justify-center h-48">
        <p className="text-gray-400 dark:text-gray-400 text-sm">Выберите вопрос из списка</p>
      </div>
    )
  }

  return (
    <form onSubmit={(e) => e.preventDefault()} className={`bg-white dark:bg-[#1e222e] border border-gray-200 dark:border-[#3a4250] rounded-2xl p-6 shadow-sm space-y-5 lg:overflow-y-auto lg:h-full ${readOnly ? 'opacity-80' : ''}`}>
      <div className="flex items-center justify-between">
        {readOnly ? (
          <p className="text-xs text-gray-500 dark:text-gray-300 bg-gray-50 dark:bg-[#161a22] border border-gray-200 dark:border-[#3a4250] rounded-lg px-3 py-2">
            Режим просмотра — изменить вопросы нельзя
          </p>
        ) : (
          <p className="text-xs text-gray-400 dark:text-gray-400">Изменения сохраняются автоматически</p>
        )}
        {!readOnly && saving && (
            <span className="text-xs text-gray-400 dark:text-gray-400 flex items-center gap-1.5">
              <span className="w-3 h-3 border-2 border-gray-300 dark:border-[#3a4250] border-t-[#FF8600] rounded-full animate-spin" />
            Сохранение…
          </span>
        )}
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-2">
          Формулировка вопроса
        </label>
        <input
          type="text"
            className="w-full border border-gray-200 dark:border-[#3a4250] rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 dark:focus:border-[#FF8600] dark:text-gray-200 text-sm shadow-sm font-medium disabled:bg-gray-50 dark:disabled:bg-[#2b323f] dark:disabled:text-gray-400 disabled:cursor-default"
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            markDirty()
          }}
          readOnly={readOnly}
          disabled={readOnly}
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-2">
          Тип ответа
        </label>
        <select
            className="w-full border border-gray-200 dark:border-[#3a4250] rounded-xl px-4 py-2.5 bg-white dark:bg-[#1e222e] focus:outline-none focus:border-blue-500 dark:focus:border-[#FF8600] text-sm shadow-sm dark:text-gray-200 disabled:bg-gray-50 dark:disabled:bg-[#2b323f] dark:disabled:text-gray-400 disabled:cursor-default"
          value={type}
          onChange={(e) => {
            setType(e.target.value as Question['type'])
            markDirty()
          }}
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
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-2">
              Мин.
            </label>
            <input
              type="number"
              className="w-full border border-gray-200 dark:border-[#3a4250] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-[#FF8600] dark:text-gray-200 disabled:bg-gray-50 dark:disabled:bg-[#2b323f] dark:disabled:text-gray-400 disabled:cursor-default"
              value={min}
              onChange={(e) => {
                setMin(e.target.value === '' ? '' : Number(e.target.value))
                markDirty()
              }}
              readOnly={readOnly}
              disabled={readOnly}
              placeholder="1"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-2">
              Макс.
            </label>
            <input
              type="number"
              className="w-full border border-gray-200 dark:border-[#3a4250] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-[#FF8600] dark:text-gray-200 disabled:bg-gray-50 dark:disabled:bg-[#2b323f] dark:disabled:text-gray-400 disabled:cursor-default"
              value={max}
              onChange={(e) => {
                setMax(e.target.value === '' ? '' : Number(e.target.value))
                markDirty()
              }}
              readOnly={readOnly}
              disabled={readOnly}
              placeholder="5"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-2">
              Шаг
            </label>
            <input
              type="number"
              step={1}
              className="w-full border border-gray-200 dark:border-[#3a4250] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-[#FF8600] dark:text-gray-200 disabled:bg-gray-50 dark:disabled:bg-[#2b323f] dark:disabled:text-gray-400 disabled:cursor-default"
              value={step}
              onChange={(e) => {
                setStep(e.target.value === '' ? '' : Math.max(1, Math.round(Number(e.target.value))))
                markDirty()
              }}
              readOnly={readOnly}
              disabled={readOnly}
              placeholder="1"
            />
          </div>
        </div>
      )}

      {(type === 'radio' || type === 'checkboxes' || type === 'dropdown') && (
        <div>
          <label className="block text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-2">
            Варианты ответов
          </label>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                  <span className="text-xs bg-gray-100 dark:bg-[#303a48] text-gray-500 dark:text-gray-300 font-bold w-6 h-6 rounded-md flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <input
                  type="text"
                  className="flex-1 border border-gray-200 dark:border-[#3a4250] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-[#FF8600] dark:text-gray-200 disabled:bg-gray-50 dark:disabled:bg-[#2b323f] dark:disabled:text-gray-400 disabled:cursor-default"
                  value={opt.label}
                  onChange={(e) => {
                    const next = [...options]
                    next[i] = { ...opt, label: e.target.value }
                    setOptions(next)
                    markDirty()
                  }}
                  readOnly={readOnly}
                  disabled={readOnly}
                  placeholder={`Вариант ${i + 1}`}
                />
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => {
                      setOptions(options.filter((_, idx) => idx !== i))
                      markDirty()
                    }}
                    className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 dark:text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition cursor-pointer shrink-0"
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
              onClick={() => {
                setOptions([...options, { value: options.length + 1, label: '' }])
                markDirty()
              }}
              className="mt-2 w-full py-2 border-2 border-dashed border-gray-200 dark:border-[#3a4250] hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 text-gray-500 dark:text-gray-300 text-sm font-medium rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Добавить вариант
            </button>
          )}
        </div>
      )}

      {type === 'checkboxes' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-2">
              Мин. выборов
            </label>
            <input
              type="number"
              min={0}
              className="w-full border border-gray-200 dark:border-[#3a4250] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-[#FF8600] dark:text-gray-200 disabled:bg-gray-50 dark:disabled:bg-[#2b323f] dark:disabled:text-gray-400 disabled:cursor-default"
              value={minSelect}
              onChange={(e) => {
                setMinSelect(e.target.value === '' ? '' : Math.max(0, Math.round(Number(e.target.value))))
                markDirty()
              }}
              readOnly={readOnly}
              disabled={readOnly}
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-2">
              Макс. выборов
            </label>
            <input
              type="number"
              min={0}
              className="w-full border border-gray-200 dark:border-[#3a4250] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-[#FF8600] dark:text-gray-200 disabled:bg-gray-50 dark:disabled:bg-[#2b323f] dark:disabled:text-gray-400 disabled:cursor-default"
              value={maxSelect}
              onChange={(e) => {
                setMaxSelect(e.target.value === '' ? '' : Math.max(0, Math.round(Number(e.target.value))))
                markDirty()
              }}
              readOnly={readOnly}
              disabled={readOnly}
              placeholder="все"
            />
          </div>
        </div>
      )}

      {type === 'stars' && (
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Количество звёзд
          </label>
          <select
            className="w-full border border-gray-200 dark:border-[#3a4250] rounded-xl px-4 py-2.5 bg-white dark:bg-[#1e222e] focus:outline-none focus:border-blue-500 dark:focus:border-[#FF8600] text-sm text-gray-800 dark:text-gray-100 shadow-sm disabled:bg-gray-50 dark:disabled:bg-[#2b323f] dark:disabled:text-gray-300 disabled:cursor-default"
            value={maxStars}
            onChange={(e) => {
              setMaxStars(Number(e.target.value))
              markDirty()
            }}
            disabled={readOnly}
          >
            {[3, 4, 5, 7, 10].map((n) => (
              <option key={n} value={n} className="bg-white dark:bg-[#1e222e] text-gray-800 dark:text-gray-100">{n}</option>
            ))}
          </select>
        </div>
      )}

      {!readOnly && (
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isRequired}
            onChange={(e) => {
              setIsRequired(e.target.checked)
              markDirty()
            }}
            className="w-4 h-4 text-[#FF8600] rounded focus:ring-[#FF8600]"
          />
          <span className="text-sm text-gray-700 dark:text-gray-200">
            Обязательный вопрос
            <span className="text-gray-400 dark:text-gray-400"> — нельзя отправить опрос, не ответив на него</span>
          </span>
        </label>
      )}

      {!readOnly && (
        <div className="pt-4 border-t border-gray-100 dark:border-[#303a48] flex justify-end">
          <button
            type="button"
            onClick={handleReset}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200 rounded-xl transition cursor-pointer"
          >
            Сбросить
          </button>
        </div>
      )}
    </form>
  )
}
