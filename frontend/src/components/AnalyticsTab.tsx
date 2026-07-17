import { useCallback, useEffect, useMemo, useState } from 'react'
import Markdown from 'react-markdown'
import { aiSummaryApi } from '../api'
import type { AiSummary, ApiAnswer, ApiUser, Participant, Question, QuestionProps, SurveyReportInfo } from '../types'

interface AnalyticsTabProps {
  surveyId: number | null
  questions: Question[]
  answers: ApiAnswer[]
  targets: Participant[]
  respondents: Participant[]
  assignments: Record<string, Record<string, boolean>>
  completedAssignments: Record<string, Record<string, boolean>>
  reportInfo: SurveyReportInfo | null
  allUsers: ApiUser[]
}

function getNameMap(users: ApiUser[]): Record<number, string> {
  const map: Record<number, string> = {}
  for (const u of users) map[u.id] = u.name || u.email
  return map
}

function getRadioOptions(props?: QuestionProps): { value: string; label: string }[] {
  if (!props) return []
  return Object.entries(props)
    .filter(([k]) => !['min', 'max', 'step', 'maxStars', 'minSelect', 'maxSelect'].includes(k))
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([k, v]) => ({ value: k, label: String(v) }))
}

/* ─── Summary Cards ─── */

function Card({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="bg-white dark:bg-[#1e222e] border border-gray-200 dark:border-[#3a4250] rounded-xl p-4">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent ? 'text-[#FF8600]' : 'text-gray-900 dark:text-gray-100'}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

/* ─── Pie Chart (SVG) ─── */

const PIE_COLORS = ['#FF8600', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4']

function PieChart({ data }: { data: { label: string; count: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  if (total === 0) return <p className="text-xs text-gray-400 italic">Нет ответов</p>

  const size = 160
  const cx = size / 2
  const cy = size / 2
  const radius = 60

  let cumulative = 0
  const slices = data.map((d, i) => {
    const startAngle = (cumulative / total) * 2 * Math.PI - Math.PI / 2
    cumulative += d.count
    const endAngle = (cumulative / total) * 2 * Math.PI - Math.PI / 2
    const largeArc = d.count / total > 0.5 ? 1 : 0
    const x1 = cx + radius * Math.cos(startAngle)
    const y1 = cy + radius * Math.sin(startAngle)
    const x2 = cx + radius * Math.cos(endAngle)
    const y2 = cy + radius * Math.sin(endAngle)
    const path = `M${cx},${cy} L${x1},${y1} A${radius},${radius} 0 ${largeArc} 1 ${x2},${y2} Z`
    return { path, color: PIE_COLORS[i % PIE_COLORS.length], label: d.label, count: d.count, pct: Math.round((d.count / total) * 100) }
  })

  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} stroke="white" strokeWidth={1.5} />
        ))}
      </svg>
      <div className="space-y-1.5 min-w-0">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-gray-600 dark:text-gray-300 truncate min-w-0" title={s.label}>{s.label}</span>
            <span className="text-gray-400 tabular-nums shrink-0">{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Bar Chart (horizontal) ─── */

function BarChart({ data, multi }: { data: { label: string; count: number }[]; multi?: boolean }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1)
  const total = multi ? data.reduce((s, d) => s + d.count, 0) : 0

  if (data.every((d) => d.count === 0)) return <p className="text-xs text-gray-400 italic">Нет ответов</p>

  return (
    <div className="space-y-1.5">
      {data.map((d, i) => {
        const pct = multi ? (total > 0 ? Math.round((d.count / total) * 100) : 0) : Math.round((d.count / maxCount) * 100)
        return (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-gray-600 dark:text-gray-300 w-36 truncate shrink-0" title={d.label}>{d.label}</span>
            <div className="flex-1 h-5 bg-gray-100 dark:bg-[#303a48] rounded-sm overflow-hidden">
              <div
                className="h-full rounded-sm transition-all"
                style={{ width: `${multi ? pct : (d.count / maxCount) * 100}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
              />
            </div>
            <span className="text-[10px] text-gray-400 w-14 text-right tabular-nums shrink-0">
              {d.count} {multi ? `(${pct}%)` : ''}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/* ─── Scale Bar ─── */

function ScaleBars({ question, qAnswers }: { question: Question; qAnswers: ApiAnswer[] }) {
  const min = question.type === 'stars' ? 1 : Number(question.props?.min ?? 1)
  const max = Number(question.props?.max ?? question.props?.maxStars ?? 5)
  const range = max - min + 1
  const counts = Array.from({ length: range }, () => 0)
  for (const a of qAnswers) {
    const n = Number(a.text)
    if (n >= min && n <= max) counts[n - min]++
  }
  const avg = qAnswers.length > 0
    ? qAnswers.reduce((s, a) => s + (Number(a.text) || 0), 0) / qAnswers.length
    : 0
  const maxCount = Math.max(...counts, 1)

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <span className="text-sm font-bold text-[#FF8600]">{avg.toFixed(1)} <span className="text-xs font-normal text-gray-400">/ {max}</span></span>
        <span className="text-[10px] text-gray-400">{qAnswers.length} ответов</span>
      </div>
      {question.type === 'stars' ? (
        <div className="flex items-end gap-1.5">
          {counts.map((c, i) => (
            <div key={i} className="flex flex-col items-center flex-1 gap-1">
              <span className="text-[10px] text-gray-500 dark:text-gray-300 h-3">{c > 0 ? c : ''}</span>
              <div className="w-full relative h-20 bg-gray-100 dark:bg-[#303a48] rounded overflow-hidden">
                <div
                  className="absolute inset-x-0 bottom-0 rounded transition-all"
                  style={{ height: `${(c / maxCount) * 100}%`, backgroundColor: '#FF8600' }}
                />
              </div>
              <div className="flex">
                {Array.from({ length: min + i }, (_, s) => (
                  <svg key={s} className="w-3 h-3 text-[#FF8600]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                  </svg>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          {counts.map((c, i) => (
            <div key={i} className="flex flex-col items-center flex-1 gap-0.5">
              <span className="text-[10px] text-gray-500 dark:text-gray-300 h-3">{c > 0 ? c : ''}</span>
              <div className="w-full relative h-20 bg-gray-100 dark:bg-[#303a48] rounded-sm overflow-hidden">
                <div
                  className="absolute inset-x-0 bottom-0 bg-[#FF8600] rounded-sm transition-all"
                  style={{ height: `${(c / maxCount) * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-500 dark:text-gray-300">{min + i}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Text / Date responses ─── */

function TextResponses({ qAnswers, nameMap, isDate }: { qAnswers: ApiAnswer[]; nameMap: Record<number, string>; isDate?: boolean }) {
  if (qAnswers.length === 0) return <p className="text-xs text-gray-400 italic">Нет ответов</p>

  if (isDate) {
    const counts = new Map<string, number>()
    for (const a of qAnswers) {
      const d = a.text?.trim()
      if (d) counts.set(d, (counts.get(d) ?? 0) + 1)
    }
    const sorted = [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    const maxCount = Math.max(...sorted.map(([, c]) => c), 1)
    return (
      <div className="space-y-1.5">
        {sorted.map(([date, count]) => (
          <div key={date} className="flex items-center gap-2">
            <span className="text-xs text-gray-600 dark:text-gray-300 w-28 shrink-0 tabular-nums">{date}</span>
            <div className="flex-1 h-4 bg-gray-100 dark:bg-[#303a48] rounded-sm overflow-hidden">
              <div className="h-full bg-[#FF8600] rounded-sm transition-all" style={{ width: `${(count / maxCount) * 100}%` }} />
            </div>
            <span className="text-[10px] text-gray-400 w-8 text-right tabular-nums">{count}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
      {qAnswers.map((a) => (
        <div key={a.id} className="flex gap-2 text-xs bg-gray-50 dark:bg-[#161a22] rounded-lg px-3 py-2">
          <span className="font-medium text-gray-500 dark:text-gray-400 shrink-0">{nameMap[a.userId] ?? `#${a.userId}`}</span>
          <span className="text-gray-300">→</span>
          <span className="text-gray-500 dark:text-gray-400 shrink-0">{nameMap[a.targetId] ?? `#${a.targetId}`}</span>
          <span className="text-gray-700 dark:text-gray-200 min-w-0">: {a.text || '—'}</span>
        </div>
      ))}
    </div>
  )
}

/* ─── Dropdown (same as radio but with select-like display) ─── */

function DropdownDistribution({ qAnswers, options }: { qAnswers: ApiAnswer[]; options: { value: string; label: string }[] }) {
  const counts = options.map((opt) => ({
    label: opt.label,
    count: qAnswers.filter((a) => a.text === opt.value).length,
  }))
  return <BarChart data={counts} />
}

/* ─── Question Card ─── */

function QuestionCard({ index, question, qAnswers, nameMap }: { index: number; question: Question; qAnswers: ApiAnswer[]; nameMap: Record<number, string> }) {
  const typeLabels: Record<string, string> = {
    radio: 'Выбор из списка',
    checkboxes: 'Выбор нескольких',
    scale: 'Шкала',
    text: 'Текст',
    dropdown: 'Выпадающий список',
    date: 'Дата',
    stars: 'Звёзды',
  }

  const answerCount = qAnswers.length

  return (
    <div className="bg-white dark:bg-[#1e222e] border border-gray-200 dark:border-[#3a4250] rounded-xl px-5 py-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-bold text-gray-400">{index}.</span>
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{question.text}</h4>
            {question.isRequired && <span className="text-red-500 text-xs">*</span>}
          </div>
          <span className="text-[10px] text-gray-400 ml-4">{typeLabels[question.type] ?? question.type}</span>
        </div>
        <span className="text-[10px] text-gray-400 tabular-nums shrink-0">{answerCount} ответов</span>
      </div>

      {question.type === 'radio' || question.type === 'checkboxes' ? (
        <PieChart data={getRadioOptions(question.props).map((opt) => ({
          label: opt.label,
          count: question.type === 'checkboxes'
            ? qAnswers.filter((a) => a.text.split(',').map((s) => s.trim()).includes(opt.value)).length
            : qAnswers.filter((a) => a.text === opt.value).length,
        }))} />
      ) : question.type === 'dropdown' ? (
        <DropdownDistribution qAnswers={qAnswers} options={getRadioOptions(question.props)} />
      ) : question.type === 'scale' || question.type === 'stars' ? (
        <ScaleBars question={question} qAnswers={qAnswers} />
      ) : question.type === 'date' ? (
        <TextResponses qAnswers={qAnswers} nameMap={nameMap} isDate />
      ) : (
        <TextResponses qAnswers={qAnswers} nameMap={nameMap} />
      )}
    </div>
  )
}

/* ─── Main Component ─── */

export function AnalyticsTab({
  surveyId,
  questions,
  answers,
  targets,
  respondents,
  assignments,
  completedAssignments,
  reportInfo: _reportInfo,
  allUsers,
}: AnalyticsTabProps) {
  const nameMap = useMemo(() => getNameMap(allUsers), [allUsers])

  const [overallSummary, setOverallSummary] = useState<AiSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState('')

  const loadSummary = useCallback(async () => {
    if (surveyId == null) return
    try {
      const s = await aiSummaryApi.get(surveyId)
      setOverallSummary(s)
    } catch {
      setOverallSummary(null)
    }
  }, [surveyId])

  useEffect(() => { loadSummary() }, [loadSummary])

  const generateSummary = async () => {
    if (surveyId == null) return
    setSummaryLoading(true)
    setSummaryError('')
    try {
      const s = await aiSummaryApi.generate(surveyId)
      setOverallSummary(s)
    } catch {
      setSummaryError('Не удалось сгенерировать саммари. Проверьте настройки AI.')
    } finally {
      setSummaryLoading(false)
    }
  }

  const totalAssigned = Object.values(assignments).reduce(
    (sum, row) => sum + Object.values(row).filter(Boolean).length, 0,
  )
  const totalCompleted = Object.values(completedAssignments).reduce(
    (sum, row) => sum + Object.values(row).filter(Boolean).length, 0,
  )
  const completionPct = totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0

  const answersByQuestion = useMemo(() => {
    const map = new Map<number, ApiAnswer[]>()
    for (const a of answers) {
      const list = map.get(a.questionId) ?? []
      list.push(a)
      map.set(a.questionId, list)
    }
    return map
  }, [answers])

  if (questions.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        Нет вопросов для отображения аналитики.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Аналитика</h2>

      <div className="grid grid-cols-3 gap-3">
        <Card label="Прогресс" value={`${completionPct}%`} sub={`${totalCompleted} из ${totalAssigned}`} />
        <Card label="Оцениваемых" value={String(targets.length)} />
        <Card label="Респондентов" value={String(respondents.length)} />
      </div>

      <div className="bg-white dark:bg-[#1e222e] border border-gray-200 dark:border-[#3a4250] rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <svg className="w-4 h-4 text-[#FF8600]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            AI-саммари
          </h3>
          {surveyId != null && (
            <div className="flex items-center gap-2">
              {overallSummary && (
                <span className="text-[10px] text-gray-400">
                  {new Date(overallSummary.updatedAt).toLocaleString('ru-RU')}
                </span>
              )}
              <button
                type="button"
                onClick={generateSummary}
                disabled={summaryLoading}
                className="text-xs font-medium text-[#FF8600] hover:text-[#FF6B00] disabled:opacity-50 cursor-pointer"
              >
                {summaryLoading ? 'Генерация…' : overallSummary ? 'Обновить' : 'Сгенерировать'}
              </button>
            </div>
          )}
        </div>
        {summaryError && (
          <p className="text-xs text-red-500 mb-2">{summaryError}</p>
        )}
        {summaryLoading && !overallSummary && (
          <div className="flex items-center gap-2 py-6 text-gray-400 text-sm">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            AI анализирует результаты опроса…
          </div>
        )}
        {overallSummary && !summaryLoading && (
          <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 leading-relaxed text-sm">
            <Markdown>{overallSummary.content}</Markdown>
          </div>
        )}
        {!overallSummary && !summaryLoading && !summaryError && (
          <p className="text-sm text-gray-400 py-4">
            Нажмите «Сгенерировать», чтобы AI проанализировал результаты опроса.
          </p>
        )}
      </div>

      <div className="space-y-4">
        {questions.map((q, i) => (
          <QuestionCard
            key={q.id}
            index={i + 1}
            question={q}
            qAnswers={answersByQuestion.get(q.id) ?? []}
            nameMap={nameMap}
          />
        ))}
      </div>
    </div>
  )
}
