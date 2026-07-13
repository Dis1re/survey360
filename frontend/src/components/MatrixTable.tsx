import { useEffect, useState } from 'react'
import { buildInviteMailto, buildRespondentInviteLink, buildSurveyResponseLink } from '../routing'
import type { ApiUser, Participant, RespondentLink } from '../types'

interface MatrixTableProps {
  surveyId: number
  targets: Participant[]
  respondents: Participant[]
  allUsers: ApiUser[]
  initialAssignments?: Record<string, Record<string, boolean>>
  completedAssignments?: Record<string, Record<string, boolean>>
  saving?: boolean
  adding?: boolean
  exporting?: boolean
  readOnly?: boolean
  surveyActive?: boolean
  surveyName?: string
  respondentLinks?: RespondentLink[]
  onExportReport?: () => void | Promise<void>
  onAddParticipant: (userId: number, role: 'target' | 'respondent') => Promise<void>
  onRemoveParticipant: (userId: number, role: 'target' | 'respondent') => Promise<void>
  onSave: (assignments: Record<string, Record<string, boolean>>) => Promise<void>
}

export function matrixToEntries(
  assignments: Record<string, Record<string, boolean>>,
  respondents: Participant[],
  targets: Participant[],
) {
  const entries: { reviewerId: number; targetId: number; isAssigned: boolean }[] = []
  for (const respondent of respondents) {
    for (const target of targets) {
      entries.push({
        reviewerId: respondent.id,
        targetId: target.id,
        isAssigned: assignments[String(respondent.id)]?.[String(target.id)] ?? false,
      })
    }
  }
  return entries
}

