interface SurveyHeaderProps {
  title: string
  description: string
  status: 'active' | 'draft' | 'closed'
  startDate: string
  endDate: string
}

const statusConfig = {
  active: { label: 'Активен', text: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', dot: 'bg-green-500' },
  draft: { label: 'Черновик', text: 'text-gray-600', bg: 'bg-gray-100', border: 'border-gray-200', dot: 'bg-gray-400' },
  closed: { label: 'Завершен', text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500' },
}

export function SurveyHeader({ title, description, status, startDate, endDate }: SurveyHeaderProps) {
  const cfg = statusConfig[status]

  return (
    <header
      className="flex-shrink-0"
      style={{
        background:
          'linear-gradient(90deg, rgba(255,134,0,1) 0%, rgba(255,107,0,1) 45%, rgba(232,93,4,1) 100%)',
      }}
    >
      <div className="p-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-white">{title}</h1>
              <span
                className={`px-2.5 py-1 text-xs font-medium rounded-md border flex items-center gap-1.5`}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  borderColor: 'rgba(255,255,255,0.35)',
                  color: '#fff',
                }}
              >
                <span className={`w-2 h-2 rounded-full ${cfg.dot} animate-pulse`} />
                {cfg.label}
              </span>
            </div>
            <p className="text-white/85 text-sm mt-1 max-w-2xl">{description}</p>
          </div>

          <div
            className="flex items-center gap-2 text-xs border p-2 rounded-xl self-start md:self-auto"
            style={{
              backgroundColor: 'rgba(255,255,255,0.12)',
              borderColor: 'rgba(255,255,255,0.25)',
            }}
          >
            <svg className="w-4 h-4 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div>
              <span className="block text-white/70 font-medium">Период проведения</span>
              <span className="font-semibold text-white">{startDate} — {endDate}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
