import { useEffect, useState } from 'react'
import { settingsApi } from '../api'
import type { MySettings } from '../types'
import { Layout } from '../components/Layout'

export function HomePage() {
  const [settings, setSettings] = useState<MySettings | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    settingsApi
      .get()
      .then(setSettings)
      .catch((err: Error) => setError(err.message))
  }, [])

  return (
    <Layout title="Опросы">
      <div className="text-center">
        <h1 className="display-4">Страница опросов</h1>
        <p>
          Документация о{' '}
          <a href="https://learn.microsoft.com/aspnet/core">ASP.NET Core</a> на
          сайте Microsoft.
        </p>
        <br />
        <h5>Данные из appsettings.json:</h5>
        {error && <p className="text-danger">{error}</p>}
        {settings && (
          <>
            <p>value1: {settings.value1}</p>
            <p>value2: {settings.value2}</p>
            <p>value3: {String(settings.value3)}</p>
          </>
        )}
      </div>
    </Layout>
  )
}
