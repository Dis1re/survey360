import { Sidebar } from './components/Sidebar'
import { EntitiesPage } from './pages/EntitiesPage'
import { EntityPage } from './pages/EntityPage'
import { HelpPage } from './pages/HelpPage'
import { MainPage } from './pages/MainPage'
import { useRouter } from './router'
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

export default function App() {
  const { path, surveyId } = useRouter()

  if (surveyId !== null) {
    return <EntityPage id={surveyId} />
  }

  switch (path) {
    case '/help':
      return <HelpPage />
    case '/surveys':
      return <EntitiesPage />
    case '/':
    default:
      break
  }

  const handleCreateClick = () => {
    // TODO: открыть форму создания нового опроса
  }

  const handleSearch = (_query: string) => {
    // TODO: фильтрация списка опросов
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar surveys={mockSurveys} onCreateClick={handleCreateClick} onSearch={handleSearch} />
      <main className="flex-1 overflow-y-auto">
        <MainPage />
      </main>
    </div>
  )
}
