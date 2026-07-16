import { useCallback, useEffect, useState } from 'react'
import { surveyApi } from './api'
import { ConfirmModal } from './components/ConfirmModal'
import { Sidebar } from './components/Sidebar'
import { apiSurveyToSurvey } from './mappers'
import { MainPage } from './pages/MainPage'
import { EntityPage } from './pages/SurveyDetails'
import { TakeSurvey } from './pages/TakeSurvey'
import { openDevPage } from './routing'
import type { Survey } from './types'

type View = 'main' | 'details' | 'take'

export default function App() {
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [selectedSurveyId, setSelectedSurveyId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [view, setView] = useState<View>('main')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
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

  const filteredSurveys = searchQuery.trim()
    ? surveys.filter(
        (s) =>
          s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.description.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : surveys

  const handleOpenDetails = () => setView('details')

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

  const handleDuplicate = async (id: number) => {
    try {
      const newId = await surveyApi.duplicate(id)
      await loadSurveys()
      setSelectedSurveyId(newId)
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
    <div className="flex flex-col h-screen overflow-hidden">
      {!mobileNavOpen && (
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Открыть меню"
          className="fixed top-3 left-3 z-50 rounded-xl bg-white text-[#FF8600] border border-[#FF8600]/20 shadow-lg ring-1 ring-black/5 p-2 cursor-pointer transition hover:bg-orange-50"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      <header className="flex items-center justify-center gap-3 px-4 py-3 bg-[#FF8600] text-white shadow-sm z-20 shrink-0">
        <span className="text-base font-semibold truncate">Опросы 360</span>
      </header>

      <div className="flex flex-1 overflow-hidden">
      <Sidebar
        surveys={filteredSurveys}
        activeSurveyId={selectedSurveyId}
        loading={loading}
        creating={creating}
        onSurveySelect={(id) => setSelectedSurveyId(id)}
        onCreateClick={handleCreateClick}
        onSearch={setSearchQuery}
        onOpenDetails={handleOpenDetails}
        onOpenDev={openDevPage}
        onDuplicate={handleDuplicate}
        onDelete={(id) => setDeletingId(id)}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
        isMobile={true}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />
      <main className="flex-1 overflow-y-auto bg-gray-100">
        {view === 'details' ? (
          <EntityPage id={selectedSurveyId ?? 0} onBack={handleBack} />
        ) : view === 'take' ? (
          selectedSurveyId === null ? (
            <div className="flex items-center justify-center h-full p-6">
              <p className="text-sm text-gray-500">Выберите опрос в боковой панели, чтобы пройти его.</p>
            </div>
          ) : (
            <TakeSurvey surveyId={selectedSurveyId} onBack={handleBack} />
          )
        ) : (
          <MainPage surveyId={selectedSurveyId} onSurveyUpdated={loadSurveys} onSurveyDeleted={loadSurveys} sidebarCollapsed={sidebarCollapsed} />
        )}
      </main>
      </div>

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
