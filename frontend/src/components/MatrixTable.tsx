import { useState } from 'react'
import type { Participant } from '../types'

interface MatrixTableProps {
  respondents: Participant[]
  targets: Participant[]
  initialAssignments?: Record<string, Record<string, boolean>>
  onSave: (assignments: Record<string, Record<string, boolean>>) => void
}

export function MatrixTable({ respondents, targets, initialAssignments = {}, onSave }: MatrixTableProps) {
  const [assignments, setAssignments] =
    useState<Record<string, Record<string, boolean>>>(initialAssignments)

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(assignments)
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Кросс-таблица респондентов
          </span>
          <span className="text-xs text-gray-500 italic">
            Строки — кто отвечает. Столбцы — кого оценивают.
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50">
                <th className="p-4 text-xs font-bold text-gray-400 w-64 border-r border-gray-100">
                  Респондент \ Объект
                </th>
                {targets.map((t) => (
                  <th key={t.id} className="p-4 text-xs font-semibold text-gray-700 text-center">
                    {t.name} ({t.role})
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {respondents.map((r) => (
                <tr key={r.id} className="hover:bg-blue-50/30 transition group">
                  <td className="p-4 font-medium text-gray-900 border-r border-gray-100 flex items-center gap-2">
                    <div
                      className={`w-6 h-6 rounded-full ${r.color} flex items-center justify-center text-xs font-bold shrink-0`}
                    >
                      {r.initial}
                    </div>
                    {r.name} ({r.role})
                  </td>
                  {targets.map((t) => (
                    <td key={t.id} className="p-4 text-center">
                      <input
                        type="checkbox"
                        checked={isChecked(String(r.id), String(t.id))}
                        onChange={() => toggle(String(r.id), String(t.id))}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end mt-4">
        <button
          type="submit"
          className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-sm cursor-pointer"
        >
          Сохранить матрицу
        </button>
      </div>
    </form>
  )
}
