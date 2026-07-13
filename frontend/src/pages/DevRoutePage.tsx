import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { closeDevPage } from '../routing'
import { EntitiesPage } from './DevPage'

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
    login('Admin', true)
      .then(() => {
        if (!cancelled) setReady(true)
      })
      .catch(() => {
        if (!cancelled) setError('Не удалось получить доступ к базе данных')
      })

    return () => {
      cancelled = true
    }
  }, [loading, user, login])

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 gap-4">
        <p className="text-sm text-red-500">{error}</p>
        <button
          type="button"
          onClick={closeDevPage}
          className="text-sm text-gray-600 hover:text-gray-900 cursor-pointer"
        >
          Назад
        </button>
      </div>
    )
  }

  if (loading || !ready || !user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Подключение к базе данных…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <EntitiesPage onBack={closeDevPage} onOpenSurvey={() => closeDevPage()} />
    </div>
  )
}
