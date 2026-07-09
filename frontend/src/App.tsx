import { useEffect, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { DevConsole } from './pages/DevConsole'
import { MainPage } from './pages/MainPage'
import { SurveyDetail } from './pages/SurveyDetail'
import { surveyApi } from './api'
import type { ApiSurvey, ApiSurveyDetails, Survey } from './types'

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

type Page = 'main' | 'surveys' | 'detail'

export default function App() {
  const [page, setPage] = useState<Page>('main')
  const [selectedSurveyId, setSelectedSurveyId] = useState<number | null>(null)
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const [surveyDetails, setSurveyDetails] = useState<ApiSurveyDetails | null>(null)
  const [surveyLoading, setSurveyLoading] = useState(false)

  useEffect(() => {
    surveyApi
      .list()
      .then((list) => setSurveys(list.map(toSurvey)))
      .catch(() => setSurveys([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (selectedSurveyId === null) {
      setSurveyDetails(null)
      return
    }
    setSurveyLoading(true)
    surveyApi
      .get(selectedSurveyId)
      .then(setSurveyDetails)
      .catch(() => setSurveyDetails(null))
      .finally(() => setSurveyLoading(false))
  }, [selectedSurveyId])

  const handleCreateClick = async () => {
    try {
      const id = await surveyApi.create()
      setSelectedSurveyId(id)
      setPage('main')
      const list = await surveyApi.list()
      setSurveys(list.map(toSurvey))
    } catch {
      // ignore
    }
  }

  const handleSearch = (_query: string) => {
    // TODO: фильтрация списка опросов
  }

  const handleSurveyUpdate = () => {
    if (selectedSurveyId === null) return
    setSurveyLoading(true)
    Promise.all([
      surveyApi.get(selectedSurveyId).then(setSurveyDetails),
      surveyApi.list().then((list) => setSurveys(list.map(toSurvey))),
    ]).catch(() => setSurveyDetails(null))
      .finally(() => setSurveyLoading(false))
  }

  let content
  if (page === 'detail' && selectedSurveyId !== null) {
    content = (
      <SurveyDetail id={selectedSurveyId} onBack={() => setPage('surveys')} />
    )
  } else if (page === 'surveys') {
    content = (
      <DevConsole
        onBack={() => setPage('main')}
        onOpenSurvey={(id) => { setSelectedSurveyId(id); setPage('detail') }}
      />
    )
  } else if (selectedSurveyId !== null && surveyDetails) {
    content = (
      <MainPage
        survey={surveyDetails.survey}
        questions={surveyDetails.questions}
        assignments={surveyDetails.assignments}
        loading={surveyLoading}
        onUpdate={handleSurveyUpdate}
      />
    )
  } else if (selectedSurveyId !== null && surveyLoading) {
    content = (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">Загрузка…</div>
    )
  } else {
    content = (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Выберите опрос из списка
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar surveys={surveys} loading={loading} selectedId={selectedSurveyId} onCreateClick={handleCreateClick} onSearch={handleSearch} onOpenSurveys={() => setPage('surveys')} onSelect={(id) => setSelectedSurveyId(id)} />
      <main className="flex-1 overflow-y-auto">{content}</main>
    </div>
  )
}
