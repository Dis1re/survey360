import { useCallback, useEffect, useState } from 'react'
import { surveyApi } from './api'
import { Sidebar } from './components/Sidebar'
import { apiSurveyToSurvey } from './mappers'
import { MainPage } from './pages/MainPage'
import { EntitiesPage } from './pages/DevPage'
import { EntityPage } from './pages/SurveyDetails'
import type { Survey } from './types'

type View = 'main' | 'dev' | 'details'

export default function App() {
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [selectedSurveyId, setSelectedSurveyId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [view, setView] = useState<View>('main')

  const loadSurveys = useCallback(async () => {
    const list = await surveyApi.list()
    const mapped = list.map(apiSurveyToSurvey)
    setSurveys(mapped)
    setSelectedSurveyId((prev) => {
      if (prev !== null && mapped.some((survey) => survey.id === prev)) return prev
      return mapped[0]?.id ?? null
    })
    return mapped
  }, [])

  useEffect(() => {
    loadSurveys()
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [loadSurveys])

  const filteredSurveys = searchQuery.trim()
    ? surveys.filter(
        (survey) =>
          survey.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          survey.description.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : surveys

  const handleOpenDev = () => setView('dev')

  const handleOpenDetails = () => setView('details')

  const handleBack = () => {
    setView('main')
    loadSurveys()
  }

  const handleCreateClick = async () => {
    setCreating(true)
    setError(null)
    try {
      const id = await surveyApi.create()
      await loadSurveys()
      setSelectedSurveyId(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать опрос')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        surveys={filteredSurveys}
        activeSurveyId={selectedSurveyId}
        loading={loading}
        creating={creating}
        onSurveySelect={setSelectedSurveyId}
        onCreateClick={handleCreateClick}
        onSearch={setSearchQuery}
        onOpenDev={handleOpenDev}
        onOpenDetails={handleOpenDetails}
      />
      <main className="flex-1 overflow-y-auto">
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}
        {view === 'dev' ? (
          <EntitiesPage onBack={handleBack} onOpenSurvey={setSelectedSurveyId} />
        ) : view === 'details' ? (
          <EntityPage id={selectedSurveyId ?? 0} onBack={handleBack} />
        ) : (
          <MainPage surveyId={selectedSurveyId} onSurveyUpdated={loadSurveys} />
        )}
      </main>
    </div>
  )
}
