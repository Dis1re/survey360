import { useCallback, useEffect, useState } from 'react'
import { surveyApi } from '../api'
import { ConfirmModal } from '../components/ConfirmModal'
import { Sidebar } from '../components/Sidebar'
import { useAuth } from '../context/AuthContext'
import { useIsMobile } from '../hooks/useMediaQuery'
import { useSurveyLive } from '../hooks/useSurveyLive'
import {
  apiSurveyToSurvey,
  isMySurvey,
  isParticipationDone,
  isParticipationPending,
  isParticipationSurvey,
} from '../mappers'
import { openDevPage, setMainPageTabState } from '../routing'
import { MainPage } from './MainPage'
import { TakeSurvey } from './TakeSurvey'
import type { Survey } from '../types'

type SidebarScope = 'mine' | 'participation'

const SELECTED_SURVEY_STORAGE_KEY = 'survey360.selectedSurveyId'
const SIDEBAR_SCOPE_STORAGE_KEY = 'survey360.sidebarScope'

function readStoredSurveyId(): number | null {
  try {
    const raw = sessionStorage.getItem(SELECTED_SURVEY_STORAGE_KEY)
    if (!raw) return null
    const id = Number(raw)
    return Number.isFinite(id) && id > 0 ? id : null
  } catch {
    return null
  }
}

function readStoredSidebarScope(): SidebarScope {
  try {
    const raw = sessionStorage.getItem(SIDEBAR_SCOPE_STORAGE_KEY)
    return raw === 'participation' ? 'participation' : 'mine'
  } catch {
    return 'mine'
  }
}

function resolveScopeForSurvey(survey: Survey, userId: number): SidebarScope {
  if (isParticipationSurvey(survey) && !isMySurvey(survey, userId)) return 'participation'
  if (isMySurvey(survey, userId)) return 'mine'
  if (isParticipationSurvey(survey)) return 'participation'
  return 'mine'
}

function pickDefaultSurvey(
  surveys: Survey[],
  userId: number | null,
): { id: number | null; scope: SidebarScope } {
  if (userId == null) {
    return { id: surveys[0]?.id ?? null, scope: 'mine' }
  }

  const pending = surveys.filter((s) => isParticipationSurvey(s) && isParticipationPending(s))
  if (pending.length > 0) {
    return { id: pending[0].id, scope: 'participation' }
  }

  const activeMine = surveys.filter((s) => isMySurvey(s, userId) && s.status === 'active')
  if (activeMine.length > 0) {
    return { id: activeMine[0].id, scope: 'mine' }
  }

  const doneParticipation = surveys.filter((s) => isParticipationSurvey(s) && isParticipationDone(s))
  if (doneParticipation.length > 0) {
    return { id: doneParticipation[0].id, scope: 'participation' }
  }

  const mine = surveys.filter((s) => isMySurvey(s, userId))
  if (mine.length > 0) {
    return { id: mine[0].id, scope: 'mine' }
  }

  return { id: null, scope: 'mine' }
}

export function UserApp() {
  const { user } = useAuth()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [selectedSurveyId, setSelectedSurveyId] = useState<number | null>(() => readStoredSurveyId())
  const [sidebarScope, setSidebarScope] = useState<SidebarScope>(() => readStoredSidebarScope())
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const isMobile = useIsMobile()
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const loadSurveys = useCallback(async () => {
    const list = await surveyApi.list()
    const mapped = list.map(apiSurveyToSurvey)
    setSurveys(mapped)

    const userId = user?.id ?? null
    setSelectedSurveyId((prev) => {
      if (prev !== null && mapped.some((s) => s.id === prev)) {
        const survey = mapped.find((s) => s.id === prev)!
        if (userId != null) {
          // Owner viewing their survey (incl. after start) → Мои; participant → Участие
          setSidebarScope(resolveScopeForSurvey(survey, userId))
        }
        return prev
      }

      if (prev !== null) {
        try {
          sessionStorage.removeItem(SELECTED_SURVEY_STORAGE_KEY)
        } catch {
          // sessionStorage unavailable
        }
      }

      const pick = pickDefaultSurvey(mapped, userId)
      setSidebarScope(pick.scope)
      return pick.id
    })
  }, [user?.id])

  useEffect(() => {
    setLoading(true)
    loadSurveys().catch(console.error).finally(() => setLoading(false))
  }, [loadSurveys])

  useEffect(() => {
    try {
      if (selectedSurveyId !== null) {
        sessionStorage.setItem(SELECTED_SURVEY_STORAGE_KEY, String(selectedSurveyId))
      } else {
        sessionStorage.removeItem(SELECTED_SURVEY_STORAGE_KEY)
      }
    } catch {
      // sessionStorage unavailable
    }
  }, [selectedSurveyId])

  useEffect(() => {
    try {
      sessionStorage.setItem(SIDEBAR_SCOPE_STORAGE_KEY, sidebarScope)
    } catch {
      // sessionStorage unavailable
    }
  }, [sidebarScope])

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
      // New survey always opens on questionnaire editor; later tab choice is remembered per survey.
      setMainPageTabState(id, 'editor')
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
    <div className="flex h-screen overflow-hidden dark:bg-[#161a22]">
      {isMobile && !mobileNavOpen && (
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Открыть меню"
          className="fixed top-3 left-3 z-50 rounded-xl border border-[#FF6B00] bg-transparent text-[#FF6B00] p-2 cursor-pointer transition hover:bg-[#FF6B00]/10"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}
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
        isMobile={isMobile}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />
      <main className="flex-1 overflow-y-auto pt-14 sm:pt-0">
        {selectedSurveyId === null ? (
          <div className="flex items-center justify-center h-full p-6">
            <div className="text-center max-w-md">
              <p className="text-sm text-gray-500 dark:text-gray-300">
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
            onCompleted={() => {
              void loadSurveys().catch(console.error)
            }}
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