export function MatrixTable({
  surveyId,
  targets,
  respondents,
  allUsers,
  initialAssignments = {},
  completedAssignments = {},
  saving = false,
  adding = false,
  exporting = false,
  readOnly = false,
  surveyActive = false,
  surveyName = '',
  respondentLinks = [],
  onExportReport,
  onAddParticipant,
  onRemoveParticipant,
  onSave,
}: MatrixTableProps) {
  const [assignments, setAssignments] =
    useState<Record<string, Record<string, boolean>>>(initialAssignments)
  const [pickerRole, setPickerRole] = useState<'target' | 'respondent' | null>(null)
  const [search, setSearch] = useState('')
  const [copiedReviewerId, setCopiedReviewerId] = useState<number | null>(null)

  const linkByReviewerId = Object.fromEntries(
    respondentLinks.map((l) => [l.reviewerId, l]),
  ) as Record<number, RespondentLink>

  const handleCopyInviteLink = async (reviewerId: number, token: string) => {
    try {
      await navigator.clipboard.writeText(buildRespondentInviteLink(token))
      setCopiedReviewerId(reviewerId)
      window.setTimeout(() => setCopiedReviewerId(null), 2000)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    setAssignments(initialAssignments)
  }, [initialAssignments])

  const toggle = (respondentId: string, targetId: string) => {
    if (readOnly) return
    setAssignments((prev) => ({
      ...prev,
      [respondentId]: {
        ...prev[respondentId],
        [targetId]: !(prev[respondentId]?.[targetId] ?? false),
      },
    }))
  }

  const isChecked = (respondentId: string, targetId: string) =>
    assignments[respondentId]?.[targetId] ?? false

  const isCompleted = (respondentId: string, targetId: string) =>
    completedAssignments[respondentId]?.[targetId] ?? false

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave(assignments)
  }

  const availableUsers = pickerRole
    ? allUsers.filter((user) => {
        const ids = pickerRole === 'target' ? targets.map((t) => t.id) : respondents.map((r) => r.id)
        return !ids.includes(user.id)
      })
    : []

  const filteredUsers = availableUsers.filter((user) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      user.name.toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q)
    )
  })

  return (
    <>
      <form onSubmit={handleSubmit}>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Кросс-таблица респондентов
            </span>
            <div className="flex flex-wrap gap-2">
              {!readOnly && (
                <>
                  <button
                    type="button"
                    onClick={() => setPickerRole('target')}
                    disabled={adding || allUsers.length === 0}
                    className="px-3 py-1.5 text-xs font-medium text-[#FF8600] bg-orange-50 border border-orange-200 hover:bg-orange-100 disabled:opacity-50 rounded-lg transition cursor-pointer"
                  >
                    + Объект (столбец)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPickerRole('respondent')}
                    disabled={adding || allUsers.length === 0}
                    className="px-3 py-1.5 text-xs font-medium text-[#FF8600] bg-orange-50 border border-orange-200 hover:bg-orange-100 disabled:opacity-50 rounded-lg transition cursor-pointer"
                  >
                    + Респондент (строка)
                  </button>
                </>
              )}
            </div>
          </div>

          {allUsers.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              Сначала добавьте пользователей через кнопку «Добавить пользователя» в шапке опроса
            </div>
          ) : targets.length === 0 && respondents.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              Добавьте объекты (столбцы) и респондентов (строки), затем отметьте галочками связи
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/50">
                    <th className="p-4 text-xs font-bold text-gray-400 w-64 border-r border-gray-100">
                      Респондент \ Объект
                    </th>
                     {targets.map((target) => (
                       <th key={target.id} className="p-4 text-xs font-semibold text-gray-700 text-center min-w-[120px]">
                         <div className="flex flex-col items-center gap-1">
                           <div className="relative inline-flex">
                             <div className={`w-7 h-7 rounded-full ${target.color} flex items-center justify-center text-xs font-bold`}>
                               {target.initial}
                             </div>
                             <button
                               type="button"
                               onClick={() => onRemoveParticipant(target.id, 'target')}
                               className="absolute -top-1.5 -right-1.5 w-4 h-4 flex items-center justify-center rounded-full bg-white text-red-500 border border-red-200 hover:bg-red-50 transition cursor-pointer"
                               title="Удалить объект"
                             >
                               ✕
                             </button>
                           </div>
                           <span>{target.name}</span>
                         </div>
                       </th>
                     ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {respondents.map((respondent) => {
                    const invite = linkByReviewerId[respondent.id]
                    const inviteLink = invite ? buildRespondentInviteLink(invite.token) : null

                    return (
                    <tr key={respondent.id} className="hover:bg-blue-50/30 transition">
                      <td className="p-4 font-medium text-gray-900 border-r border-gray-100">
                        <div className="flex items-center gap-2">
                          <div className="relative inline-flex">
                            <div className={`w-6 h-6 rounded-full ${respondent.color} flex items-center justify-center text-xs font-bold shrink-0`}>
                              {respondent.initial}
                            </div>
                            <button
                              type="button"
                              onClick={() => onRemoveParticipant(respondent.id, 'respondent')}
                              className="absolute -top-1.5 -right-1.5 w-4 h-4 flex items-center justify-center rounded-full bg-white text-red-500 border border-red-200 hover:bg-red-50 transition cursor-pointer"
                              title="Удалить респондента"
                            >
                              ✕
                            </button>
                          </div>
                          <div className="min-w-0">
                            <div>{respondent.name}</div>
                            {surveyActive && inviteLink && (
                              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleCopyInviteLink(respondent.id, invite.token)}
                                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[#FF8600] hover:text-[#FF6B00] cursor-pointer"
                                  title="Скопировать персональную ссылку"
                                >
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                  </svg>
                                  {copiedReviewerId === respondent.id ? 'Скопировано' : 'Ссылка'}
                                </button>
                                {invite.reviewerEmail && (
                                  <a
                                    href={buildInviteMailto(invite.reviewerEmail, surveyName, inviteLink)}
                                    className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-gray-700"
                                    title="Отправить приглашение по email"
                                  >
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    Email
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      {targets.map((target) => {
                        const reviewerKey = String(respondent.id)
                        const targetKey = String(target.id)
                        const assigned = isChecked(reviewerKey, targetKey)
                        const completed = assigned && isCompleted(reviewerKey, targetKey)
                        const responseLink = completed
                          ? buildSurveyResponseLink(surveyId, respondent.id, target.id)
                          : null

                        return (
                          <td key={target.id} className="p-4 text-center">
                            <div className="flex flex-col items-center gap-1.5">
                              <input
                                type="checkbox"
                                checked={assigned}
                                onChange={() => toggle(reviewerKey, targetKey)}
                                disabled={readOnly || respondent.id === target.id}
                                className="w-4 h-4 border-gray-300 rounded focus:ring-[#FF8600] cursor-pointer disabled:opacity-30 disabled:cursor-default"
                              />
                              {responseLink && (
                                <a
                                  href={responseLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[#FF8600] hover:text-[#FF6B00] hover:underline"
                                  title="Просмотреть ответы"
                                >
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  Ответы
                                </a>
                              )}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-3 mt-4">
          {onExportReport && (
            <button
              type="button"
              onClick={() => onExportReport()}
              disabled={exporting}
              className="px-5 py-2 text-sm font-medium text-[#FF8600] bg-white border border-[#FF8600]/40 hover:bg-orange-50 disabled:opacity-50 rounded-xl transition cursor-pointer"
            >
              {exporting ? 'Формирование…' : 'Сформировать результаты (.docx)'}
            </button>
          )}
          {(targets.length > 0 || respondents.length > 0) && !readOnly && (
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-medium text-white bg-[#FF8600] hover:bg-[#FF6B00] disabled:opacity-50 rounded-xl transition shadow-sm cursor-pointer"
            >
              {saving ? 'Сохранение…' : 'Сохранить матрицу'}
            </button>
          )}
        </div>
      </form>

      {pickerRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => !adding && setPickerRole(null)}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-bold text-gray-900 mb-4">
              {pickerRole === 'target' ? 'Добавить объект оценки' : 'Добавить респондента'}
            </h2>
            {availableUsers.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">Все пользователи уже добавлены</p>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Поиск по имени или email…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#FF8600] shadow-sm mb-3"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
                {filteredUsers.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4">Ничего не найдено</p>
                ) : (
                  <div className="overflow-y-auto space-y-1">
                    {filteredUsers.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        disabled={adding}
                        onClick={() => onAddParticipant(user.id, pickerRole).then(() => { setPickerRole(null); setSearch('') }).catch(console.error)}
                        className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-gray-50 border border-orange-200 hover:border-orange-300 transition disabled:opacity-50 cursor-pointer"
                      >
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-xs text-gray-400">{user.email}</div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
            <button type="button" onClick={() => setPickerRole(null)} disabled={adding} className="mt-4 text-sm text-gray-500 hover:text-gray-700 cursor-pointer">
              Отмена
            </button>
          </div>
        </div>
      )}
    </>
  )
}
