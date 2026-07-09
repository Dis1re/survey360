import { useEffect, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { DevConsole } from './pages/DevConsole'
import { SurveyDetail } from './pages/SurveyDetail'
import { MainPage } from './pages/MainPage'
import { surveyApi } from './api'
import type { ApiSurvey, Survey } from './types'

const statusMap: Record<string, Survey['status']> = {
  'Черновик': 'draft',
  'Активен': 'active',
  'Завершён': 'closed',
}

function formatDate(dateStr: string): string {
  if (!dateStr || dateStr.startsWith('0001')) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function toSurvey(api: ApiSurvey): Survey {
  return {
    id: api.id,
    title: api.name,
    description: api.description,
    status: statusMap[api.status] ?? 'draft',
    date: formatDate(api.createdAt),
  }
}

type Page = 'main' | 'surveys'

export default function App() {
  const [page, setPage] = useState<Page>('main')
  const [selectedSurveyId, setSelectedSurveyId] = useState<number | null>(null)
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    surveyApi
      .list()
      .then((list) => setSurveys(list.map(toSurvey)))
      .catch(() => setSurveys([]))
      .finally(() => setLoading(false))
  }, [])

  const handleCreateClick = () => {
    // TODO: открыть форму создания нового опроса
  }

  const handleSearch = (_query: string) => {
    // TODO: фильтрация списка опросов
  }

  let content
  if (selectedSurveyId !== null) {
    content = (
      <SurveyDetail id={selectedSurveyId} onBack={() => setSelectedSurveyId(null)} />
    )
  } else if (page === 'surveys') {
    content = (
      <DevConsole
        onBack={() => setPage('main')}
        onOpenSurvey={(id) => setSelectedSurveyId(id)}
      />
    )
  } else {
    content = <MainPage />
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar surveys={surveys} loading={loading} onCreateClick={handleCreateClick} onSearch={handleSearch} onOpenSurveys={() => setPage('surveys')} />
      <main className="flex-1 overflow-y-auto">{content}</main>
    </div>
  )
}
