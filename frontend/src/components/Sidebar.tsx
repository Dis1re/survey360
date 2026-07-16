import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  isMySurvey,
  isParticipationDone,
  isParticipationPending,
  isParticipationSurvey,
} from '../mappers'
import type { Survey } from '../types'
import { UserBar } from './UserBar'
import { ThemeToggle } from './ThemeToggle'

type SurveyStatusFilter = Survey['status'] | null
type SurveyScope = 'mine' | 'participation'
type ParticipationFilter = 'pending' | 'done' | null

const mineStatusFilters: { id: SurveyStatusFilter; label: string }[] = [
  { id: 'draft', label: 'Черновик' },
  { id: 'active', label: 'Активные' },
  { id: 'closed', label: 'Завершенные' },
]

const participationFilters: { id: ParticipationFilter; label: string }[] = [
  { id: 'pending', label: 'К прохождению' },
  { id: 'done', label: 'Пройденные' },
]

export const SIDEBAR_WIDTH_COLLAPSED = 80
export const SIDEBAR_WIDTH_EXPANDED = 320

interface SidebarProps {
  surveys: Survey[]
  activeSurveyId: number | null
  currentUserId?: number | null
  scope?: SurveyScope
  onScopeChange?: (scope: SurveyScope) => void
  loading?: boolean
  creating?: boolean
  onSurveySelect: (id: number, scope?: SurveyScope) => void
  onCreateClick?: () => void
  onSearch: (query: string) => void
  onOpenDev?: () => void
  onOpenDetails?: () => void
  onDuplicate?: (id: number) => void
  onDelete?: (id: number) => void
  collapsed: boolean
  onToggleCollapsed: () => void
  /** Whether the viewport is in mobile (drawer) mode. */
  isMobile?: boolean
  /** Mobile drawer open state (ignored on >=md screens) */
  mobileOpen?: boolean
  /** Close the mobile drawer */
  onCloseMobile?: () => void
}

const statusConfig = {
  active: {
    label: 'Активен',
    dotClass: 'bg-green-500',
    bgClass: 'bg-green-50',
    textClass: 'text-green-700',
  },
  draft: {
    label: 'Черновик',
    dotClass: 'bg-gray-400 dark:bg-[#3a4250]',
    bgClass: 'bg-gray-100 dark:bg-[#303a48]',
    textClass: 'text-gray-600 dark:text-gray-400',
  },
  closed: {
    label: 'Завершен',
    dotClass: 'bg-red-500',
    bgClass: 'bg-red-50',
    textClass: 'text-red-700',
  },
}

function getSurveyInitial(title: string) {
  const trimmed = title.trim()
  if (!trimmed) return '?'
  const words = trimmed.split(/\s+/).filter(Boolean)
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  return trimmed.slice(0, 2).toUpperCase()
}

