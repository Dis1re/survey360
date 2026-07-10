import { useCallback, useEffect, useState } from 'react'
import { userApi } from '../api'
import type { ApiUser } from '../types'

interface ParticipantSelectProps {
  onSelect: (userId: number) => void
  onBack: () => void
}

export function ParticipantSelect({ onSelect, onBack }: ParticipantSelectProps) {
  const [users, setUsers] = useState<ApiUser[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const loadUsers = useCallback(async () => {
    const list = await userApi.list()
    setUsers(list)
    setSelectedId((prev) => {
      if (prev !== null && list.some((u) => u.id === prev)) return prev
      return list[0]?.id ?? null
    })
  }, [])

  useEffect(() => {
    setLoading(true)
    loadUsers().catch(console.error).finally(() => setLoading(false))
  }, [loadUsers])

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
        Назад
      </button>

      <h1 className="text-2xl font-semibold text-gray-900">Выбор пользователя</h1>
      <p className="text-sm text-gray-500 mt-1">
        Укажите, за кого вы проходите опрос. Ответы будут записаны в базу данных под этим пользователем.
      </p>

      <div className="mt-6 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Пользователи</span>
        {loading ? (
          <p className="text-sm text-gray-400 mt-3">Загрузка…</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-gray-400 mt-3">Пользователей пока нет</p>
        ) : (
          <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
            {users.map((user) => {
              const isActive = user.id === selectedId
              return (
                <label
                  key={user.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
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

      <button
        type="button"
        onClick={() => selectedId !== null && onSelect(selectedId)}
        disabled={selectedId === null}
        className="mt-6 w-full bg-[#FF8600] hover:bg-[#FF6B00] disabled:opacity-50 text-white font-medium py-3 px-4 rounded-xl transition shadow-sm cursor-pointer"
      >
        Перейти к выбору цели
      </button>
    </div>
  )
}
