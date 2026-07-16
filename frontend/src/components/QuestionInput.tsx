import type { Question } from '../types'

export function QuestionInput({
  question,
  value,
  onChange,
  readOnly = false,
}: {
  question: Question
  value: string
  onChange: (value: string) => void
  readOnly?: boolean
}) {
  if (question.type === 'scale') {
    const selected = value ? Number(value) : null
    const min = Number(question.props?.min ?? 1)
    const max = Number(question.props?.max ?? 5)
    const baseStep = Math.max(1, Math.abs(Math.round(Number(question.props?.step ?? 1))))
    const step = min > max ? -baseStep : baseStep
    const values: number[] = []
    if (baseStep !== 0) {
      if (step > 0) {
        for (let n = min; n <= max; n += step) values.push(Math.round(n))
      } else {
        for (let n = min; n >= max; n += step) values.push(Math.round(n))
      }
    } else {
      for (let n = 1; n <= 5; n++) values.push(n)
    }
    return (
      <div className="flex flex-wrap gap-2">
        {values.map((n) => (
          <button
            key={n}
            type="button"
            disabled={readOnly}
            onClick={() => onChange(String(n))}
            className={`soft-press flex-1 min-w-[44px] py-3 rounded-xl border text-sm font-semibold ${
              readOnly ? 'cursor-default' : 'cursor-pointer'
            } ${
              selected === n
                ? 'border-[#FF8600] bg-orange-50 dark:bg-[#FF8600]/15 text-[#FF6B00] dark:text-[#FF8600]'
                : readOnly
                  ? 'border-gray-200 dark:border-[#3a4250] text-gray-400 dark:text-gray-400 bg-gray-50 dark:bg-[#161a22]'
                  : 'border-gray-200 dark:border-[#3a4250] text-gray-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#262d3a]'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    )
  }

  if (question.type === 'radio') {
    const options = question.options ?? []
    if (options.length === 0) {
      return (
        <input
          type="text"
          value={value}
          readOnly={readOnly}
          disabled={readOnly}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ваш ответ"
          className={`w-full border border-gray-200 dark:border-[#3a4250] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-[#FF8600] ${
            readOnly ? 'bg-gray-50 dark:bg-[#161a22] text-gray-600 dark:text-gray-200 cursor-default' : ''
          }`}
        />
      )
    }
    return (
      <div className="space-y-2">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={`soft-lift flex items-start gap-3 p-3 rounded-xl border ${
              readOnly ? 'cursor-default' : 'cursor-pointer'
            } ${
              value === String(opt.value)
                ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-500/10'
                : readOnly
                  ? 'border-gray-100 dark:border-[#303a48] bg-gray-50 dark:bg-[#161a22]'
                  : 'border-gray-100 dark:border-[#303a48] hover:bg-gray-50 dark:hover:bg-[#262d3a]'
            } ${readOnly && value !== String(opt.value) ? 'opacity-80' : ''}`}
          >
            <input
              type="radio"
              name={`q-${question.id}`}
              checked={value === String(opt.value)}
              disabled={readOnly}
              onChange={() => onChange(String(opt.value))}
              className="w-4 h-4 text-blue-600 mt-0.5 shrink-0"
            />
            <span className="text-sm text-gray-800 dark:text-gray-200 min-w-0 flex-1 break-words">
              {opt.label || String(opt.value)}
            </span>
          </label>
        ))}
      </div>
    )
  }

  return (
    <textarea
      value={value}
      readOnly={readOnly}
      disabled={readOnly}
      onChange={(e) => onChange(e.target.value)}
      rows={4}
      placeholder="Ваш развёрнутый ответ…"
      className={`w-full border border-gray-200 dark:border-[#3a4250] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-[#FF8600] resize-none ${
        readOnly ? 'bg-gray-50 dark:bg-[#161a22] text-gray-600 dark:text-gray-200 cursor-default' : ''
      }`}
    />
  )
}
