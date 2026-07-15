export type Tab = 'editor' | 'matrix'

interface TabBarProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

const tabs: { id: Tab; label: string }[] = [
  { id: 'editor', label: 'Конструктор анкеты' },
  { id: 'matrix', label: 'Матрица участников' },
]

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <div className="px-6 flex-shrink-0 bg-white dark:bg-[#1e222e]">
      <div className="max-w-6xl mx-auto flex gap-6 border-b border-gray-200 dark:border-[#3a4250]" style={{ borderColor: 'rgba(255,134,0,0.25)' }}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              data-active={isActive}
              className="tab-btn py-3 text-sm font-semibold flex items-center gap-2 focus:outline-none cursor-pointer"
            >
              {tab.id === 'editor' ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z" />
                </svg>
              )}
              {tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
