import { useState } from 'react'
import { SurveyHeader } from '../components/SurveyHeader'
import { TabBar, type Tab } from '../components/TabBar'

export function MainPage() {
  const [activeTab, setActiveTab] = useState<Tab>('editor')

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
    </>
  )
}
