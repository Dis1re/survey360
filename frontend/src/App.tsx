import { useEffect, useState } from 'react'
import { apiGet, type SimpleEntity } from './api/client'
import './App.css'

function App() {
  const [entities, setEntities] = useState<SimpleEntity[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiGet<SimpleEntity[]>('/entities')
      .then(setEntities)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="app">
      <header>
        <h1>Survey360</h1>
        <p>Frontend (React + TypeScript) · Backend (.NET API)</p>
      </header>

      <section className="status">
        <h2>API connection</h2>
        {loading && <p>Loading…</p>}
        {error && <p className="error">Backend unavailable: {error}</p>}
        {!loading && !error && (
          <p className="ok">
            Connected — {entities.length} entities from <code>/api/entities</code>
          </p>
        )}
      </section>
    </main>
  )
}

export default App
