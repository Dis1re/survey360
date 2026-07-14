import { useEffect, useState } from 'react'
import { surveyApi } from '../api'
import type { ApiUser } from '../types'

export function UserPicker({
  surveyId,
  onSelect,
  onBack,
  showBack = true,
}: {
  surveyId: number
  onSelect: (id: number) => void
  onBack: () => void
  showBack?: boolean
}) {
  const [users, setUsers] = useState<ApiUser[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  useEffect(() => {
    setLoading(true)
    surveyApi
      .getMatrix(surveyId)
      .then((matrix) => {
        setUsers(matrix.respondents)
        setSelectedId(matrix.respondents[0]?.id ?? null)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [surveyId])

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Укажите, за кого вы проходите опрос. Ответы будут записаны в базу данных под этим пользователем.
      </p>
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Участники опроса</span>
        {loading ? (
          <p className="text-sm text-gray-400 mt-3">Загрузка…</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-gray-400 mt-3">Нет пользователей, назначенных на этот опрос</p>
        ) : (
          <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
            {users.map((user) => {
              const isActive = user.id === selectedId
              return (
                <label
                  key={user.id}
                  className={`soft-lift flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${
                    isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="participant"
                    checked={isActive}
                    onChange={() => setSelectedId(user.id)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{user.name}</div>
                    <div className="text-xs text-gray-500 truncate">{user.email}</div>
                  </div>
                </label>
              )
            })}
          </div>
        )}
      </div>
      <div className="mt-6 flex gap-3">
        {showBack && (
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer"
          >
            Назад
          </button>
        )}
        <button
          type="button"
          onClick={() => selectedId !== null && onSelect(selectedId)}
          disabled={selectedId === null}
          className={`${showBack ? 'flex-1' : 'w-full'} bg-[#FF8600] hover:bg-[#FF6B00] disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-xl soft-press shadow-sm cursor-pointer`}
        >
          Далее
        </button>
      </div>
    </div>
  )
}
