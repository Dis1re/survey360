import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { closeDevPage } from '../routing'
import { EntitiesPage } from './DevPage'

function devAccessError(err: unknown): string {
  const status = (err as Error & { status?: number }).status
  if (status === 403) return 'Нет прав администратора для доступа к базе данных'
  if (status === 404) return 'Администратор не найден. Убедитесь, что БД инициализирована (миграции применены).'
  if (status === 401) return 'Сессия истекла. Попробуйте открыть страницу снова.'
  return 'Не удалось получить доступ к базе данных. Проверьте, что сервер запущен и БД доступна.'
}

export function DevRoutePage() {
  const { user, loading, login } = useAuth()
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (loading) return

    if (user?.isAdmin) {
      setReady(true)
      return
    }

    let cancelled = false
    login('Admin', { asAdmin: true })
      .then(() => {
        if (!cancelled) setReady(true)
      })
      .catch((err) => {
        if (!cancelled) setError(devAccessError(err))
      })

    return () => {
      cancelled = true
    }
  }, [loading, user, login])

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-[#161a22] p-6 gap-4">
        <p className="text-sm text-red-500 text-center max-w-md">{error}</p>
        <button
          type="button"
          onClick={closeDevPage}
          className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 cursor-pointer"
        >
          Назад
        </button>
      </div>
    )
  }

  if (loading || !ready || !user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#161a22]">
        <p className="text-sm text-gray-500 dark:text-gray-300">Подключение к базе данных…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#161a22]">
      <EntitiesPage onBack={closeDevPage} onOpenSurvey={() => closeDevPage()} />
    </div>
  )
}