function SurveyCard({
  survey,
  isSelected,
  onSelect,
  onDuplicate,
  onDelete,
  showProgress = false,
  highlightPending = false,
  completedAll = false,
}: {
  survey: Survey
  isSelected: boolean
  onSelect: () => void
  onDuplicate?: () => void
  onDelete?: () => void
  showProgress?: boolean
  highlightPending?: boolean
  completedAll?: boolean
}) {
  const cfg = completedAll && survey.status === 'active'
    ? { label: 'Активен', dotClass: 'bg-amber-400', bgClass: 'bg-amber-50', textClass: 'text-amber-700' }
    : statusConfig[survey.status]
  const assigned = survey.myAssignedCount ?? 0
  const completed = survey.myCompletedCount ?? 0
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      className={`sidebar-card relative p-3 rounded-xl cursor-pointer border ${
        isSelected
          ? 'bg-white dark:bg-[#1e222e] border-l-4 border-l-[#FF8600] border-gray-200 dark:border-[#3a4250] shadow-sm'
          : highlightPending
            ? 'bg-white dark:bg-[#1e222e] border-l-4 border-l-amber-400 border-gray-200 dark:border-[#3a4250] hover:bg-gray-50 dark:hover:bg-[#262d3a] hover:border-gray-300 dark:hover:border-[#3a4250]'
            : 'bg-white dark:bg-[#1e222e] border-gray-200 dark:border-[#3a4250] hover:bg-gray-50 dark:hover:bg-[#262d3a] hover:border-gray-300 dark:hover:border-[#3a4250]'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className={`text-xs font-semibold ${cfg.textClass} ${cfg.bgClass} px-2 py-0.5 rounded-full flex items-center gap-1`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />
          {cfg.label}
        </span>
          <span className="text-xs text-gray-400 dark:text-gray-400">{survey.date}</span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4
            className={`font-medium text-sm truncate ${
              isSelected ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-200'
            }`}
          >
            {survey.title}
          </h4>
          {showProgress && assigned > 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
              {completed} из {assigned} оценок
            </p>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{survey.description}</p>
          )}
        </div>
        {(onDuplicate || onDelete) && (
          <div className="shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                if (menuOpen) {
                  setMenuOpen(false)
                } else {
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                  setMenuPos({ top: rect.bottom + 4, left: rect.right - 140 })
                  setMenuOpen(true)
                }
              }}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
              aria-label="Ещё"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                <circle cx="8" cy="3" r="1.5" />
                <circle cx="8" cy="8" r="1.5" />
                <circle cx="8" cy="13" r="1.5" />
              </svg>
            </button>
          </div>
        )}
        {menuOpen && createPortal(
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div
              className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[140px]"
              style={{ top: menuPos.top, left: menuPos.left }}
            >
              {onDuplicate && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuOpen(false)
                    onDuplicate()
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Дублировать
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuOpen(false)
                    onDelete()
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
                >
                  Удалить
                </button>
              )}
            </div>
          </>,
          document.body,
        )}
      </div>
    </div>
  )
}

function SurveyMiniCard({
  survey,
  isSelected,
  onSelect,
  showProgress = false,
  completedAll = false,
}: {
  survey: Survey
  isSelected: boolean
  onSelect: () => void
  showProgress?: boolean
  completedAll?: boolean
}) {
  const cfg = completedAll && survey.status === 'active'
    ? { label: 'Активен', dotClass: 'bg-amber-400', bgClass: 'bg-amber-50', textClass: 'text-amber-700' }
    : statusConfig[survey.status]
  const initial = getSurveyInitial(survey.title)
  const assigned = survey.myAssignedCount ?? 0
  const completed = survey.myCompletedCount ?? 0
  const progressLabel =
    showProgress && assigned > 0 ? ` · ${completed}/${assigned}` : ''

  return (
    <button
      type="button"
      onClick={onSelect}
      title={`${survey.title} · ${cfg.label}${progressLabel}`}
      aria-label={`${survey.title}, ${cfg.label}${progressLabel}`}
      aria-current={isSelected ? 'true' : undefined}
      className={`sidebar-card relative w-full aspect-square rounded-xl flex items-center justify-center cursor-pointer ${
        isSelected
          ? 'bg-white dark:bg-[#1e222e] border-2 border-[#FF8600] text-orange-700 dark:text-orange-400 shadow-sm'
          : 'hover:bg-gray-50 dark:hover:bg-[#262d3a] border border-gray-200 dark:border-[#3a4250] text-gray-600 dark:text-gray-300'
      }`}
    >
      <span
        className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${cfg.dotClass}`}
        aria-hidden="true"
      />
      <span className="text-xs font-semibold leading-none">{initial}</span>
    </button>
  )
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`soft-press flex-1 py-1.5 text-xs font-medium rounded-lg cursor-pointer ${
        active
          ? 'bg-[#FF8600] text-white shadow-sm'
          : 'bg-gray-100 dark:bg-[#303a48] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#454f60]'
      }`}
    >
      {children}
    </button>
  )
}

