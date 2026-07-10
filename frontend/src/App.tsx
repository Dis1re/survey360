import { useCallback, useEffect, useState } from 'react'
import { surveyApi } from './api'
import { Sidebar } from './components/Sidebar'
import { apiSurveyToSurvey } from './mappers'
import { EntitiesPage } from './pages/DevPage'
import { MainPage } from './pages/MainPage'
import { EntityPage } from './pages/SurveyDetails'
import { ParticipantSelect } from './pages/ParticipantSelect'
import { TargetSelect } from './pages/TargetSelect'
import { TakeSurvey } from './pages/TakeSurvey'
import type { Survey } from './types'

type View = 'main' | 'dev' | 'details' | 'take'

export default function App() {
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [selectedSurveyId, setSelectedSurveyId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [view, setView] = useState<View>('main')
  const [takeUserId, setTakeUserId] = useState<number | null>(null)
  const [takeTargetId, setTakeTargetId] = useState<number | null>(null)

  const loadSurveys = useCallback(async () => {
    const list = await surveyApi.list()
    const mapped = list.map(apiSurveyToSurvey)
    setSurveys(mapped)
    setSelectedSurveyId((prev) => {
      if (prev !== null && mapped.some((s) => s.id === prev)) return prev
      return mapped[0]?.id ?? null
    })
  }, [])

  useEffect(() => {
    loadSurveys().catch(console.error).finally(() => setLoading(false))
  }, [loadSurveys])

  const filteredSurveys = searchQuery.trim()
    ? surveys.filter(
        (s) =>
          s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.description.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : surveys

  const handleOpenDev = () => setView('dev')

  const handleOpenDetails = () => setView('details')

  const handleOpenTake = () => {
    setTakeUserId(null)
    setTakeTargetId(null)
    setView('take')
  }

  const handleBack = () => {
    setView('main')
    loadSurveys()
  }

  const handleCreateClick = async () => {
    setCreating(true)
    try {
      const id = await surveyApi.create()
      await loadSurveys()
      setSelectedSurveyId(id)
    } catch (err) {
      console.error(err)
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
        onOpenTake={handleOpenTake}
      />
      <main className="flex-1 overflow-y-auto">
        {view === 'dev' ? (
          <EntitiesPage onBack={handleBack} onOpenSurvey={setSelectedSurveyId} />
        ) : view === 'details' ? (
          <EntityPage id={selectedSurveyId ?? 0} onBack={handleBack} />
        ) : view === 'take' ? (
          selectedSurveyId === null ? (
            <div className="flex items-center justify-center h-full p-6">
              <p className="text-sm text-gray-500">Выберите опрос в боковой панели, чтобы пройти его.</p>
            </div>
          ) : takeUserId === null ? (
            <ParticipantSelect onSelect={setTakeUserId} onBack={handleBack} />
          ) : takeTargetId === null ? (
            <TargetSelect
              surveyId={selectedSurveyId ?? 0}
              userId={takeUserId}
              onSelect={setTakeTargetId}
              onBack={() => setTakeUserId(null)}
            />
          ) : (
            <TakeSurvey
              surveyId={selectedSurveyId ?? 0}
              userId={takeUserId}
              targetId={takeTargetId}
              onBackToUsers={() => setTakeTargetId(null)}
              onBack={handleBack}
            />
          )
        ) : (
          <MainPage surveyId={selectedSurveyId} onSurveyUpdated={loadSurveys} onSurveyDeleted={loadSurveys} />
        )}
      </main>
    </div>
  )
}
