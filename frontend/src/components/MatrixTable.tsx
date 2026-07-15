import { useEffect, useRef, useState } from 'react'
import { buildRespondentInviteLink } from '../routing'
import type { ApiUser, Participant, RespondentLink } from '../types'
import { Modal } from './Modal'

interface MatrixTableProps {
  targets: Participant[]
  respondents: Participant[]
  allUsers: ApiUser[]
  initialAssignments?: Record<string, Record<string, boolean>>
  completedAssignments?: Record<string, Record<string, boolean>>
  saving?: boolean
  adding?: boolean
  exporting?: boolean
  exportingCsv?: boolean
  canExport?: boolean
  sendingInvites?: boolean
  readOnly?: boolean
  surveyActive?: boolean
  surveyName?: string
  respondentLinks?: RespondentLink[]
  onExportReport?: () => void | Promise<void>
  onExportCsv?: () => void | Promise<void>
  onSendInvites?: (reviewerId?: number) => void | Promise<void>
  onAddParticipant: (userIds: number[], role: 'target' | 'respondent') => Promise<void>
  onRemoveParticipant: (userId: number, role: 'target' | 'respondent') => Promise<void>
  onSave: (assignments: Record<string, Record<string, boolean>>) => Promise<void>
  onViewResponse?: (info: {
    reviewerId: number
    targetId: number
    reviewerName: string
    targetName: string
  }) => void
  onExpand?: () => void
  expanded?: boolean
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
  targets,
  respondents,
  allUsers,
  initialAssignments = {},
  completedAssignments = {},
  saving = false,
  adding = false,
  exporting = false,
  sendingInvites = false,
  readOnly = false,
  surveyActive = false,
  surveyName: _surveyName = '',
  respondentLinks = [],
  onExportReport,
  onSendInvites,
  onAddParticipant,
  onRemoveParticipant,
  onSave,
  onViewResponse,
  onExpand,
  onExportCsv,
  exportingCsv = false,
  canExport = false,
  expanded = false,
}: MatrixTableProps) {
  const [assignments, setAssignments] =
    useState<Record<string, Record<string, boolean>>>(initialAssignments)
  const [pickerRole, setPickerRole] = useState<'target' | 'respondent' | null>(null)
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([])
  const [search, setSearch] = useState('')
  const [copiedReviewerId, setCopiedReviewerId] = useState<number | null>(null)
  const [sendingReviewerId, setSendingReviewerId] = useState<number | null>(null)

  const dirtyRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onSaveRef = useRef(onSave)
  const assignmentsRef = useRef(assignments)
  assignmentsRef.current = assignments
  useEffect(() => {
    onSaveRef.current = onSave
  }, [onSave])

  const linkByReviewerId = Object.fromEntries(
    respondentLinks.map((l) => [l.reviewerId, l]),
  ) as Record<number, RespondentLink>

  const hasInviteEmails = respondentLinks.some((l) => l.reviewerEmail?.trim())

  const handleCopyInviteLink = async (reviewerId: number, token: string) => {
    try {
      await navigator.clipboard.writeText(buildRespondentInviteLink(token))
      setCopiedReviewerId(reviewerId)
      window.setTimeout(() => setCopiedReviewerId(null), 2000)
    } catch (err) {
      console.error(err)
    }
  }

  const handleSendInvite = async (reviewerId?: number) => {
    if (!onSendInvites) return
    setSendingReviewerId(reviewerId ?? -1)
    try {
      await onSendInvites(reviewerId)
    } finally {
      setSendingReviewerId(null)
    }
  }

  useEffect(() => {
    setAssignments(initialAssignments)
    dirtyRef.current = false
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
    dirtyRef.current = true
  }

  const isChecked = (respondentId: string, targetId: string) =>
    assignments[respondentId]?.[targetId] ?? false

  const isCompleted = (respondentId: string, targetId: string) =>
    completedAssignments[respondentId]?.[targetId] ?? false

  const selectAll = () => {
    if (readOnly || respondents.length === 0 || targets.length === 0) return
    const allChecked = respondents.every(
      (respondent) =>
        respondent.id !== undefined &&
        targets.every(
          (target) =>
            (assignments[String(respondent.id)]?.[String(target.id)] ?? false),
        ),
    )
    const value = !allChecked
    setAssignments((prev) => {
      const next: Record<string, Record<string, boolean>> = { ...prev }
      for (const respondent of respondents) {
        const rKey = String(respondent.id)
        next[rKey] = { ...next[rKey] }
        for (const target of targets) {
          next[rKey][String(target.id)] = value
        }
      }
      return next
    })
    dirtyRef.current = true
  }

  const selectColumn = (targetId: number) => {
    if (readOnly || respondents.length === 0) return
    const tKey = String(targetId)
    const allChecked = respondents.every(
      (respondent) =>
        respondent.id === targetId ||
        (assignments[String(respondent.id)]?.[tKey] ?? false),
    )
    const value = !allChecked
    setAssignments((prev) => {
      const next: Record<string, Record<string, boolean>> = { ...prev }
      for (const respondent of respondents) {
        if (respondent.id === targetId) continue
        const rKey = String(respondent.id)
        next[rKey] = { ...next[rKey], [tKey]: value }
      }
      return next
    })
    dirtyRef.current = true
  }

  const selectRow = (respondentId: number) => {
    if (readOnly || targets.length === 0) return
    const rKey = String(respondentId)
    const allChecked = targets.every(
      (target) =>
        respondentId === target.id ||
        (assignments[rKey]?.[String(target.id)] ?? false),
    )
    const value = !allChecked
    setAssignments((prev) => {
      const next: Record<string, Record<string, boolean>> = { ...prev }
      next[rKey] = { ...next[rKey] }
      for (const target of targets) {
        if (respondentId === target.id) continue
        next[rKey][String(target.id)] = value
      }
      return next
    })
    dirtyRef.current = true
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
  }

  useEffect(() => {
    if (readOnly || !dirtyRef.current) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      dirtyRef.current = false
      onSaveRef.current(assignmentsRef.current).catch(() => {
        dirtyRef.current = true
      })
    }, 500)
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [assignments, readOnly])

  useEffect(() => {
    return () => {
      if (dirtyRef.current && !readOnly) {
        dirtyRef.current = false
        onSaveRef.current(assignmentsRef.current).catch(() => {
          dirtyRef.current = true
        })
      }
    }
  }, [readOnly])

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

  const allSelectedActive =
    respondents.length > 0 &&
    targets.length > 0 &&
    respondents.every((r) =>
      targets.every((t) => r.id === t.id || (assignments[String(r.id)]?.[String(t.id)] ?? false)),
    )

  return (
    <>
      <form onSubmit={handleSubmit} className="h-full flex flex-col">
        <div className="bg-white dark:bg-[#1e222e] border border-gray-200 dark:border-[#3a4250] rounded-2xl shadow-sm flex-1 min-h-0 flex flex-col">
          <div className="p-4 border-b border-gray-100 dark:border-[#303a48] bg-gray-50/50 dark:bg-[#161a22]/50 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">
                Матрица оценки
              </span>
              {!readOnly && (
                <button
                  type="button"
                  onClick={selectAll}
                  disabled={adding || respondents.length === 0 || targets.length === 0}
                  className={`px-3 py-1.5 text-xs font-medium border rounded-lg transition cursor-pointer disabled:opacity-50 ${
                    allSelectedActive
                      ? 'bg-orange-100 dark:bg-[#FF8600]/18 text-[#FF6B00] border-orange-300 dark:border-[#FF8600]/45'
                      : 'text-gray-700 dark:text-gray-200 bg-white dark:bg-[#1e222e] border-gray-200 dark:border-[#3a4250] hover:border-[#FF8600] hover:bg-orange-50 dark:hover:bg-[#FF8600]/12'
                  }`}
                >
                  {allSelectedActive ? 'Снять всех' : 'Выбрать всех'}
                </button>
              )}
              {onExpand && (
                <button
                  type="button"
                  onClick={onExpand}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-[#1e222e] border border-gray-200 dark:border-[#3a4250] hover:border-[#FF8600] hover:text-[#FF8600] hover:bg-orange-50 dark:hover:bg-[#FF8600]/12 rounded-lg transition cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 9V5a1 1 0 011-1h4M20 9V5a1 1 0 00-1-1h-4M4 15v4a1 1 0 001 1h4M20 15v4a1 1 0 01-1 1h-4" />
                  </svg>
                  На весь экран
                </button>
              )}
            </div>
            {surveyActive && onSendInvites && respondentLinks.length > 0 && (
              <button
                type="button"
                onClick={() => handleSendInvite()}
                disabled={sendingInvites || !hasInviteEmails}
                className="px-3 py-1.5 text-xs font-medium text-white bg-[#FF8600] hover:bg-[#FF6B00] disabled:opacity-50 rounded-lg transition cursor-pointer"
                title={!hasInviteEmails ? 'У респондентов нет email' : 'Отправить приглашения всем респондентам'}
              >
                {sendingInvites && sendingReviewerId === -1 ? 'Отправка…' : 'Разослать всем'}
              </button>
            )}
          </div>

          {allUsers.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-300">
              Сначала добавьте пользователей через кнопку «Добавить пользователя» в шапке опроса
            </div>
          ) : (
            <div className={`overflow-x-auto flex-1 min-h-0 ${expanded ? 'overflow-y-visible' : 'overflow-y-auto'}`}>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-[#3a4250] bg-gray-50/50 dark:bg-[#161a22]/50">
                      <th className="p-4 text-xs font-bold text-gray-400 dark:text-gray-400 min-w-[120px] border-r border-b border-gray-200 dark:border-[#3a4250] sticky left-0 top-0 z-10 bg-gray-50 dark:bg-[#161a22] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                        <span>Респондент \ Объект</span>
                      </th>
                    {targets.map((target) => (
                      <th key={target.id} className="p-4 text-xs font-semibold text-gray-700 dark:text-gray-200 text-center min-w-[120px] sticky top-0 z-10 bg-gray-50 dark:bg-[#161a22] border-b border-r border-gray-200 dark:border-[#3a4250] shadow-[0_2px_4px_-2px_rgba(0,0,0,0.08)]">
                        <div className="flex flex-col items-center gap-1">
                          <div className="relative inline-flex">
                            <div className={`w-7 h-7 rounded-full ${target.color} flex items-center justify-center text-xs font-bold`}>
                              {target.initial}
                            </div>
                            {!readOnly && (
                              <button
                                type="button"
                                onClick={() => onRemoveParticipant(target.id, 'target')}
                                className="absolute -top-1.5 -right-1.5 w-4 h-4 flex items-center justify-center rounded-full bg-white dark:bg-[#1e222e] text-red-500 border border-red-200 dark:border-red-500/40 hover:bg-red-50 dark:hover:bg-red-500/10 transition cursor-pointer"
                                title="Удалить объект"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                          <span>{target.name}</span>
                          {!readOnly && (
                            (() => {
                              const colActive = respondents.length > 0 && respondents.every(
                                (r) => r.id === target.id || (assignments[String(r.id)]?.[String(target.id)] ?? false),
                              )
                              return (
                            <button
                              type="button"
                              onClick={() => selectColumn(target.id)}
                              disabled={respondents.length === 0}
                              className={`mt-1 text-[10px] font-medium border rounded px-2 py-0.5 transition cursor-pointer disabled:opacity-40 disabled:cursor-default whitespace-nowrap ${
                                colActive
                                  ? 'bg-orange-100 dark:bg-[#FF8600]/18 text-[#FF6B00] border-orange-300 dark:border-[#FF8600]/45'
                                  : 'text-[#FF8600] hover:text-[#FF6B00] border-orange-200 dark:border-[#FF8600]/40 hover:bg-orange-50 dark:hover:bg-[#FF8600]/12'
                              }`}
                              title={colActive ? 'Снять выбор столбца' : 'Выбрать весь столбец'}
                            >
                              {colActive ? 'снять столбец' : 'весь столбец'}
                            </button>
                              )
                            })()
                          )}
                        </div>
                      </th>
                    ))}
                    {!readOnly && (
                      <th className="p-4 text-center min-w-[120px] align-middle sticky top-0 z-10 bg-gray-50 dark:bg-[#161a22] border-b border-r border-gray-200 dark:border-[#3a4250] shadow-[0_2px_4px_-2px_rgba(0,0,0,0.08)]">
                        <button
                          type="button"
                          onClick={() => { setSelectedUserIds([]); setPickerRole('target') }}
                          disabled={adding || allUsers.length === 0}
                          className="px-3 py-1.5 text-xs font-medium text-[#FF8600] bg-orange-50 dark:bg-[#FF8600]/12 border border-orange-200 dark:border-[#FF8600]/40 hover:bg-orange-100 dark:hover:bg-[#FF8600]/18 disabled:opacity-50 rounded-lg transition cursor-pointer whitespace-nowrap"
                          title="Добавить объект (столбец сверху)"
                        >
                          + Объект
                        </button>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#303a48] text-sm">
                  {respondents.map((respondent, ri) => {
                    const invite = linkByReviewerId[respondent.id]
                    const inviteLink = invite ? buildRespondentInviteLink(invite.token) : null

                    return (
                      <tr key={respondent.id} className={`transition border-b border-gray-100 dark:border-[#303a48] hover:brightness-95 ${ri % 2 === 1 ? 'bg-gray-50 dark:bg-[#161a22]' : ''}`}>
                        <td className="p-4 font-medium text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-[#3a4250] sticky left-0 bg-white dark:bg-[#1e222e] z-10 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                          <div className="flex items-center gap-2">
                            <div className="relative inline-flex">
                              <div className={`w-6 h-6 rounded-full ${respondent.color} flex items-center justify-center text-xs font-bold shrink-0`}>
                                {respondent.initial}
                              </div>
                              {!readOnly && (
                                <button
                                  type="button"
                                  onClick={() => onRemoveParticipant(respondent.id, 'respondent')}
                                  className="absolute -top-1.5 -right-1.5 w-4 h-4 flex items-center justify-center rounded-full bg-white dark:bg-[#1e222e] text-red-500 border border-red-200 dark:border-red-500/40 hover:bg-red-50 dark:hover:bg-red-500/10 transition cursor-pointer"
                                  title="Удалить респондента"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div>{respondent.name}</div>
                              {!readOnly && targets.length > 0 && (() => {
                                const rowActive = targets.every(
                                  (t) => respondent.id === t.id || (assignments[String(respondent.id)]?.[String(t.id)] ?? false),
                                )
                                return (
                                  <button
                                    type="button"
                                    onClick={() => selectRow(respondent.id)}
                                    disabled={targets.length === 0}
                                    className={`mt-1.5 text-[10px] font-medium border rounded px-2 py-0.5 transition cursor-pointer disabled:opacity-40 disabled:cursor-default whitespace-nowrap ${
                                      rowActive
                                        ? 'bg-orange-100 dark:bg-[#FF8600]/18 text-[#FF6B00] border-orange-300 dark:border-[#FF8600]/45'
                                        : 'text-[#FF8600] hover:text-[#FF6B00] border-orange-200 dark:border-[#FF8600]/40 hover:bg-orange-50 dark:hover:bg-[#FF8600]/12'
                                    }`}
                                    title={rowActive ? 'Снять выбор ряда' : 'Выбрать весь ряд'}
                                  >
                                    {rowActive ? 'снять ряд' : 'весь ряд'}
                                  </button>
                                )
                              })()}
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
                                  {invite.reviewerEmail && onSendInvites && (
                                    <button
                                      type="button"
                                      onClick={() => handleSendInvite(respondent.id)}
                                      disabled={sendingInvites}
                                      className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200 dark:hover:text-gray-200 dark:hover:text-gray-300 disabled:opacity-50 cursor-pointer"
                                      title="Отправить приглашение по email"
                                    >
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                      </svg>
                                      {sendingReviewerId === respondent.id ? 'Отправка…' : 'Email'}
                                    </button>
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
                          const isSelf = respondent.id === target.id

                          const cellDisabled = readOnly
                          return (
                            <td
                              key={target.id}
                              onClick={(e) => {
                                if (cellDisabled) return
                                if ((e.target as HTMLElement).closest('button')) return
                                toggle(reviewerKey, targetKey)
                              }}
                              className={`p-4 text-center border-r border-gray-200 ${isSelf ? 'bg-purple-100/80 dark:bg-purple-500/15' : ''} ${cellDisabled ? '' : 'cursor-pointer hover:bg-orange-50/40 dark:hover:bg-[#FF8600]/12'}`}
                            >
                              <div className="flex flex-col items-center gap-1.5">
                                <span
                                  className={`w-5 h-5 rounded-full flex items-center justify-center transition ${
                                    assigned
                                      ? completed
                                        ? 'bg-green-50 dark:bg-green-500'
                                        : isSelf
                                          ? 'bg-purple-50 dark:bg-purple-500'
                                          : 'bg-[#FF8600]'
                                      : 'border-2 border-gray-300 dark:border-[#3a4250] bg-transparent'
                                  }`}
                                >
                                  {assigned && completed && (
                                    <svg
                                      className="w-3 h-3 text-white"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                      strokeWidth={3}
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </span>
                                {isSelf && (
                                  <span className="text-[9px] font-medium text-purple-400 leading-none">себя</span>
                                )}
                                {completed && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      onViewResponse?.({
                                        reviewerId: respondent.id,
                                        targetId: target.id,
                                        reviewerName: respondent.name,
                                        targetName: target.name,
                                      })
                                    }}
                                    className="inline-flex items-center gap-1 text-[11px] font-medium text-[#FF8600] hover:text-[#FF6B00] hover:underline cursor-pointer"
                                    title="Просмотреть ответы"
                                  >
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    Ответы
                                  </button>
                                )}
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}

                  {!readOnly && (
                    <tr className="hover:bg-blue-50/30 dark:hover:bg-blue-500/10 transition border-b border-gray-200">
                      <td className="p-4 border-r-2 border-gray-300 dark:border-[#3a4250] sticky left-0 bg-white dark:bg-[#1e222e] z-10 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                        <button
                          type="button"
                          onClick={() => { setSelectedUserIds([]); setPickerRole('respondent') }}
                          disabled={adding || allUsers.length === 0}
                          className="px-3 py-1.5 text-xs font-medium text-[#FF8600] bg-orange-50 dark:bg-[#FF8600]/12 border border-orange-200 dark:border-[#FF8600]/40 hover:bg-orange-100 dark:hover:bg-[#FF8600]/18 disabled:opacity-50 rounded-lg transition cursor-pointer whitespace-nowrap"
                        >
                          + Респондент
                        </button>
                      </td>
                      {targets.map((target) => (
                        <td key={target.id} className="p-4 border-r border-b border-gray-200 dark:border-[#3a4250] min-w-[120px]" />
                      ))}
                      {!readOnly && <td className="p-4 border-b border-gray-200 dark:border-[#3a4250]" />}
                    </tr>
                  )}

                  {readOnly && respondents.length === 0 && (
                    <tr>
                      <td colSpan={targets.length + 1} className="p-8 text-center text-sm text-gray-400 dark:text-gray-400">
                        Нет добавленных респондентов и объектов
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 mt-4">
          {!readOnly && saving && (
            <span className="text-xs text-gray-400 dark:text-gray-400 flex items-center gap-1.5">
              <span className="w-3 h-3 border-2 border-gray-300 dark:border-[#3a4250] border-t-[#FF8600] rounded-full animate-spin" />
              Сохранение…
            </span>
          )}
          {!readOnly && (
            <span className="text-xs text-gray-400 dark:text-gray-400">Изменения сохраняются автоматически</span>
          )}
          {onExportReport && canExport && (
            <button
              type="button"
              onClick={() => onExportReport()}
              disabled={exporting}
              className="px-5 py-2 text-sm font-medium text-[#FF8600] bg-white dark:bg-[#1e222e] border border-[#FF8600]/40 hover:bg-orange-50 dark:hover:bg-[#FF8600]/12 disabled:opacity-50 rounded-xl soft-press cursor-pointer"
            >
              {exporting ? 'Формирование…' : 'Сформировать результаты (.docx)'}
            </button>
          )}
          {onExportCsv && canExport && (
            <button
              type="button"
              onClick={() => onExportCsv()}
              disabled={exportingCsv}
              className="px-5 py-2 text-sm font-medium text-[#FF8600] bg-white dark:bg-[#1e222e] border border-[#FF8600]/40 hover:bg-orange-50 dark:hover:bg-[#FF8600]/12 disabled:opacity-50 rounded-xl transition cursor-pointer"
            >
              {exportingCsv ? 'Формирование…' : 'Сформировать результаты (.csv)'}
            </button>
          )}
        </div>
      </form>

      {pickerRole && (
        <Modal
          title={pickerRole === 'target' ? 'Добавить объекты оценки' : 'Добавить респондентов'}
          size="md"
          onClose={() => { setPickerRole(null); setSelectedUserIds([]) }}
          preventClose={adding}
        >
          {availableUsers.length > 0 && (
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={() =>
                  setSelectedUserIds(
                    selectedUserIds.length === availableUsers.length
                      ? []
                      : availableUsers.map((u) => u.id),
                  )
                }
                className="text-xs font-medium text-[#FF8600] hover:text-[#FF6B00] cursor-pointer"
              >
                {selectedUserIds.length === availableUsers.length ? 'Снять все' : 'Выбрать все'}
              </button>
            </div>
          )}
          {availableUsers.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-300 py-4">Все пользователи уже добавлены</p>
          ) : (
            <>
              <input
                type="text"
                placeholder="Поиск по имени или email…"
                className="w-full border border-gray-200 dark:border-[#3a4250] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#FF8600] dark:focus:border-[#FF8600] shadow-sm mb-3"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
              {filteredUsers.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-300 py-4">Ничего не найдено</p>
              ) : (
                <div className="overflow-y-auto space-y-1 max-h-[50vh]">
                  {filteredUsers.map((user) => {
                    const checked = selectedUserIds.includes(user.id)
                    return (
                      <label
                        key={user.id}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-#1e222e dark:hover:bg-[#262d3a] border border-gray-100 dark:border-[#303a48] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setSelectedUserIds((prev) =>
                              checked ? prev.filter((id) => id !== user.id) : [...prev, user.id],
                            )
                          }
                          className="w-4 h-4 text-[#FF8600] rounded focus:ring-[#FF8600]"
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user.name}</div>
                          <div className="text-xs text-gray-400 dark:text-gray-400 truncate">{user.email}</div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}
            </>
          )}
          <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-gray-100 dark:border-[#303a48]">
            <button
              type="button"
              onClick={() => { setPickerRole(null); setSelectedUserIds([]) }}
              disabled={adding}
              className="text-sm text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200 dark:hover:text-gray-200 dark:hover:text-gray-300 cursor-pointer disabled:opacity-50"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={() =>
                onAddParticipant(selectedUserIds, pickerRole)
                  .then(() => { setPickerRole(null); setSelectedUserIds([]); setSearch('') })
                  .catch(console.error)
              }
              disabled={adding || selectedUserIds.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-[#FF8600] hover:bg-[#FF6B00] disabled:opacity-50 rounded-xl soft-press shadow-sm cursor-pointer"
            >
              {adding ? 'Добавление…' : `Добавить выбранных (${selectedUserIds.length})`}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
