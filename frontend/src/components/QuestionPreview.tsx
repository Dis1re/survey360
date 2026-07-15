import type { Question } from '../types'

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
            className={`flex-1 min-w-[44px] py-3 rounded-xl border text-sm font-semibold transition cursor-default border-gray-200 dark:border-[#3a4250] bg-gray-50 dark:bg-[#161a22] text-gray-600 dark:text-gray-200`}
          >
            {n}
          </button>
        ))}
      </div>
    )
  }

  if (question.type === 'radio') {
    const options = question.options ?? []
    return (
      <div className="space-y-2" aria-disabled>
        {options.length === 0 ? (
          <input
            type="text"
            value=""
            readOnly
            disabled
            placeholder="Ваш ответ"
            className="w-full border border-gray-200 dark:border-[#3a4250] rounded-xl px-4 py-2.5 text-sm bg-gray-50 dark:bg-[#161a22] text-gray-600 dark:text-gray-200 cursor-default"
          />
        ) : (
          <div className="space-y-2">
            {options.map((opt) => (
              <div
                key={opt.value}
                className={`flex items-start gap-3 p-3 rounded-xl border border-gray-100 dark:border-[#303a48] bg-gray-50 dark:bg-[#161a22] cursor-default`}
              >
                <input type="radio" name={`preview-q-${question.id}`} checked={false} disabled className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <span className="text-sm text-gray-800 dark:text-gray-200 min-w-0 flex-1 break-words">{opt.label || String(opt.value)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <textarea
      value=""
      readOnly
      disabled
      rows={4}
      placeholder="Ваш развёрнутый ответ…"
      className="w-full border border-gray-200 dark:border-[#3a4250] rounded-xl px-4 py-2.5 text-sm bg-gray-50 dark:bg-[#161a22] text-gray-600 dark:text-gray-200 cursor-default resize-none"
    />
  )
}
