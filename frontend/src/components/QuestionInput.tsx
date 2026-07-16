import { useState } from 'react'
import type { Question } from '../types'

function getRadioOptions(props?: Record<string, string | number>): { value: number; label: string }[] {
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
                ? 'border-[#FF8600] bg-orange-50 text-[#FF6B00]'
                : readOnly
                  ? 'border-gray-200 text-gray-400 bg-gray-50'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    )
  }

  if (question.type === 'radio' || question.type === 'dropdown') {
    const options = getRadioOptions(question.props)
    if (question.type === 'dropdown') {
      const selectedVal = value || ''
      return (
        <select
          value={selectedVal}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
          className={`w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#FF8600] ${
            readOnly ? 'bg-gray-50 text-gray-600 cursor-default' : 'bg-white'
          }`}
        >
          <option value="">Выберите вариант…</option>
          {options.map((opt) => (
            <option key={opt.value} value={String(opt.value)}>
              {opt.label || String(opt.value)}
            </option>
          ))}
        </select>
      )
    }
    if (options.length === 0) {
      return (
        <input
          type="text"
          value={value}
          readOnly={readOnly}
          disabled={readOnly}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ваш ответ"
          className={`w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#FF8600] ${
            readOnly ? 'bg-gray-50 text-gray-600 cursor-default' : ''
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
              value === String(opt.value) ? 'border-[#FF8600] bg-orange-50' : 'border-gray-100 hover:bg-gray-50'
            } ${readOnly ? 'opacity-80' : ''}`}
          >
            <input
              type="radio"
              name={`q-${question.id}`}
              checked={value === String(opt.value)}
              disabled={readOnly}
              onChange={() => onChange(String(opt.value))}
              className="w-4 h-4 text-[#FF8600] mt-0.5 shrink-0"
            />
            <span className="text-sm text-gray-800 min-w-0 flex-1 break-words">
              {opt.label || String(opt.value)}
            </span>
          </label>
        ))}
      </div>
    )
  }

  if (question.type === 'checkboxes') {
    const options = getRadioOptions(question.props)
    const selected = value ? value.split(',').filter(Boolean) : []
    const minSel = Number(question.props?.minSelect ?? 0)
    const maxSel = Number(question.props?.maxSelect ?? 0)
    const atMax = maxSel > 0 && selected.length >= maxSel
    const toggle = (val: string) => {
      if (readOnly) return
      if (selected.includes(val)) {
        onChange(selected.filter((v) => v !== val).join(','))
      } else {
        if (atMax) return
        onChange([...selected, val].join(','))
      }
    }
    if (options.length === 0) {
      return (
        <input
          type="text"
          value={value}
          readOnly={readOnly}
          disabled={readOnly}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ваш ответ"
          className={`w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#FF8600] ${
            readOnly ? 'bg-gray-50 text-gray-600 cursor-default' : ''
          }`}
        />
      )
    }
    return (
      <div>
        <div className="space-y-2">
          {options.map((opt) => {
            const checked = selected.includes(String(opt.value))
            return (
              <label
                key={opt.value}
                className={`soft-lift flex items-start gap-3 p-3 rounded-xl border ${
                  readOnly ? 'cursor-default' : 'cursor-pointer'
                } ${
                  checked ? 'border-[#FF8600] bg-orange-50' : atMax && !checked ? 'border-gray-100 opacity-50' : 'border-gray-100 hover:bg-gray-50'
                } ${readOnly ? 'opacity-80' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={readOnly || (atMax && !checked)}
                  onChange={() => toggle(String(opt.value))}
                  className="w-4 h-4 text-[#FF8600] mt-0.5 shrink-0 rounded"
                />
                <span className="text-sm text-gray-800 min-w-0 flex-1 break-words">
                  {opt.label || String(opt.value)}
                </span>
              </label>
            )
          })}
        </div>
        {(minSel > 0 || maxSel > 0) && (
          <p className="text-[10px] text-gray-400 mt-1.5">
            {minSel > 0 && maxSel > 0
              ? `Выберите от ${minSel} до ${maxSel} вариантов`
              : minSel > 0
                ? `Выберите минимум ${minSel} вариантов`
                : `Можно выбрать не более ${maxSel}`}
            {` · выбрано ${selected.length}`}
          </p>
        )}
      </div>
    )
  }

  if (question.type === 'stars') {
    const maxStars = Number(question.props?.maxStars ?? question.props?.max ?? 5)
    const selected = value ? Number(value) : 0
    const [hovered, setHovered] = useState(0)
    return (
      <div
        className="flex gap-1"
        onMouseLeave={() => setHovered(0)}
      >
        {Array.from({ length: maxStars }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            disabled={readOnly}
            onClick={() => onChange(String(n))}
            onMouseEnter={() => !readOnly && setHovered(n)}
            className={`transition ${
              readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
            }`}
          >
            <StarIcon
              filled={n <= (hovered || selected)}
              className={`w-8 h-8 ${
                n <= (hovered || selected) ? 'text-[#FF8600]' : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    )
  }

  if (question.type === 'date') {
    return (
      <input
        type="date"
        value={value}
        readOnly={readOnly}
        disabled={readOnly}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#FF8600] ${
          readOnly ? 'bg-gray-50 text-gray-600 cursor-default' : ''
        }`}
      />
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
      className={`w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#FF8600] resize-none ${
        readOnly ? 'bg-gray-50 text-gray-600 cursor-default' : ''
      }`}
    />
  )
}
