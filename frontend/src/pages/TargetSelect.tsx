import { useCallback, useEffect, useState } from 'react'
import { surveyApi, userApi } from '../api'
import type { ApiUser } from '../types'

interface TargetSelectProps {
  surveyId: number
  userId: number
  onSelect: (targetId: number) => void
  onBack: () => void
}

export function TargetSelect({ surveyId, userId, onSelect, onBack }: TargetSelectProps) {
  const [targets, setTargets] = useState<{ user: ApiUser; completed: boolean }[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const load = useCallback(async () => {
    const [details, users] = await Promise.all([surveyApi.get(surveyId), userApi.list()])
    const targetEntries = details.assignments
      .filter((a) => a.isAssigned && a.reviewerId === userId)
      .map((a) => {
        const user = users.find((u) => u.id === a.targetId)
        return user ? { user, completed: a.isCompleted } : null
      })
      .filter((e): e is { user: ApiUser; completed: boolean } => e !== null)

    setTargets(targetEntries)
    setSelectedId((prev) => {
      if (prev !== null && targetEntries.some((t) => t.user.id === prev && !t.completed)) return prev
      const firstOpen = targetEntries.find((t) => !t.completed)
      return firstOpen?.user.id ?? null
    })
  }, [surveyId, userId])

  useEffect(() => {
    setLoading(true)
    load().catch(console.error).finally(() => setLoading(false))
  }, [load])

  return (
    <div className="max-w-2xl mx-auto p-6">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Сменить пользователя
      </button>

      <h1 className="text-2xl font-semibold text-gray-900">Выбор цели опроса</h1>
      <p className="text-sm text-gray-500 mt-1">
        По кому вы хотите пройти опрос? Один и тот же пользователь может оценивать несколько целей.
      </p>

      <div className="mt-6 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Доступные цели</span>
        {loading ? (
          <p className="text-sm text-gray-400 mt-3">Загрузка…</p>
        ) : targets.length === 0 ? (
          <p className="text-sm text-gray-400 mt-3">Для этого пользователя нет назначенных целей</p>
        ) : (
          <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
            {targets.map(({ user, completed }) => {
              const isActive = user.id === selectedId && !completed
              return (
                <label
                  key={user.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition ${
                    completed
                      ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                      : isActive
                        ? 'border-blue-500 bg-blue-50 cursor-pointer'
                        : 'border-gray-100 hover:bg-gray-50 cursor-pointer'
                  }`}
                >
                  <input
                    type="radio"
                    name="target"
                    checked={isActive}
                    disabled={completed}
                    onChange={() => setSelectedId(user.id)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900 truncate">{user.name}</div>
                    <div className="text-xs text-gray-500 truncate">{user.email}</div>
                  </div>
                  {completed && (
                    <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Пройден
                    </span>
                  )}
                </label>
              )
            })}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => selectedId !== null && onSelect(selectedId)}
        disabled={selectedId === null}
        className="mt-6 w-full bg-[#FF8600] hover:bg-[#FF6B00] disabled:opacity-50 text-white font-medium py-3 px-4 rounded-xl transition shadow-sm cursor-pointer"
      >
        Перейти к опросу
      </button>
    </div>
  )
}
