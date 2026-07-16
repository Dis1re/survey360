import { useEffect, useState } from 'react'
import { surveyApi, userApi } from '../api'
import { DEMO_PASSWORD, useAuth } from '../context/AuthContext'
import { TakeSurvey } from './TakeSurvey'
import type { ApiUser, InviteInfo } from '../types'
import { getInitials } from '../utils'

export function InviteSurveyPage({ token }: { token: string }) {
  const { user, loading: authLoading, login, logout } = useAuth()
  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [switching, setSwitching] = useState(false)

  useEffect(() => {
    setLoading(true)
    surveyApi
      .resolveInvite(token)
      .then((info) => {
        setInvite(info)
        setError(null)
      })
      .catch(() => {
        setInvite(null)
        setError('Ссылка недействительна или устарела')
      })
      .finally(() => setLoading(false))
  }, [token])

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#161a22] flex items-center justify-center p-6">
        <p className="text-sm text-gray-500 dark:text-gray-300">Загрузка…</p>
      </div>
    )
  }

  if (error || !invite) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#161a22] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-[#1e222e] border border-gray-200 dark:border-[#3a4250] rounded-2xl p-8 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Ссылка недоступна</h2>
          <p className="text-sm text-gray-500 dark:text-gray-300 mt-2">{error ?? 'Не удалось открыть опрос'}</p>
        </div>
      </div>
    )
  }

  const recipientLabel = (invite.reviewerName ?? '').trim() || invite.reviewerEmail

  if (!user || switching) {
    return (
      <InviteLoginGate
        recipientName={recipientLabel}
        recipientEmail={invite.reviewerEmail}
        onLoggedIn={() => setSwitching(false)}
        login={login}
      />
    )
  }

  if (user.id !== invite.reviewerId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#161a22] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-[#1e222e] border border-gray-200 dark:border-[#3a4250] rounded-2xl p-8 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Чужая ссылка</h2>
          <p className="text-sm text-gray-500 dark:text-gray-300 mt-2 leading-relaxed">
            Эта ссылка отправлена для{' '}
            <span className="font-medium text-gray-800 dark:text-gray-100">{recipientLabel}</span>
            {invite.reviewerEmail ? (
              <>
                {' '}
                (<span className="text-gray-700 dark:text-gray-200">{invite.reviewerEmail}</span>)
              </>
            ) : null}
            . Вы вошли как{' '}
            <span className="font-medium text-gray-800 dark:text-gray-100">
              {user.name.trim() || user.email}
            </span>
            . Пройти опрос под этим аккаунтом нельзя.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={async () => {
                setSwitching(true)
                await logout()
              }}
              className="w-full bg-[#FF8600] hover:bg-[#FF6B00] text-white font-medium py-2.5 px-4 rounded-xl soft-press shadow-sm cursor-pointer"
            >
              Сменить аккаунт
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#161a22]">
      <TakeSurvey
        surveyId={invite.surveyId}
        lockedReviewerId={invite.reviewerId}
        authUserId={user.id}
        standalone
      />
    </div>
  )
}

function InviteLoginGate({
  recipientName,
  recipientEmail,
  onLoggedIn,
  login,
}: {
  recipientName: string
  recipientEmail: string
  onLoggedIn: () => void
  login: (email: string, options?: { password?: string; asAdmin?: boolean }) => Promise<void>
}) {
  const [users, setUsers] = useState<ApiUser[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [email, setEmail] = useState(recipientEmail)
  const [password, setPassword] = useState(DEMO_PASSWORD)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setUsersLoading(true)
    userApi
      .list()
      .then(setUsers)
      .catch(() => setUsers([]))
      .finally(() => setUsersLoading(false))
  }, [])

  const handleLogin = async (loginEmail: string, pwd: string) => {
    const trimmed = loginEmail.trim()
    if (!trimmed) {
      setError('Введите email')
      return
    }
    if (!pwd.trim()) {
      setError('Введите пароль')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await login(trimmed, { password: pwd.trim() })
      onLoggedIn()
    } catch (err) {
      const status = (err as Error & { status?: number }).status
      if (status === 404) setError('Пользователь с таким email не найден')
      else if (status === 401) setError('Неверный пароль')
      else setError('Не удалось войти. Попробуйте ещё раз.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#161a22] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white dark:bg-[#1e222e] border border-gray-200 dark:border-[#3a4250] rounded-2xl p-8 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Вход для прохождения опроса</h2>
        <p className="text-sm text-gray-500 dark:text-gray-300 mt-2 leading-relaxed">
          Ссылка отправлена для{' '}
          <span className="font-medium text-gray-800 dark:text-gray-100">{recipientName}</span>
          {recipientEmail ? (
            <>
              {' '}
              (<span className="text-gray-700 dark:text-gray-200">{recipientEmail}</span>)
            </>
          ) : null}
          . Войдите под этим аккаунтом, чтобы начать.
        </p>

        <div className="mt-5">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Быстрый выбор (для тестов)
          </p>
          <div className="max-h-40 overflow-y-auto rounded-xl border border-gray-200 dark:border-[#3a4250] divide-y divide-gray-100 dark:divide-[#3a4250]">
            {usersLoading ? (
              <p className="px-4 py-3 text-sm text-gray-400">Загрузка…</p>
            ) : users.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-400">Пользователей пока нет</p>
            ) : (
              users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  disabled={submitting}
                  onClick={() => handleLogin(u.email, DEMO_PASSWORD)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-orange-50 dark:hover:bg-[#262d3a] disabled:opacity-50 soft-press cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-[#FF8600] text-white text-xs font-semibold flex items-center justify-center shrink-0">
                    {getInitials(u.name, u.email)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {u.name.trim() || u.email}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{u.email}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <form
          className="mt-5 space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            void handleLogin(email, password)
          }}
        >
          <div>
            <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
              Email
            </label>
            <input
              id="invite-email"
              type="text"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 dark:border-[#3a4250] bg-white dark:bg-[#161a22] text-gray-900 dark:text-gray-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#FF8600]"
            />
          </div>
          <div>
            <label htmlFor="invite-password" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
              Пароль
            </label>
            <input
              id="invite-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-200 dark:border-[#3a4250] bg-white dark:bg-[#161a22] text-gray-900 dark:text-gray-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#FF8600]"
            />
            <p className="mt-1.5 text-xs text-gray-400">Для демо пароль: {DEMO_PASSWORD}</p>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#FF8600] hover:bg-[#FF6B00] disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-xl soft-press shadow-sm cursor-pointer"
          >
            {submitting ? 'Вход…' : 'Войти и начать'}
          </button>
        </form>
      </div>
    </div>
  )
}
