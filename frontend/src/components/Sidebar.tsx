import { useState } from 'react'
import type { Survey } from '../types'

interface SidebarProps {
  surveys: Survey[]
  activeSurveyId: number | null
  loading?: boolean
  creating?: boolean
  onSurveySelect: (id: number) => void
  onCreateClick: () => void
  onSearch: (query: string) => void
  onOpenDev: () => void
  onOpenDetails: () => void
  onOpenTake: () => void
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
}: {
  survey: Survey
  isSelected: boolean
  onSelect: () => void
}) {
  const cfg = statusConfig[survey.status]

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
      className={`p-3 rounded-xl cursor-pointer transition border ${
        isSelected
          ? 'bg-white border-l-4 border-l-[#FF8600] border-gray-200 shadow-sm'
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
      <p className="text-xs text-gray-500 truncate mt-0.5">{survey.description}</p>
    </div>
  )
}

function SurveyMiniCard({
  survey,
  isSelected,
  onSelect,
}: {
  survey: Survey
  isSelected: boolean
  onSelect: () => void
}) {
  const cfg = statusConfig[survey.status]
  const initial = getSurveyInitial(survey.title)

  return (
    <button
      type="button"
      onClick={onSelect}
      title={`${survey.title} · ${cfg.label}`}
      aria-label={`${survey.title}, ${cfg.label}`}
      aria-current={isSelected ? 'true' : undefined}
      className={`relative w-full aspect-square rounded-xl flex items-center justify-center transition cursor-pointer ${
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

export function Sidebar({
  surveys,
  activeSurveyId,
  loading = false,
  creating = false,
  onSurveySelect,
  onCreateClick,
  onSearch,
  onOpenDev,
  onOpenDetails,
  onOpenTake,
}: SidebarProps) {
  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState(false)


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(query)
  }

  return (
    <aside className={`flex flex-col flex-shrink-0 h-screen ${collapsed ? 'w-20' : 'w-80'}`}>
      <div className="p-4 flex items-center justify-between gap-3 bg-white border-b border-gray-100">
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
            
            {/* TEMP: FOR DEBUGGING */}
            <div className="flex items-center gap-1 ml-auto">
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
              <button
                type="button"
                onClick={onOpenDev}
                title="Dev-страница"
                aria-label="Dev-страница"
                className="shrink-0 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition p-1.5 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </button>
            </div>
          </>
        ) : null}
      </div>

      {!collapsed && (
        <div className="p-4 border-b border-gray-100">
          <form onSubmit={handleSubmit} className="mt-3 relative">
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

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading ? (
          <p className={`py-2 text-sm text-gray-400 ${collapsed ? 'text-center' : 'px-3'}`}>
            {collapsed ? '…' : 'Загрузка…'}
          </p>
        ) : surveys.length === 0 ? (
          !collapsed && <p className="px-3 py-2 text-sm text-gray-400">Опросов пока нет</p>
        ) : collapsed ? (
          surveys.map((survey) => (
            <SurveyMiniCard
              key={survey.id}
              survey={survey}
              isSelected={survey.id === activeSurveyId}
              onSelect={() => onSurveySelect(survey.id)}
            />
          ))
        ) : (
          surveys.map((survey) => (
            <SurveyCard
              key={survey.id}
              survey={survey}
              isSelected={survey.id === activeSurveyId}
              onSelect={() => onSurveySelect(survey.id)}
            />
          ))
        )}
      </div>

      {/* Create button pinned to bottom, orange + can hide with sidebar collapse */}
      {!collapsed && (
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={onCreateClick}
            disabled={creating}
            className="w-full bg-[#FF8600] hover:bg-[#FF6B00] disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-sm cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {creating ? 'Создание…' : 'Создать опрос'}
          </button>
        </div>
      )}

      {collapsed && (
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={onCreateClick}
            disabled={creating}
            className="w-full bg-[#FF8600] hover:bg-[#FF6B00] disabled:opacity-50 text-white font-medium py-2 px-3 rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-sm cursor-pointer"
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

