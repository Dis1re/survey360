interface SurveyHeaderProps {
  title: string
  description: string
  status: 'active' | 'draft' | 'closed'
  startDate: string
  endDate: string
  onEdit?: () => void
}

const statusConfig = {
  active: { label: 'Активен', text: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', dot: 'bg-green-500' },
  draft: { label: 'Черновик', text: 'text-gray-600', bg: 'bg-gray-100', border: 'border-gray-200', dot: 'bg-gray-400' },
  closed: { label: 'Завершен', text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500' },
}

export function SurveyHeader({ title, description, status, startDate, endDate, onEdit }: SurveyHeaderProps) {
  const cfg = statusConfig[status]

  return (
    <header className="bg-white border-b border-gray-200 p-6 flex-shrink-0">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">{title}</h1>
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition cursor-pointer"
                title="Редактировать"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
            <span
              className={`px-2.5 py-1 text-xs font-medium ${cfg.text} ${cfg.bg} rounded-md border ${cfg.border} flex items-center gap-1.5`}
            >
              <span className={`w-2 h-2 rounded-full ${cfg.dot} animate-pulse`} />
              Текущий статус: {cfg.label}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1 max-w-2xl">{description}</p>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 border border-gray-100 p-2 rounded-xl self-start md:self-auto">
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <div>
            <span className="block text-gray-400 font-medium">Период проведения</span>
            <span className="font-semibold text-gray-700">{startDate} — {endDate}</span>
          </div>
        </div>
      </div>
    </header>
  )
}
