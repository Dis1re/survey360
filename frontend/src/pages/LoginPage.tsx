import { useEffect, useState } from 'react'
import { userApi } from '../api'
import { useAuth } from '../context/AuthContext'
import { openDevPage } from '../routing'
import type { ApiUser } from '../types'

type LoginMode = 'user' | 'admin'

interface LoginPageProps {
  initialMode?: LoginMode
}

function getInitials(name: string, email: string) {
  const trimmed = name.trim()
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return trimmed.slice(0, 2).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

export function LoginPage({ initialMode = 'user' }: LoginPageProps) {
  const { login } = useAuth()
  const [mode, setMode] = useState<LoginMode>(initialMode)
  const [email, setEmail] = useState('')
  const [users, setUsers] = useState<ApiUser[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [popupOpen, setPopupOpen] = useState(false)

  useEffect(() => {
    if (!popupOpen || mode !== 'user') return

    setUsersLoading(true)
    userApi
      .list()
      .then(setUsers)
      .catch(() => setUsers([]))
      .finally(() => setUsersLoading(false))
  }, [popupOpen, mode])

  const openPopup = (nextMode: LoginMode) => {
    setMode(nextMode)
    setEmail(nextMode === 'admin' ? 'Админ' : '')
    setError(null)
    setPopupOpen(true)
  }

  const handleLogin = async (value: string, asAdmin: boolean) => {
    const trimmed = value.trim()
    if (!trimmed) {
      setError('Введите email')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await login(trimmed, asAdmin)
    } catch (err) {
      const status = (err as Error & { status?: number }).status
      if (status === 404) {
        setError('Пользователь с таким email не найден')
      } else if (status === 403) {
        setError('Нет прав администратора для этого email')
      } else {
        setError('Не удалось войти. Попробуйте ещё раз.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim()
    await handleLogin(trimmed, mode === 'admin')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-gray-100 flex flex-col items-center justify-center p-6">
      <div className="text-center mb-8">
        <img src="/Survey360Logo.webp" alt="" className="w-20 h-20 object-contain mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-gray-900">Опросы 360</h1>
        <p className="text-sm text-gray-500 mt-2 max-w-sm">
          Войдите по корпоративной почте, чтобы увидеть назначенные вам опросы
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap justify-center">
        <button
          type="button"
          onClick={() => openPopup('user')}
          className="bg-[#FF8600] hover:bg-[#FF6B00] text-white font-medium py-3 px-8 rounded-xl transition shadow-sm cursor-pointer"
        >
          Войти
        </button>
        <button
          type="button"
          onClick={() => openPopup('admin')}
          className="bg-white hover:bg-gray-50 text-gray-700 font-medium py-3 px-8 rounded-xl border border-gray-200 transition shadow-sm cursor-pointer"
        >
          Вход для администратора
        </button>
        <button
          type="button"
          onClick={openDevPage}
          className="bg-white hover:bg-gray-50 text-gray-600 font-medium py-3 px-8 rounded-xl border border-dashed border-gray-300 transition shadow-sm cursor-pointer"
        >
          База данных
        </button>
      </div>

      {popupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {mode === 'admin' ? 'Вход администратора' : 'Вход в систему'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {mode === 'admin'
                      ? 'Нажмите «Войти» — логин уже подставлен'
                      : 'Выберите пользователя или введите email'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPopupOpen(false)}
                  aria-label="Закрыть"
                  className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {mode === 'user' && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Пользователи в системе</p>
                  <div className="max-h-52 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100">
                    {usersLoading ? (
                      <p className="px-4 py-3 text-sm text-gray-400">Загрузка…</p>
                    ) : users.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-gray-400">Пользователей пока нет</p>
                    ) : (
                      users.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          disabled={submitting}
                          onClick={() => handleLogin(user.email, false)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-orange-50 disabled:opacity-50 transition cursor-pointer"
                        >
                          <div className="w-9 h-9 rounded-full bg-[#FF8600] text-white text-xs font-semibold flex items-center justify-center shrink-0">
                            {getInitials(user.name, user.email)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {user.name.trim() || user.email}
                            </div>
                            <div className="text-xs text-gray-500 truncate">{user.email}</div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {mode === 'user' && (
                <div className="relative">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-400">или email</span>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  {mode === 'admin' ? 'Логин' : 'Email'}
                </label>
                <input
                  id="login-email"
                  type="text"
                  autoComplete="username"
                  autoFocus={mode !== 'admin'}
                  readOnly={mode === 'admin'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={mode === 'admin' ? 'Админ' : 'name@company.com'}
                  className={`w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#FF8600] ${
                    mode === 'admin' ? 'bg-gray-50 text-gray-700' : ''
                  }`}
                />
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#FF8600] hover:bg-[#FF6B00] disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-xl transition shadow-sm cursor-pointer"
              >
                {submitting ? 'Вход…' : mode === 'admin' ? 'Войти' : 'Продолжить'}
              </button>

              {mode === 'user' ? (
                <button
                  type="button"
                  onClick={() => {
                    setMode('admin')
                    setEmail('Админ')
                    setError(null)
                  }}
                  className="w-full text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
                >
                  Я администратор
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMode('user')
                    setEmail('')
                    setError(null)
                  }}
                  className="w-full text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
                >
                  Обычный вход
                </button>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
