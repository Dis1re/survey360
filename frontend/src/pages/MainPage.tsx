import { useState } from 'react'
import { SurveyHeader } from '../components/SurveyHeader'
import { TabBar, type Tab } from '../components/TabBar'
import { QuestionList } from '../components/QuestionList'
import { QuestionEditor } from '../components/QuestionEditor'
import type { Question } from '../types'

const mockQuestions: Question[] = [
  {
    id: 1,
    text: '1. Оценка навыков архитектуры',
    type: 'scale',
    options: [
      { value: 1, label: 'Критически слабый уровень, требует менторства' },
      { value: 5, label: 'Эксперт, может выступать архитектором крупных модулей' },
    ],
  },
  { id: 2, text: '2. Командная работа и Soft Skills', type: 'radio' },
  { id: 3, text: '3. Тайм-менеджмент и спринты', type: 'text' },
]

export function MainPage() {
  const [activeTab, setActiveTab] = useState<Tab>('editor')
  const [questions, setQuestions] = useState<Question[]>(mockQuestions)
  const [activeQuestionId, setActiveQuestionId] = useState<number | null>(1)

  const activeQuestion = questions.find((q) => q.id === activeQuestionId) ?? null

  const handleSave = (updated: Question) => {
    setQuestions((prev) => prev.map((q) => (q.id === updated.id ? updated : q)))
  }

  return (
    <>
      <SurveyHeader
        title="Оценка компетенций 360 (Middle+)"
        description="Регулярное исследование профессиональных навыков сотрудников, кросс-оценка внутри команд и выявление точек роста."
        status="active"
        startDate="01.07.2026"
        endDate="15.07.2026"
      />
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'editor' && (
        <div className="p-6">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <QuestionList
                questions={questions}
                activeQuestionId={activeQuestionId}
                onQuestionSelect={setActiveQuestionId}
              />
            </div>
            <div className="lg:col-span-2">
              <QuestionEditor question={activeQuestion} onSave={handleSave} />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'matrix' && (
        <div className="p-6">
          <div className="max-w-6xl mx-auto" />
        </div>
      )}
    </>
  )
}
