import { useCallback, useEffect, useState } from 'react'
import { surveyApi } from '../api'
import { Sidebar } from '../components/Sidebar'
import { useAuth } from '../context/AuthContext'
import { apiSurveyToSurvey } from '../mappers'
import { openDevPage } from '../routing'
import { TakeSurvey } from './TakeSurvey'
import type { Survey } from '../types'

export function UserApp() {
  const { user } = useAuth()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [selectedSurveyId, setSelectedSurveyId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

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

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        mode="user"
        surveys={filteredSurveys}
        activeSurveyId={selectedSurveyId}
        loading={loading}
        onSurveySelect={setSelectedSurveyId}
        onSearch={setSearchQuery}
        onOpenDev={openDevPage}
      />
      <main className="flex-1 overflow-y-auto">
        {selectedSurveyId === null ? (
          <div className="flex items-center justify-center h-full p-6">
            <div className="text-center max-w-md">
              <p className="text-sm text-gray-500">
                {loading
                  ? 'Загрузка…'
                  : surveys.length === 0
                    ? `У ${user?.name || 'вас'} пока нет назначенных опросов`
                    : 'Выберите опрос в боковой панели'}
              </p>
            </div>
          </div>
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
