interface DevBannerProps {
  onOpenSurveys: () => void
}

export function DevBanner({ onOpenSurveys }: DevBannerProps) {
  return (
    <div className="bg-amber-50 border-b border-amber-200 px-6 py-2">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        <span className="text-xs text-amber-800">Временная ссылка для разработки</span>
        <button
          type="button"
          onClick={onOpenSurveys}
          className="text-xs font-medium text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-3 py-1.5 rounded-lg transition cursor-pointer"
        >
          Тест API / БД
        </button>
      </div>
    </div>
  )
}
