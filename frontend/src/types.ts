// UI types (дизайн-компоненты)
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

// API types (backend /api/*)
export interface ApiUser {
  id: number
  name: string
  email: string
  createdAt: string
  updatedAt: string
}

export interface CreateUserRequest {
  name: string
  email: string
}

export interface UpdateSurveyRequest {
  name: string
  description: string
  status: string
  startedAt: string | null
  closedAt: string | null
}

export interface CreateQuestionRequest {
  surveyId: number
  text: string
  type: string
}

export interface UpdateQuestionRequest {
  text: string
  type: string
}

export interface CreateAnswerRequest {
  questionId: number
  userId: number
  targetId: number
  text: string
  type: string
}

export interface ApiSurvey {
  id: number
  name: string
  description: string
  status: string
  createdAt: string
  startedAt: string
  closedAt: string
}

export interface ApiQuestion {
  id: number
  surveyId: number
  text: string
  type: string
}

export interface ApiQuestionDetails {
  question: ApiQuestion
  answers: ApiAnswer[]
}

export interface ApiAnswer {
  id: number
  questionId: number
  userId: number
  targetId: number
  text: string
  type: string
}

export interface ApiSurveyAssignment {
  id: number
  surveyId: number
  reviewerId: number
  targetId: number
  isAssigned: boolean
  isCompleted: boolean
}

export interface ApiSurveyDetails {
  survey: ApiSurvey
  questions: ApiQuestion[]
  answers: ApiAnswer[]
  assignments: ApiSurveyAssignment[]
}

export interface ApiSurveyMatrix {
  targets: ApiUser[]
  respondents: ApiUser[]
  assignments: ApiSurveyAssignment[]
}

export interface AddSurveyParticipantRequest {
  userId: number
  role: 'target' | 'respondent'
}

export interface AssignmentEntry {
  reviewerId: number
  targetId: number
  isAssigned: boolean
}

export interface CompleteAssignmentRequest {
  reviewerId: number
  targetId: number
}

export interface SurveyReportInfo {
  answerCount: number
  assignedCount: number
  completedCount: number
  allAssignedCompleted: boolean
}
