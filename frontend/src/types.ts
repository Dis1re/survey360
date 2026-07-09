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

export interface Assignments {
  [respondentId: string]: Record<string, boolean>
}
