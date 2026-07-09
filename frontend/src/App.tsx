import { useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { EntitiesPage } from './pages/EntitiesPage'
import { EntityPage } from './pages/EntityPage'
import { MainPage } from './pages/MainPage'
import type { Survey } from './types'

const mockSurveys: Survey[] = [
  {
    id: 1,
    title: 'Оценка компетенций 360 (Middle+)',
    description: 'Опрос команды разработки ИВТ',
    status: 'active',
    date: 'До 15.07',
  },
  {
    id: 2,
    title: 'Опрос по условиям труда 2026',
    description: 'Сбор обратной связи от лаборантов',
    status: 'draft',
    date: '02.07',
  },
  {
    id: 3,
    title: 'Анкетирование первокурсников',
    description: 'Адаптация в УдГУ',
    status: 'closed',
    date: 'Июнь 2026',
  },
]

type Page = 'main' | 'surveys'

export default function App() {
  const [page, setPage] = useState<Page>('main')
  const [selectedSurveyId, setSelectedSurveyId] = useState<number | null>(null)

  const handleCreateClick = () => {
    // TODO: открыть форму создания нового опроса
  }

  const handleSearch = (_query: string) => {
    // TODO: фильтрация списка опросов
  }

  let content
  if (selectedSurveyId !== null) {
    content = (
      <EntityPage id={selectedSurveyId} onBack={() => setSelectedSurveyId(null)} />
    )
  } else if (page === 'surveys') {
    content = (
      <EntitiesPage
        onBack={() => setPage('main')}
        onOpenSurvey={(id) => setSelectedSurveyId(id)}
      />
    )
  } else {
    content = <MainPage onOpenSurveys={() => setPage('surveys')} />
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar surveys={mockSurveys} onCreateClick={handleCreateClick} onSearch={handleSearch} />
      <main className="flex-1 overflow-y-auto">{content}</main>
    </div>
  )
}
