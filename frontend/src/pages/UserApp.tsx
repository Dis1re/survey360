import { useCallback, useEffect, useState } from 'react'
import { surveyApi } from '../api'
import { Sidebar } from '../components/Sidebar'
import { useAuth } from '../context/AuthContext'
import { apiSurveyToSurvey } from '../mappers'
import { openDevPage } from '../routing'
import { MainPage } from './MainPage'
import { TakeSurvey } from './TakeSurvey'
import type { Survey } from '../types'

export function UserApp() {
  const { user } = useAuth()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [selectedSurveyId, setSelectedSurveyId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

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

  const selectedSurvey =
    selectedSurveyId !== null ? surveys.find((s) => s.id === selectedSurveyId) ?? null : null

  const isSurveyCreator =
    selectedSurvey !== null &&
    user !== null &&
    selectedSurvey.createdByUserId === user.id

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
        onOpenDev={user?.isAdmin ? openDevPage : undefined}
      />
      <main className="flex-1 overflow-y-auto">
        {selectedSurveyId === null ? (
          <div className="flex items-center justify-center h-full p-6">
            <div className="text-center max-w-md">
              <p className="text-sm text-gray-500">
                {loading
                  ? 'Загрузка…'
                  : surveys.length === 0
                    ? 'У вас пока нет опросов — создайте первый'
                    : 'Выберите опрос в боковой панели'}
              </p>
            </div>
          </div>
        ) : isSurveyCreator || selectedSurvey?.status === 'draft' ? (
          <MainPage
            surveyId={selectedSurveyId}
            onSurveyUpdated={loadSurveys}
            onSurveyDeleted={loadSurveys}
          />
        ) : (
          <TakeSurvey
            surveyId={selectedSurveyId}
            authUserId={user?.id ?? null}
            hideUserSwitch
          />
        )}
      </main>
    </div>
  )
}
