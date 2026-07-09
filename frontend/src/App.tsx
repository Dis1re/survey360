import { Sidebar } from './components/Sidebar'
import type { Survey } from './types'
import { MainPage } from './pages/MainPage'

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
