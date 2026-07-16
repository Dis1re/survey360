import { useCallback, useEffect, useState } from 'react'
import { surveyApi } from '../api'
import { ConfirmModal } from '../components/ConfirmModal'
import { Sidebar } from '../components/Sidebar'
import { useAuth } from '../context/AuthContext'
import { useSurveyLive } from '../hooks/useSurveyLive'
import { apiSurveyToSurvey, isMySurvey } from '../mappers'
import { openDevPage } from '../routing'
import { MainPage } from './MainPage'
import { TakeSurvey } from './TakeSurvey'
import type { Survey } from '../types'

type SidebarScope = 'mine' | 'participation'

export function UserApp() {
  const { user } = useAuth()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [selectedSurveyId, setSelectedSurveyId] = useState<number | null>(null)
  const [sidebarScope, setSidebarScope] = useState<SidebarScope>('mine')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

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

  // One place: live event → refresh survey list (sidebar status/progress).
  useSurveyLive(() => {
    void loadSurveys().catch(console.error)
  })

  const filteredSurveys = searchQuery.trim()
    ? surveys.filter(
        (s) =>
          s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.description.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : surveys

  const selectedSurvey =
    selectedSurveyId !== null ? surveys.find((s) => s.id === selectedSurveyId) ?? null : null

  const isMySelectedSurvey =
    selectedSurvey !== null && user !== null && isMySurvey(selectedSurvey, user.id)

  const showEditor = isMySelectedSurvey && sidebarScope === 'mine'

  const handleCreateClick = async () => {
    setCreating(true)
    try {
      const id = await surveyApi.create()
      await loadSurveys()
      setSelectedSurveyId(id)
      setSidebarScope('mine')
    } catch (err) {
      console.error(err)
    } finally {
      setCreating(false)
    }
  }

  // Remount open page when list status changes (e.g. Активен → Завершен).
  const openPageKey = `${selectedSurveyId ?? 'none'}-${selectedSurvey?.status ?? ''}`

  const handleDuplicate = async (id: number) => {
    try {
      const newId = await surveyApi.duplicate(id)
      await loadSurveys()
      setSelectedSurveyId(newId)
      setSidebarScope('mine')
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteConfirm = async () => {
    if (deletingId === null) return
    try {
      await surveyApi.delete(deletingId)
      setDeletingId(null)
      await loadSurveys()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        surveys={filteredSurveys}
        activeSurveyId={selectedSurveyId}
        currentUserId={user?.id ?? null}
        scope={sidebarScope}
        onScopeChange={setSidebarScope}
        loading={loading}
        creating={creating}
        onSurveySelect={(id, scope) => {
          setSelectedSurveyId(id)
          if (scope) setSidebarScope(scope)
        }}
        onCreateClick={handleCreateClick}
        onSearch={setSearchQuery}
        onOpenDev={user?.isAdmin ? openDevPage : undefined}
        onDuplicate={handleDuplicate}
        onDelete={(id) => setDeletingId(id)}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
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
        ) : showEditor ? (
          <MainPage
            key={openPageKey}
            surveyId={selectedSurveyId}
            onSurveyUpdated={loadSurveys}
            onSurveyDeleted={loadSurveys}
            sidebarCollapsed={sidebarCollapsed}
          />
        ) : (
          <TakeSurvey
            key={openPageKey}
            surveyId={selectedSurveyId}
            authUserId={user?.id ?? null}
            hideUserSwitch
          />
        )}
      </main>

      {deletingId !== null && (
        <ConfirmModal
          title="Удалить опрос?"
          variant="danger"
          confirmLabel="Удалить"
          message="Опрос и все его ответы будут безвозвратно удалены. Действие нельзя отменить."
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeletingId(null)}
        />
      )}
    </div>
  )
}
