import { useEffect, useMemo, useRef, useState } from 'react'
import {
  isMySurvey,
  isParticipationDone,
  isParticipationPending,
  isParticipationSurvey,
} from '../mappers'
import type { Survey } from '../types'
import { UserBar } from './UserBar'

type SurveyStatusFilter = Survey['status']
type SurveyScope = 'mine' | 'participation'
type ParticipationFilter = 'pending' | 'done'

const mineStatusFilters: { id: SurveyStatusFilter; label: string }[] = [
  { id: 'draft', label: 'Черновик' },
  { id: 'active', label: 'Активные' },
  { id: 'closed', label: 'Завершенные' },
]

const participationFilters: { id: ParticipationFilter; label: string }[] = [
  { id: 'pending', label: 'К прохождению' },
  { id: 'done', label: 'Пройденные' },
]

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
    dotClass: 'bg-gray-400',
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-600',
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
  showProgress = false,
  highlightPending = false,
}: {
  survey: Survey
  isSelected: boolean
  onSelect: () => void
  showProgress?: boolean
  highlightPending?: boolean
}) {
  const cfg = statusConfig[survey.status]
  const assigned = survey.myAssignedCount ?? 0
  const completed = survey.myCompletedCount ?? 0

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
      className={`sidebar-card p-3 rounded-xl cursor-pointer border ${
        isSelected
          ? 'bg-white border-l-4 border-l-[#FF8600] border-gray-200 shadow-sm'
          : highlightPending
            ? 'bg-white border-l-4 border-l-amber-400 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
            : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className={`text-xs font-semibold ${cfg.textClass} ${cfg.bgClass} px-2 py-0.5 rounded-full flex items-center gap-1`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />
          {cfg.label}
        </span>
        <span className="text-xs text-gray-400">{survey.date}</span>
      </div>
      <h4
        className={`font-medium text-sm truncate ${
          isSelected ? 'text-gray-900' : 'text-gray-700'
        }`}
      >
        {survey.title}
      </h4>
      {showProgress && assigned > 0 ? (
        <p className="text-xs text-gray-500 truncate mt-0.5">
          {completed} из {assigned} оценок
        </p>
      ) : (
        <p className="text-xs text-gray-500 truncate mt-0.5">{survey.description}</p>
      )}
    </div>
  )
}

function SurveyMiniCard({
  survey,
  isSelected,
  onSelect,
  showProgress = false,
}: {
  survey: Survey
  isSelected: boolean
  onSelect: () => void
  showProgress?: boolean
}) {
  const cfg = statusConfig[survey.status]
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
          ? 'bg-white border-2 border-[#FF8600] text-orange-700 shadow-sm'
          : 'hover:bg-gray-50 border border-gray-200 text-gray-600'
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
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
}: SidebarProps) {
  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState(false)
  const [internalScope, setInternalScope] = useState<SurveyScope>('mine')
  const [statusFilter, setStatusFilter] = useState<SurveyStatusFilter>('active')
  const [participationFilter, setParticipationFilter] = useState<ParticipationFilter>('pending')
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
      return scopedSurveys.filter((s) => s.status === statusFilter)
    }
    if (scope === 'mine') {
      return scopedSurveys.filter((s) => s.status === statusFilter)
    }
    return scopedSurveys.filter((s) =>
      participationFilter === 'pending' ? isParticipationPending(s) : isParticipationDone(s),
    )
  }, [scopedSurveys, scope, statusFilter, participationFilter, hasUserScope])

  useEffect(() => {
    if (!hasUserScope || loading || initialDefaultApplied.current) return
    if (surveys.length === 0) {
      initialDefaultApplied.current = true
      return
    }

    const pending = surveys.filter((s) => isParticipationSurvey(s) && isParticipationPending(s))

    if (pending.length > 0) {
      setScope('participation')
      setParticipationFilter('pending')
    } else {
      setScope('mine')
      setStatusFilter('active')
    }

    initialDefaultApplied.current = true
  }, [loading, surveys, currentUserId, hasUserScope])

  useEffect(() => {
    if (!hasUserScope || activeSurveyId === null) return
    const selected = surveys.find((s) => s.id === activeSurveyId)
    if (!selected) return

    if (scope === 'participation' && isParticipationSurvey(selected)) {
      setParticipationFilter(isParticipationDone(selected) ? 'done' : 'pending')
    } else if (scope === 'mine' && isMySurvey(selected, currentUserId!)) {
      setStatusFilter(selected.status)
    }
  }, [activeSurveyId, surveys, currentUserId, hasUserScope, scope])

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
    <aside className={`flex flex-col flex-shrink-0 h-screen transition-[width] duration-300 ease-out ${collapsed ? 'w-20' : 'w-80'}`}>
      <div
        className={`flex bg-white border-b border-gray-100 ${
          collapsed ? 'flex-col items-center gap-2 p-3' : 'items-center justify-between gap-3 p-4'
        }`}
      >
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="shrink-0 rounded-xl border border-gray-200 bg-gray-100 text-gray-700 transition p-2 cursor-pointer hover:bg-gray-200"
          aria-label={collapsed ? 'Показать боковую панель' : 'Скрыть боковую панель'}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {collapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4m11-7 5 7-5 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16M9 5l-5 7 5 7" />
            )}
          </svg>
        </button>

        {!collapsed ? (
          <>
            <div className="flex items-center gap-2 min-w-0">
              <img
                src="/Survey360Logo.webp"
                alt=""
                className="w-12 h-12 object-contain shrink-0"
              />
              <div className="text-base font-semibold text-gray-900 truncate">Опросы 360</div>
            </div>

            <div className="flex items-center gap-1 ml-auto">
              <UserBar compact />
              {onOpenDetails && (
                <button
                  type="button"
                  onClick={onOpenDetails}
                  title="Детали опроса"
                  aria-label="Детали опроса"
                  className="shrink-0 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition p-1.5 cursor-pointer"
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
                  className="shrink-0 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition p-1.5 cursor-pointer"
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
            {onOpenDev && (
              <button
                type="button"
                onClick={onOpenDev}
                title="База данных"
                aria-label="База данных"
                className="shrink-0 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition p-2 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </button>
            )}
          </>
        )}
      </div>

      {!collapsed && (
        <div className="p-4 border-b border-gray-100 space-y-3">
          {hasUserScope && (
            <div className="flex gap-1 p-0.5 bg-gray-100 rounded-lg">
              <button
                type="button"
                onClick={() => setScope('mine')}
                aria-pressed={scope === 'mine'}
                className={`flex-1 py-2 text-xs font-semibold rounded-md transition cursor-pointer ${
                  scope === 'mine'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
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
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
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
                    setParticipationFilter(id as ParticipationFilter)
                  } else {
                    setStatusFilter(id as SurveyStatusFilter)
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
              className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                onSearch(e.target.value)
              }}
            />
            <svg
              className="w-4 h-4 text-gray-400 absolute left-3 top-2.5"
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
              ? `participation-${participationFilter}-${collapsed}`
              : `mine-${statusFilter}-${collapsed}`
          }
          className="space-y-1 view-fade"
        >
          {loading ? (
            <p className={`py-2 text-sm text-gray-400 ${collapsed ? 'text-center' : 'px-3'}`}>
              {collapsed ? '…' : 'Загрузка…'}
            </p>
          ) : filteredSurveys.length === 0 ? (
            !collapsed && <p className="px-3 py-2 text-sm text-gray-400">{emptyMessage}</p>
          ) : collapsed ? (
            filteredSurveys.map((survey) => (
              <SurveyMiniCard
                key={survey.id}
                survey={survey}
                isSelected={survey.id === activeSurveyId}
                onSelect={() => onSurveySelect(survey.id, scope)}
                showProgress={showProgress}
              />
            ))
          ) : (
            filteredSurveys.map((survey) => (
              <SurveyCard
                key={survey.id}
                survey={survey}
                isSelected={survey.id === activeSurveyId}
                onSelect={() => onSurveySelect(survey.id, scope)}
                showProgress={showProgress}
                highlightPending={
                  showProgress &&
                  participationFilter === 'pending' &&
                  isParticipationPending(survey)
                }
              />
            ))
          )}
        </div>
      </div>

      {showCreateButton && !collapsed && (
        <div className="p-4 border-t border-gray-100">
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

      {showCreateButton && collapsed && (
        <div className="p-3 border-t border-gray-100">
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
  )
}
