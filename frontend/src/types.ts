export interface Survey {
  id: number
  title: string
  description: string
  status: 'active' | 'draft' | 'closed'
  date: string
}

export interface SurveyInput {
  title: string
  description: string
  status: Survey['status']
  date: string
}

export interface Question {
  id: number
  surveyId: number
  text: string
  type: 'radio' | 'scale' | 'text'
  options?: { value: number; label: string }[]
}

export interface QuestionInput {
  text: string
  type: Question['type']
  options?: Question['options']
}

export interface Participant {
  id: number
  name: string
  role: string
  initial: string
  color: string
}

export interface MySettings {
  value1: string
  value2: string
  value3: number
}

export interface LifecycleDemo {
  transient: { controller: string; view: string }
  scoped: { controller: string; view: string }
  singleton: { controller: string; view: string }
}

export interface SimpleEntity {
  id: number
  name: string
  description: string
  type: string
}

export interface EntityInput {
  name: string
  description: string
  type: string
}