export function Sidebar({
  surveys,
  activeSurveyId,
  currentUserId = null,
  scope: scopeProp,
  onScopeChange,
  loading = false,
  creating = false,
  onSurveySelect,
  onCreateClick,
  onSearch,
  onOpenDev,
  onOpenDetails,
  onDuplicate,
  onDelete,
  collapsed,
  onToggleCollapsed,
  isMobile = false,
  mobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const showCollapsed = collapsed && !isMobile

  const handleSelect = (id: number, sc?: SurveyScope) => {
    onSurveySelect(id, sc)
    if (isMobile) onCloseMobile?.()
  }

  const [query, setQuery] = useState('')
  const [internalScope, setInternalScope] = useState<SurveyScope>('mine')
  const [statusFilter, setStatusFilter] = useState<SurveyStatusFilter>(null)
  const [participationFilter, setParticipationFilter] = useState<ParticipationFilter>(null)
  const initialDefaultApplied = useRef(false)

  const hasUserScope = currentUserId != null
  const scope = scopeProp ?? internalScope

  const setScope = (next: SurveyScope) => {
    onScopeChange?.(next)
    if (scopeProp === undefined) setInternalScope(next)
  }

  const pendingParticipationCount = useMemo(() => {
    if (!hasUserScope) return 0
    return surveys.filter((s) => isParticipationSurvey(s) && isParticipationPending(s)).length
  }, [surveys, hasUserScope])

  const scopedSurveys = useMemo(() => {
    if (!hasUserScope) return surveys
    if (scope === 'mine') {
      return surveys.filter((s) => isMySurvey(s, currentUserId!))
    }
    return surveys.filter((s) => isParticipationSurvey(s))
  }, [surveys, scope, currentUserId, hasUserScope])

  const filteredSurveys = useMemo(() => {
    if (!hasUserScope) {
      return statusFilter === null ? scopedSurveys : scopedSurveys.filter((s) => s.status === statusFilter)
    }
    if (scope === 'mine') {
      return statusFilter === null ? scopedSurveys : scopedSurveys.filter((s) => s.status === statusFilter)
    }
    if (participationFilter === null) return scopedSurveys
    return scopedSurveys.filter((s) =>
      participationFilter === 'pending' ? isParticipationPending(s) : isParticipationDone(s),
    )
  }, [scopedSurveys, scope, statusFilter, participationFilter, hasUserScope])

  useEffect(() => {
    if (!hasUserScope || loading || initialDefaultApplied.current) return
    const pending = surveys.filter((s) => isParticipationSurvey(s) && isParticipationPending(s))

    if (pending.length > 0) {
      setScope('participation')
    } else {
      setScope('mine')
    }
    setStatusFilter(null)
    setParticipationFilter(null)

    initialDefaultApplied.current = true
  }, [loading, surveys, currentUserId, hasUserScope])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(query)
  }

  const emptyMessage = (() => {
    if (surveys.length === 0) return 'Опросов пока нет'
    if (!hasUserScope) return 'Нет опросов в этой категории'
    if (scope === 'mine') return 'Нет опросов в этой категории'
    return participationFilter === 'pending'
      ? 'Нет опросов к прохождению'
      : 'Нет пройденных опросов'
  })()

  const showCreateButton = onCreateClick && (!hasUserScope || scope === 'mine')
  const showProgress = hasUserScope && scope === 'participation'

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}
      <aside
      className={`flex flex-col flex-shrink-0 h-full bg-white dark:bg-[#1e222e] transition-[width,transform] duration-300 ease-out z-40 ${
        isMobile
          ? `fixed inset-y-0 left-0 w-[84%] max-w-sm shadow-xl ${
              mobileOpen ? 'translate-x-0' : '-translate-x-full'
            }`
          : `${showCollapsed ? 'w-20' : 'w-80'}`
      }`}
    >
      <div
        className={`flex bg-white dark:bg-[#1e222e] border-b border-gray-100 dark:border-[#303a48] ${
          showCollapsed ? 'flex-col items-center gap-2 p-3' : 'items-center justify-between gap-3 p-4'
        }`}
      >
        <button
          type="button"
          onClick={isMobile ? onCloseMobile : onToggleCollapsed}
          className="inline-flex shrink-0 items-center justify-center rounded-xl border border-gray-200 dark:border-[#3a4250] bg-gray-100 dark:bg-[#303a48] text-gray-700 dark:text-gray-200 transition p-2 cursor-pointer hover:bg-gray-200 dark:hover:bg-[#454f60]"
          aria-label={
            isMobile
              ? 'Закрыть боковую панель'
              : showCollapsed
                ? 'Показать боковую панель'
                : 'Скрыть боковую панель'
          }
        >
          {isMobile ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : showCollapsed ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4m11-7 5 7-5 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16M9 5l-5 7 5 7" />
            </svg>
          )}
        </button>

        {!showCollapsed ? (
          <>
            <div className="flex items-center gap-2 min-w-0">
              <img
                src="/Survey360Logo.webp"
                alt=""
                className="w-12 h-12 object-contain shrink-0"
              />
            </div>

            <div className="flex items-center gap-1 ml-auto">
              <ThemeToggle />
              <UserBar compact />
              {onOpenDetails && (
                <button
                  type="button"
                  onClick={onOpenDetails}
                  title="Детали опроса"
                  aria-label="Детали опроса"
                  className="shrink-0 rounded-xl border border-gray-200 dark:border-[#3a4250] bg-white dark:bg-[#1e222e] hover:bg-gray-50 dark:hover:bg-[#262d3a] text-gray-600 dark:text-gray-300 transition p-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              )}
              {onOpenDev && (
                <button
                  type="button"
                  onClick={onOpenDev}
                  title="База данных"
                  aria-label="База данных"
                  className="shrink-0 rounded-xl border border-gray-200 dark:border-[#3a4250] bg-white dark:bg-[#1e222e] hover:bg-gray-50 dark:hover:bg-[#262d3a] text-gray-600 dark:text-gray-300 transition p-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <UserBar stacked />
            <ThemeToggle />
            {onOpenDev && (
              <button
                type="button"
                onClick={onOpenDev}
                title="База данных"
                aria-label="База данных"
                  className="shrink-0 rounded-xl border border-gray-200 dark:border-[#3a4250] bg-white dark:bg-[#1e222e] hover:bg-gray-50 dark:hover:bg-[#262d3a] text-gray-600 dark:text-gray-300 transition p-2 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </button>
            )}
          </>
        )}
      </div>

      {!showCollapsed && (
        <div className="p-4 border-b border-gray-100 dark:border-[#303a48] space-y-3">
          {hasUserScope && (
              <div className="flex gap-1 p-0.5 bg-gray-100 dark:bg-[#303a48] rounded-lg">
              <button
                type="button"
                onClick={() => setScope('mine')}
                aria-pressed={scope === 'mine'}
                className={`flex-1 py-2 text-xs font-semibold rounded-md transition cursor-pointer ${
                  scope === 'mine'
                    ? 'bg-white dark:bg-[#1e222e] text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                Мои опросы
              </button>
              <button
                type="button"
                onClick={() => setScope('participation')}
                aria-pressed={scope === 'participation'}
                className={`flex-1 py-2 text-xs font-semibold rounded-md transition cursor-pointer ${
                  scope === 'participation'
                    ? 'bg-white dark:bg-[#1e222e] text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                Участие
                {pendingParticipationCount > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center min-w-[1.125rem] h-[1.125rem] px-1 rounded-full bg-[#FF8600] text-white text-[10px] leading-none">
                    {pendingParticipationCount}
                  </span>
                )}
              </button>
            </div>
          )}

          <div className="flex gap-1">
            {(!hasUserScope || scope === 'mine'
              ? mineStatusFilters
              : participationFilters
            ).map(({ id, label }) => (
              <FilterButton
                key={id}
                active={
                  hasUserScope && scope === 'participation'
                    ? participationFilter === id
                    : statusFilter === id
                }
                onClick={() => {
                  if (hasUserScope && scope === 'participation') {
                    setParticipationFilter(participationFilter === id ? null : (id as ParticipationFilter))
                  } else {
                    setStatusFilter(statusFilter === id ? null : (id as SurveyStatusFilter))
                  }
                }}
              >
                {label}
              </FilterButton>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="relative">
            <input
              type="text"
              placeholder="Поиск опроса..."
              className="w-full bg-gray-50 dark:bg-[#161a22] border border-gray-200 dark:border-[#3a4250] rounded-lg pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-[#FF8600] dark:text-gray-200"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                onSearch(e.target.value)
              }}
            />
            <svg
              className="w-4 h-4 text-gray-400 dark:text-gray-400 absolute left-3 top-2.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
              />
            </svg>
          </form>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2">
        <div
          key={
            hasUserScope && scope === 'participation'
              ? `participation-${participationFilter}-${showCollapsed}`
              : `mine-${statusFilter}-${showCollapsed}`
          }
          className="space-y-1 view-fade"
        >
          {loading ? (
            <p className={`py-2 text-sm text-gray-400 dark:text-gray-500 ${showCollapsed ? 'text-center' : 'px-3'}`}>
              {showCollapsed ? '…' : 'Загрузка…'}
            </p>
          ) : filteredSurveys.length === 0 ? (
            !showCollapsed && <p className="px-3 py-2 text-sm text-gray-400 dark:text-gray-400">{emptyMessage}</p>
          ) : showCollapsed ? (
            filteredSurveys.map((survey) => {
              const allDone = showProgress && survey.status === 'active'
                && (survey.myCompletedCount ?? 0) >= (survey.myAssignedCount ?? 0)
                && (survey.myAssignedCount ?? 0) > 0
              return (
              <SurveyMiniCard
                key={survey.id}
                survey={survey}
                isSelected={survey.id === activeSurveyId}
                onSelect={() => handleSelect(survey.id, scope)}
                showProgress={showProgress}
                completedAll={allDone}
              />
              )
            })
          ) : (
            filteredSurveys.map((survey) => {
              const allDone = showProgress && survey.status === 'active'
                && (survey.myCompletedCount ?? 0) >= (survey.myAssignedCount ?? 0)
                && (survey.myAssignedCount ?? 0) > 0
              return (
              <SurveyCard
                key={survey.id}
                survey={survey}
                isSelected={survey.id === activeSurveyId}
                onSelect={() => handleSelect(survey.id, scope)}
                onDuplicate={onDuplicate && scope === 'mine' ? () => onDuplicate(survey.id) : undefined}
                onDelete={onDelete && scope === 'mine' ? () => onDelete(survey.id) : undefined}
                showProgress={showProgress}
                completedAll={allDone}
                highlightPending={
                  showProgress &&
                  participationFilter === 'pending' &&
                  isParticipationPending(survey)
                }
              />
              )
            })
          )}
        </div>
      </div>

      {showCreateButton && !showCollapsed && (
        <div className="p-4 border-t border-gray-100 dark:border-[#303a48]">
          <button
            onClick={onCreateClick}
            disabled={creating}
            className="w-full bg-[#FF8600] hover:bg-[#FF6B00] disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-xl soft-press flex items-center justify-center gap-2 text-sm shadow-sm cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {creating ? 'Создание…' : 'Создать опрос'}
          </button>
        </div>
      )}

      {showCreateButton && showCollapsed && (
        <div className="p-3 border-t border-gray-100 dark:border-[#303a48]">
          <button
            onClick={onCreateClick}
            disabled={creating}
            className="w-full bg-[#FF8600] hover:bg-[#FF6B00] disabled:opacity-50 text-white font-medium py-2 px-3 rounded-xl soft-press flex items-center justify-center gap-2 text-sm shadow-sm cursor-pointer"
            aria-label="Создать опрос"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      )}
    </aside>
    </>
  )
}
