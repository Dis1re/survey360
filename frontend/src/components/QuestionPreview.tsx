import type { Question } from '../types'

function getOptions(props?: Record<string, string | number>): { value: number; label: string }[] {
  if (!props) return []
  return Object.entries(props)
    .filter(([k]) => !['min', 'max', 'step', 'maxStars'].includes(k))
    .map(([k, v]) => ({ value: Number(k), label: String(v) }))
    .sort((a, b) => a.value - b.value)
}

function StarIcon({ filled, className = '' }: { filled: boolean; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  )
}

export function QuestionPreviewInput({ question }: { question: Question }) {
  if (question.type === 'scale') {
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
      <div className="flex flex-wrap gap-2" aria-disabled>
        {values.map((n) => (
          <button
            key={n}
            type="button"
            disabled
            className="flex-1 min-w-[44px] py-3 rounded-xl border text-sm font-semibold transition cursor-default border-gray-200 bg-gray-50 text-gray-600"
          >
            {n}
          </button>
        ))}
      </div>
    )
  }

  if (question.type === 'radio') {
    const options = getOptions(question.props)
    return (
      <div className="space-y-2" aria-disabled>
        {options.length === 0 ? (
          <input type="text" value="" readOnly disabled placeholder="Ваш ответ" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 text-gray-600 cursor-default" />
        ) : (
          <div className="space-y-2">
            {options.map((opt) => (
              <div key={opt.value} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50 cursor-default">
                <input type="radio" name={`preview-q-${question.id}`} checked={false} disabled className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <span className="text-sm text-gray-800 min-w-0 flex-1 break-words">{opt.label || String(opt.value)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (question.type === 'checkboxes') {
    const options = getOptions(question.props)
    return (
      <div className="space-y-2" aria-disabled>
        {options.length === 0 ? (
          <input type="text" value="" readOnly disabled placeholder="Ваш ответ" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 text-gray-600 cursor-default" />
        ) : (
          <div className="space-y-2">
            {options.map((opt) => (
              <div key={opt.value} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50 cursor-default">
                <input type="checkbox" checked={false} disabled className="w-4 h-4 text-gray-400 mt-0.5 shrink-0 rounded" />
                <span className="text-sm text-gray-800 min-w-0 flex-1 break-words">{opt.label || String(opt.value)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (question.type === 'dropdown') {
    const options = getOptions(question.props)
    return (
      <select disabled className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 text-gray-600 cursor-default">
        <option value="">Выберите вариант…</option>
        {options.map((opt) => (
          <option key={opt.value} value={String(opt.value)}>{opt.label || String(opt.value)}</option>
        ))}
      </select>
    )
  }

  if (question.type === 'stars') {
    const maxStars = Number(question.props?.maxStars ?? question.props?.max ?? 5)
    return (
      <div className="flex gap-1" aria-disabled>
        {Array.from({ length: maxStars }, (_, i) => i + 1).map((n) => (
          <StarIcon key={n} filled={false} className="w-8 h-8 text-gray-300" />
        ))}
      </div>
    )
  }

  if (question.type === 'date') {
    return (
      <input type="date" value="" readOnly disabled className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 text-gray-600 cursor-default" />
    )
  }

  return (
    <textarea
      value=""
      readOnly
      disabled
      rows={4}
      placeholder="Ваш развёрнутый ответ…"
      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 text-gray-600 cursor-default resize-none"
    />
  )
}
