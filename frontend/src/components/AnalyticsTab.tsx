import { useMemo } from 'react'
import type { ApiAnswer, ApiUser, Participant, Question, QuestionProps, SurveyReportInfo } from '../types'

interface AnalyticsTabProps {
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

function getRadioOptions(props?: QuestionProps): string[] {
  if (!props) return []
  return Object.keys(props)
    .filter((k) => !['min', 'max', 'step'].includes(k))
    .sort((a, b) => Number(a) - Number(b))
    .map((k) => String(props[k]))
}

function ScaleRadarChart({ questions, answersByQuestion }: { questions: Question[]; answersByQuestion: Map<number, ApiAnswer[]> }) {
  const size = 220
  const cx = size / 2
  const cy = size / 2
  const radius = 80
  const n = questions.length
  if (n < 3) return null

  const avgs = questions.map((q) => {
    const qAnswers = answersByQuestion.get(q.id) ?? []
    if (qAnswers.length === 0) return 0
    const max = Number(q.props?.max ?? q.props?.maxStars ?? 5)
    const sum = qAnswers.reduce((s, a) => s + (Number(a.text) || 0), 0)
    return (sum / qAnswers.length) / max
  })

  const angleStep = (2 * Math.PI) / n
  const levels = 5

  const getPoint = (i: number, ratio: number) => {
    const angle = angleStep * i - Math.PI / 2
    return {
      x: cx + radius * ratio * Math.cos(angle),
      y: cy + radius * ratio * Math.sin(angle),
    }
  }

  const dataPoints = avgs.map((v, i) => getPoint(i, v))
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      {Array.from({ length: levels }, (_, l) => {
        const r = (radius / levels) * (l + 1)
        const pts = Array.from({ length: n }, (_, i) => {
          const angle = angleStep * i - Math.PI / 2
          return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`
        }).join(' ')
        return <polygon key={l} points={pts} fill="none" stroke="#e5e7eb" strokeWidth={1} />
      })}
      {Array.from({ length: n }, (_, i) => {
        const p = getPoint(i, 1)
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e5e7eb" strokeWidth={1} />
      })}
      <polygon points={dataPoints.map((p) => `${p.x},${p.y}`).join(' ')} fill="rgba(255,134,0,0.15)" stroke="#FF8600" strokeWidth={2} />
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill="#FF8600" />
      ))}
      {questions.map((q, i) => {
        const p = getPoint(i, 1.22)
        const textLen = q.text.length
        const anchor = p.x < cx - 10 ? 'end' : p.x > cx + 10 ? 'start' : 'middle'
        return (
          <text
            key={q.id}
            x={p.x}
            y={p.y}
            textAnchor={anchor}
            dominantBaseline="middle"
            className="fill-gray-500 dark:fill-gray-400"
            fontSize={textLen > 18 ? 8 : 10}
          >
            {q.text.length > 22 ? q.text.slice(0, 20) + '…' : q.text}
          </text>
        )
      })}
    </svg>
  )
}

function ScaleBar({ question, qAnswers }: { question: Question; qAnswers: ApiAnswer[] }) {
  const min = question.type === 'stars' ? 1 : Number(question.props?.min ?? 1)
  const max = Number(question.props?.max ?? question.props?.maxStars ?? (question.type === 'stars' ? 5 : 5))
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
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{question.text}</span>
        <span className="text-sm font-bold text-[#FF8600] dark:text-[#FFA64D]">{avg.toFixed(1)}</span>
      </div>
      <div className="flex items-center gap-1.5">
        {counts.map((c, i) => (
          <div key={i} className="flex flex-col items-center flex-1 gap-0.5">
            <span className="text-[10px] text-gray-500 dark:text-gray-300 h-3">{c > 0 ? c : ''}</span>
            <div className="w-full relative h-5 bg-gray-200 dark:bg-[#3a4250] rounded-sm overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-[#FF8600] dark:bg-[#FF8600] rounded-sm transition-all"
                style={{ width: `${(c / maxCount) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-500 dark:text-gray-300">{min + i}</span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 text-right">{qAnswers.length} ответов</p>
    </div>
  )
}

function RadioDistribution({ question, qAnswers }: { question: Question; qAnswers: ApiAnswer[] }) {
  const options = getRadioOptions(question.props)
  const isMulti = question.type === 'checkboxes'

  let total = 0
  const counts = options.map((_, i) => {
    const optVal = String(i + 1)
    let count = 0
    for (const a of qAnswers) {
      if (isMulti) {
        const selected = a.text.split(',').map((s) => s.trim())
        if (selected.includes(optVal)) count++
      } else {
        if (a.text === optVal) count++
      }
    }
    total += count
    return count
  })
  if (!isMulti) total = qAnswers.length || 1

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-sm font-medium text-gray-900">{question.text}</span>
        <span className="text-xs text-gray-400">{qAnswers.length} ответов</span>
      </div>
      <div className="space-y-1.5">
        {options.map((opt, i) => {
          const pct = Math.round((counts[i] / total) * 100)
          return (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-gray-600 dark:text-gray-300 w-32 truncate shrink-0" title={opt}>{opt}</span>
              <div className="flex-1 h-4 bg-gray-50 rounded-sm overflow-hidden">
                <div
                  className="h-full bg-[#FF8600]/70 rounded-sm transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 w-10 text-right tabular-nums">{pct}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TextResponses({ question, qAnswers, nameMap }: { question: Question; qAnswers: ApiAnswer[]; nameMap: Record<number, string> }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-sm font-medium text-gray-900">{question.text}</span>
        <span className="text-xs text-gray-400">{qAnswers.length} ответов</span>
      </div>
      <div className="space-y-1">
        {qAnswers.length === 0 && (
          <p className="text-xs text-gray-400 italic">Нет ответов</p>
        )}
        {qAnswers.map((a) => (
          <div key={a.id} className="flex gap-2 text-xs bg-gray-50 rounded-lg px-3 py-2">
            <span className="font-medium text-gray-500 shrink-0">{nameMap[a.userId] ?? `#${a.userId}`}</span>
            <span className="text-gray-300">→</span>
            <span className="text-gray-500 shrink-0">{nameMap[a.targetId] ?? `#${a.targetId}`}</span>
            <span className="text-gray-700 dark:text-gray-200">: {a.text || '—'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Card({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="bg-white dark:bg-[#1e222e] border border-gray-200 dark:border-[#3a4250] rounded-xl p-4">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent ? 'text-[#FF8600]' : 'text-gray-900 dark:text-gray-100'}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export function AnalyticsTab({
  questions,
  answers,
  targets,
  respondents,
  assignments,
  completedAssignments,
  reportInfo,
  allUsers,
}: AnalyticsTabProps) {
  const nameMap = useMemo(() => getNameMap(allUsers), [allUsers])

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

  const answersByTarget = useMemo(() => {
    const map = new Map<number, ApiAnswer[]>()
    for (const a of answers) {
      const list = map.get(a.targetId) ?? []
      list.push(a)
      map.set(a.targetId, list)
    }
    return map
  }, [answers])

  const scaleQuestions = useMemo(() => {
    const qs = questions.filter((q) => q.type === 'scale' || q.type === 'stars')
    const withAnswers = qs.filter((q) => (answersByQuestion.get(q.id) ?? []).length > 0)
    withAnswers.sort((a, b) => {
      const aAvg = avgScale(answersByQuestion.get(a.id) ?? [])
      const bAvg = avgScale(answersByQuestion.get(b.id) ?? [])
      return bAvg - aAvg
    })
    return withAnswers
  }, [questions, answersByQuestion])

  const radioQuestions = useMemo(() =>
    questions.filter((q) => (q.type === 'radio' || q.type === 'checkboxes' || q.type === 'dropdown') && (answersByQuestion.get(q.id) ?? []).length > 0),
    [questions, answersByQuestion],
  )

  const textQuestions = useMemo(() =>
    questions.filter((q) => q.type === 'text' || q.type === 'date'),
    [questions],
  )

  if (questions.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        Нет вопросов для отображения аналитики.
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Аналитика</h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card label="Прогресс" value={`${completionPct}%`} sub={`${totalCompleted} из ${totalAssigned}`} />
        <Card label="Ответов" value={String(reportInfo?.answerCount ?? answers.length)} />
        <Card label="Оцениваемых" value={String(targets.length)} />
        <Card label="Респондентов" value={String(respondents.length)} />
      </div>

      {scaleQuestions.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-5 bg-[#FF8600] rounded-full" />
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">Шкала оценок</h3>
            <span className="text-xs text-gray-400">{scaleQuestions.length} вопросов</span>
          </div>

          {scaleQuestions.length >= 3 && (
      <div className="bg-white dark:bg-[#1e222e] border border-gray-200 dark:border-[#3a4250] rounded-xl p-6 mb-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 text-center">Обзор по шкале</p>
              <ScaleRadarChart questions={scaleQuestions} answersByQuestion={answersByQuestion} />
            </div>
          )}

          <div className="space-y-3">
            {scaleQuestions.map((q) => (
              <div key={q.id} className="bg-gray-50 dark:bg-[#161a22] border border-gray-200 dark:border-[#3a4250] rounded-xl px-5 py-4">
                <ScaleBar question={q} qAnswers={answersByQuestion.get(q.id) ?? []} />
              </div>
            ))}
          </div>
        </section>
      )}

      {radioQuestions.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-5 bg-blue-500 rounded-full" />
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">Варианты ответа</h3>
            <span className="text-xs text-gray-400">{radioQuestions.length} вопросов</span>
          </div>
          <div className="space-y-3">
            {radioQuestions.map((q) => (
              <div key={q.id} className="bg-white dark:bg-[#1e222e] border border-gray-200 dark:border-[#3a4250] rounded-xl px-5 py-4">
                <RadioDistribution question={q} qAnswers={answersByQuestion.get(q.id) ?? []} />
              </div>
            ))}
          </div>
        </section>
      )}

      {textQuestions.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-5 bg-gray-400 rounded-full" />
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">Текстовые ответы</h3>
            <span className="text-xs text-gray-400">{textQuestions.length} вопросов</span>
          </div>
          <div className="space-y-3">
            {textQuestions.map((q) => (
              <div key={q.id} className="bg-white dark:bg-[#1e222e] border border-gray-200 dark:border-[#3a4250] rounded-xl px-5 py-4">
                <TextResponses question={q} qAnswers={answersByQuestion.get(q.id) ?? []} nameMap={nameMap} />
              </div>
            ))}
          </div>
        </section>
      )}

      {targets.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-5 bg-emerald-500 rounded-full" />
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">По оцениваемым</h3>
          </div>
          <div className="bg-white dark:bg-[#1e222e] border border-gray-200 dark:border-[#3a4250] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 dark:bg-[#161a22] border-b border-gray-200 dark:border-[#3a4250]">
                  <th className="text-left px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Имя</th>
                  <th className="text-center px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Отзывов</th>
                  <th className="text-center px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Средний балл</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider w-40">Прогресс</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-[#3a4250]">
                {targets.map((t) => {
                  const targetAnswers = answersByTarget.get(t.id) ?? []
                  const expected = Object.values(assignments).reduce(
                    (sum, row) => sum + (row[String(t.id)] ? 1 : 0), 0,
                  )
                  const completed = Object.values(completedAssignments).reduce(
                    (sum, row) => sum + (row[String(t.id)] ? 1 : 0), 0,
                  )
                  const ratingAns = targetAnswers.filter((a) => scaleQuestions.some((q) => q.id === a.questionId))
                  const avg = ratingAns.length > 0
                    ? (ratingAns.reduce((s, a) => s + (Number(a.text) || 0), 0) / ratingAns.length).toFixed(1)
                    : '—'

                  return (
                    <tr key={t.id} className="hover:bg-gray-50/50">
                   <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100">{nameMap[t.id] ?? `#${t.id}`}</td>
                  <td className="px-4 py-2.5 text-center text-gray-600 dark:text-gray-300">{targetAnswers.length}</td>
                  <td className="px-4 py-2.5 text-center font-semibold text-gray-900 dark:text-gray-100">{avg}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all"
                              style={{ width: `${expected > 0 ? (completed / expected) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-400 w-10 text-right tabular-nums">{completed}/{expected}</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

function avgScale(qAnswers: ApiAnswer[]): number {
  if (qAnswers.length === 0) return 0
  return qAnswers.reduce((s, a) => s + (Number(a.text) || 0), 0) / qAnswers.length
}
