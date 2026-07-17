import { useEffect, useState } from 'react'
import { surveyApi, userApi } from '../api'
import { Modal } from '../components/Modal'
import { DEMO_PASSWORD, useAuth } from '../context/AuthContext'
import { getInviteToken, openDevPage } from '../routing'
import type { ApiUser } from '../types'
import { getInitials } from '../utils'

type LoginMode = 'user' | 'admin'

interface LoginPageProps {
  initialMode?: LoginMode
}

export function LoginPage({ initialMode = 'user' }: LoginPageProps) {
  const { login } = useAuth()
  const [mode, setMode] = useState<LoginMode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [users, setUsers] = useState<ApiUser[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [popupOpen, setPopupOpen] = useState(false)
  const [inviteHint, setInviteHint] = useState<string | null>(null)

  useEffect(() => {
    const token = getInviteToken()
    if (!token) return

    let cancelled = false
    surveyApi
      .resolveInvite(token)
      .then((info) => {
        if (cancelled) return
        const hint = info.reviewerEmail || info.reviewerName.trim()
        setInviteHint(hint || null)
        setMode('user')
        setEmail(info.reviewerEmail || '')
        setPassword(DEMO_PASSWORD)
        setError(null)
        setPopupOpen(true)
      })
      .catch(() => {
        if (!cancelled) setInviteHint(null)
      })

    return () => {
      cancelled = true
    }
  }, [])

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
    if (nextMode === 'admin') {
      setEmail('Админ')
      setPassword('')
    } else if (!email) {
      setEmail('')
      setPassword('')
    }
    setError(null)
    setPopupOpen(true)
  }

  const handleLogin = async (value: string, asAdmin: boolean, pwd?: string) => {
    const trimmed = value.trim()
    if (!trimmed) {
      setError(asAdmin ? 'Введите логин' : 'Введите email')
      return
    }

    if (!asAdmin && !pwd?.trim()) {
      setError('Введите пароль')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await login(trimmed, asAdmin ? { asAdmin: true } : { password: pwd!.trim() })
    } catch (err) {
      const status = (err as Error & { status?: number }).status
      if (status === 404) {
        setError('Пользователь с таким email не найден')
      } else if (status === 403) {
        setError('Нет прав администратора для этого email')
      } else if (status === 401) {
        setError('Неверный пароль')
      } else {
        setError('Не удалось войти. Попробуйте ещё раз.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await handleLogin(email, mode === 'admin', password)
  }

  const selectUser = (user: ApiUser) => {
    setEmail(user.email)
    setPassword(DEMO_PASSWORD)
    setError(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-gray-100 flex flex-col items-center justify-center p-6">
      <div className="text-center mb-8 anim-fade">
        <img src="/Survey360Logo.webp" alt="" className="w-20 h-20 object-contain mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-gray-900">Опросы 360</h1>
        <p className="text-sm text-gray-500 mt-2 max-w-sm">
          {inviteHint
            ? `Войдите как ${inviteHint}, чтобы открыть опрос по приглашению`
            : 'Войдите по корпоративной почте, чтобы увидеть назначенные вам опросы'}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap justify-center">
        <button
          type="button"
          onClick={() => openPopup('user')}
          className="soft-press bg-[#FF8600] hover:bg-[#FF6B00] text-white font-medium py-3 px-8 rounded-xl shadow-sm cursor-pointer"
        >
          Войти
        </button>
        <button
          type="button"
          onClick={openDevPage}
          className="soft-press bg-white hover:bg-gray-50 text-gray-600 font-medium py-3 px-8 rounded-xl border border-dashed border-gray-300 shadow-sm cursor-pointer"
        >
          База данных
        </button>
      </div>

      {popupOpen && (
        <Modal
          title={mode === 'admin' ? 'Вход администратора' : 'Вход в систему'}
          forceLight
          description={
            mode === 'admin'
              ? 'Нажмите «Войти» — логин уже подставлен'
              : inviteHint
                ? `Для этой ссылки нужен аккаунт ${inviteHint}`
                : 'Выберите пользователя или введите email и пароль'
          }
          size="lg"
          onClose={() => setPopupOpen(false)}
          preventClose={submitting}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
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
                        onClick={() => selectUser(user)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-orange-50 disabled:opacity-50 soft-press cursor-pointer ${
                          email === user.email ? 'bg-orange-50' : ''
                        }`}
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
                  <span className="bg-white px-2 text-gray-400">или email и пароль</span>
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

            {mode === 'user' && (
              <div>
                <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Пароль
                </label>
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Пароль"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#FF8600]"
                />
                <p className="mt-1.5 text-xs text-gray-400">Для демо пароль всех пользователей: {DEMO_PASSWORD}</p>
              </div>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#FF8600] hover:bg-[#FF6B00] disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-xl soft-press shadow-sm cursor-pointer"
            >
              {submitting ? 'Вход…' : 'Войти'}
            </button>

            {mode === 'user' ? (
              <button
                type="button"
                onClick={() => {
                  setMode('admin')
                  setEmail('Админ')
                  setPassword('')
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
                  setPassword('')
                  setError(null)
                }}
                className="w-full text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
              >
                Обычный вход
              </button>
            )}
          </form>
        </Modal>
      )}
    </div>
  )
}
