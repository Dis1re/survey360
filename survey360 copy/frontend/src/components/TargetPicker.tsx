import { useEffect, useState } from 'react'
import { surveyApi, userApi } from '../api'
import type { ApiUser } from '../types'

interface TargetEntry {
  user: ApiUser
  completed: boolean
}

export function TargetPicker({
  surveyId,
  userId,
  onSelect,
  onBack,
  backLabel = 'Сменить пользователя',
  hideBackButton = false,
}: {
  surveyId: number
  userId: number
  onSelect: (id: number, completed: boolean) => void
  onBack: () => void
  backLabel?: string
  hideBackButton?: boolean
}) {
  const [targets, setTargets] = useState<TargetEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([surveyApi.get(surveyId), userApi.list()])
      .then(([details, users]) => {
        const entries = details.assignments
          .filter((a) => a.isAssigned && a.reviewerId === userId)
          .map((a) => {
            const user = users.find((u) => u.id === a.targetId)
            return user ? { user, completed: a.isCompleted } : null
          })
          .filter((e): e is TargetEntry => e !== null)
        setTargets(entries)
        setSelectedId(entries.find((t) => !t.completed)?.user.id ?? entries[0]?.user.id ?? null)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [surveyId, userId])

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        По кому вы хотите пройти опрос? Один и тот же пользователь может оценивать несколько целей.
      </p>
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Доступные цели</span>
        {loading ? (
          <p className="text-sm text-gray-400 mt-3">Загрузка…</p>
        ) : targets.length === 0 ? (
          <p className="text-sm text-gray-400 mt-3">Для этого пользователя нет назначенных целей</p>
        ) : (
          <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
            {targets.map(({ user, completed }) => {
              const isActive = user.id === selectedId
              return (
                <label
                  key={user.id}
                  className={`soft-lift flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${
                    completed
                      ? isActive
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-100 bg-gray-50 hover:bg-gray-100'
                      : isActive
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="target"
                    checked={isActive}
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
      <div className="mt-6 flex gap-3">
        {!hideBackButton && (
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer"
          >
            {backLabel}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            if (selectedId === null) return
            const entry = targets.find((t) => t.user.id === selectedId)
            onSelect(selectedId, entry?.completed ?? false)
          }}
          disabled={selectedId === null}
          className={`${hideBackButton ? 'w-full' : 'flex-1'} bg-[#FF8600] hover:bg-[#FF6B00] disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-xl soft-press shadow-sm cursor-pointer`}
        >
          {targets.find((t) => t.user.id === selectedId)?.completed ? 'Просмотреть ответы' : 'Перейти к опросу'}
        </button>
      </div>
    </div>
  )
}
