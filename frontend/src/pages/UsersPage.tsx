import { useEffect, useState } from 'react'
import { userApi } from '../api'
import type { ApiUser } from '../types'
import { ConfirmModal } from '../components/ConfirmModal'

interface UsersPageProps {
  onBack: () => void
}

function formatDate(value: string) {
  if (!value || value.startsWith('0001')) return '—'
  return new Date(value).toLocaleString()
}

const thClass =
  'text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider'
const tdClass = 'px-4 py-3 text-sm text-gray-600'

export function UsersPage({ onBack }: UsersPageProps) {
  const [users, setUsers] = useState<ApiUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userToDelete, setUserToDelete] = useState<ApiUser | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError(null)
    userApi
      .list()
      .then(setUsers)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const confirmDeleteUser = async () => {
    if (!userToDelete) return
    setDeleting(true)
    try {
      await userApi.delete(userToDelete.id)
      setUserToDelete(null)
      const updated = await userApi.list()
      setUsers(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <header className="bg-white border-b border-gray-200 p-6 flex-shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={onBack}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer mb-2"
            >
              ← К списку опросов
            </button>
            <h1 className="text-xl font-bold text-gray-900">Пользователи</h1>
            <p className="text-xs text-gray-400 mt-1 font-mono">GET /api/user</p>
          </div>
        </div>
      </header>

      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="text-sm text-gray-500">Загрузка…</div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          ) : users.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm text-sm text-gray-500">
              Пользователей нет
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Пользователи ({users.length})
              </h2>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-200">
                      <th className={thClass}>Id</th>
                      <th className={thClass}>Имя</th>
                      <th className={thClass}>Email</th>
                      <th className={thClass}>Создан</th>
                      <th className={thClass}>Обновлён</th>
                      <th className={`${thClass} text-right`}>Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className={`${tdClass} font-mono`}>{user.id}</td>
                        <td className={tdClass}>{user.name || '—'}</td>
                        <td className={tdClass}>{user.email || '—'}</td>
                        <td className={tdClass}>{formatDate(user.createdAt)}</td>
                        <td className={tdClass}>{formatDate(user.updatedAt)}</td>
                        <td className={`${tdClass} text-right`}>
                          <button
                            type="button"
                            onClick={() => setUserToDelete(user)}
                            className="text-xs font-medium text-red-600 hover:text-red-700 hover:underline cursor-pointer"
                          >
                            Удалить
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {userToDelete && (
        <ConfirmModal
          title="Удалить пользователя?"
          message={
            <>
              Пользователь <span className="font-semibold">{userToDelete.name}</span> будет
              безвозвратно удалён из базы данных вместе со всеми связанными ответами, назначениями
              и участиями в опросах.
            </>
          }
          variant="danger"
          confirmLabel="Удалить"
          loading={deleting}
          onConfirm={confirmDeleteUser}
          onCancel={() => !deleting && setUserToDelete(null)}
        />
      )}
    </>
  )
}
