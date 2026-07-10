import { useEffect, useState } from 'react'
import type { ApiUser, Participant } from '../types'

interface MatrixTableProps {
  targets: Participant[]
  respondents: Participant[]
  allUsers: ApiUser[]
  initialAssignments?: Record<string, Record<string, boolean>>
  saving?: boolean
  adding?: boolean
  onAddParticipant: (userId: number, role: 'target' | 'respondent') => Promise<void>
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
  targets,
  respondents,
  allUsers,
  initialAssignments = {},
  saving = false,
  adding = false,
  onAddParticipant,
  onSave,
}: MatrixTableProps) {
  const [assignments, setAssignments] =
    useState<Record<string, Record<string, boolean>>>(initialAssignments)
  const [pickerRole, setPickerRole] = useState<'target' | 'respondent' | null>(null)

  useEffect(() => {
    setAssignments(initialAssignments)
  }, [initialAssignments])

  const toggle = (respondentId: string, targetId: string) => {
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

  return (
    <>
      <form onSubmit={handleSubmit}>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Кросс-таблица респондентов
            </span>
            <div className="flex flex-wrap gap-2">
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
                          <div className={`w-7 h-7 rounded-full ${target.color} flex items-center justify-center text-xs font-bold`}>
                            {target.initial}
                          </div>
                          <span>{target.name}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {respondents.map((respondent) => (
                    <tr key={respondent.id} className="hover:bg-blue-50/30 transition">
                      <td className="p-4 font-medium text-gray-900 border-r border-gray-100">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full ${respondent.color} flex items-center justify-center text-xs font-bold shrink-0`}>
                            {respondent.initial}
                          </div>
                          {respondent.name}
                        </div>
                      </td>
                      {targets.map((target) => (
                        <td key={target.id} className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked(String(respondent.id), String(target.id))}
                            onChange={() => toggle(String(respondent.id), String(target.id))}
                            disabled={respondent.id === target.id}
                            className="w-4 h-4 border-gray-300 rounded focus:ring-[#FF8600] cursor-pointer disabled:opacity-30"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {(targets.length > 0 || respondents.length > 0) && (
          <div className="flex justify-end mt-4">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-medium text-white bg-[#FF8600] hover:bg-[#FF6B00] disabled:opacity-50 rounded-xl transition shadow-sm cursor-pointer"
            >
              {saving ? 'Сохранение…' : 'Сохранить матрицу'}
            </button>
          </div>
        )}
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
              <div className="overflow-y-auto space-y-1">
                {availableUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    disabled={adding}
                    onClick={() => onAddParticipant(user.id, pickerRole).then(() => setPickerRole(null)).catch(console.error)}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-gray-50 border border-orange-200 hover:border-orange-300 transition disabled:opacity-50 cursor-pointer"
                  >
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    <div className="text-xs text-gray-400">{user.email}</div>
                  </button>
                ))}
              </div>
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
