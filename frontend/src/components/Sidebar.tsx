import { useState } from 'react'
import type { Survey } from '../types'

interface SidebarProps {
  surveys: Survey[]
  onCreateClick: () => void
  onSearch: (query: string) => void
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

function SurveyCard({ survey, isActive }: { survey: Survey; isActive: boolean }) {
  const cfg = statusConfig[survey.status]

  return (
    <div
      className={`p-3 rounded-xl cursor-pointer transition ${
        isActive
          ? 'bg-blue-50/60 border border-blue-100'
          : 'hover:bg-gray-50 border border-transparent'
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
          isActive ? 'text-gray-900' : 'text-gray-700'
        }`}
      >
        {survey.title}
      </h4>
      <p className="text-xs text-gray-500 truncate mt-0.5">{survey.description}</p>
    </div>
  )
}

export function Sidebar({ surveys, onCreateClick, onSearch }: SidebarProps) {
  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState(false)


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(query)
  }

  return (
    <aside className={`bg-white border-r border-gray-200 flex flex-col flex-shrink-0 h-screen ${collapsed ? 'w-20' : 'w-80'}`}>
      <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="shrink-0 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition p-2 cursor-pointer"
          aria-label={collapsed ? 'Показать боковую панель' : 'Скрыть боковую панель'}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {collapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16M9 5l-5 7 5 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4m11-7 5 7-5 7" />
            )}
          </svg>
        </button>

        {!collapsed && (
          <div className="text-sm font-semibold text-gray-900">Опросы</div>
        )}
      </div>

      {!collapsed && (
        <div className="p-4 border-b border-gray-100">
          <form onSubmit={handleSubmit} className="mt-3 relative">
            <input
              type="text"
              placeholder="Поиск опроса..."
              className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
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

      {!collapsed ? (
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {surveys.map((survey) => (
            <SurveyCard key={survey.id} survey={survey} isActive={survey.status === 'active'} />
          ))}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto" />
      )}

      {/* Create button pinned to bottom, orange + can hide with sidebar collapse */}
      {!collapsed && (
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={onCreateClick}
            className="w-full bg-[#FF8600] hover:bg-[#FF6B00] text-white font-medium py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-sm cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Создать опрос
          </button>
        </div>
      )}

      {collapsed && (
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={onCreateClick}
            className="w-full bg-[#FF8600] hover:bg-[#FF6B00] text-white font-medium py-2 px-3 rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-sm cursor-pointer"
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

