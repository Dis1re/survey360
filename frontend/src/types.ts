export interface SimpleEntity {
  id: number
  name: string
  description: string
  type: string
}

export interface MySettings {
  value1: string
  value2: number
  value3: boolean
}

export interface LifecycleRow {
  controller: string
  view: string
}

export interface LifecycleDemo {
  transient: LifecycleRow
  scoped: LifecycleRow
  singleton: LifecycleRow
}

export type EntityInput = Omit<SimpleEntity, 'id'>

export type SurveyStatus = 'черновик' | 'активен' | 'закрыт'

export interface SurveyAdmin {
  id: number
  title: string
  description: string
  startDate: string // yyyy-mm-dd
  endDate: string // yyyy-mm-dd
  status: SurveyStatus
  remainingTimeLabel: string
}

export type SurveyQuestionType = 'choice' | 'text'

export interface SurveyQuestion {
  id: number
  number: number
  text: string
  type: SurveyQuestionType
  options?: string[]
}

export interface SurveySubmitAnswer {
  questionId: number
  value: string
}
