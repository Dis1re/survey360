// UI types (дизайн-компоненты)
export interface Survey {
  id: number
  title: string
  description: string
  status: 'active' | 'draft' | 'closed'
  date: string
  createdByUserId?: number | null
  myAssignedCount?: number | null
  myCompletedCount?: number | null
}

export interface SurveyInput {
  title: string
  description: string
  status: Survey['status']
  date: string
}

export type QuestionProps = Record<string, string | number>

export interface Question {
  id: number
  surveyId: number
  text: string
  type: 'radio' | 'scale' | 'text' | 'checkboxes' | 'dropdown' | 'date' | 'stars'
  isRequired?: boolean
  props?: QuestionProps
  options?: { value: number; label: string }[]
}

export interface QuestionInput {
  text: string
  type: Question['type']
  isRequired?: boolean
  props?: QuestionProps
  options?: Question['options']
}

export interface Participant {
  id: number
  name: string
  role: string
  initial: string
  color: string
}

export interface UserGroup {
  id: number
  name: string
  userIds: number[]
  createdByUserId: number
  createdAt: string
}

export interface Assignments {
  [respondentId: string]: Record<string, boolean>
}

// API types (backend /api/*)
export interface ApiUser {
  id: number
  name: string
  email: string
  isAdmin?: boolean
  createdAt: string
  updatedAt: string
}

export interface AuthUser {
  id: number
  name: string
  email: string
  isAdmin: boolean
}

export interface LoginRequest {
  email: string
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
  isRequired?: boolean
  props?: QuestionProps
}

export interface UpdateQuestionRequest {
  text: string
  type: string
  isRequired?: boolean
  props?: QuestionProps
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
  createdByUserId?: number | null
  myAssignedCount?: number | null
  myCompletedCount?: number | null
}

export interface ApiQuestion {
  id: number
  surveyId: number
  text: string
  type: string
  isRequired?: boolean
  props?: QuestionProps
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

export interface SaveAsTemplateRequest {
  name: string
  description: string
}

export interface ApiSurveyTemplate {
  id: number
  name: string
  description: string
  props: string
  createdAt: string
}

export interface ApiQuestionTemplate {
  id: number
  surveyTemplateId: number
  text: string
  type: string
  isRequired: boolean
  props: string | null
}

export interface ApiSurveyTemplateDetails {
  template: ApiSurveyTemplate
  questions: ApiQuestionTemplate[]
}

export interface RespondentLink {
  reviewerId: number
  reviewerName: string
  reviewerEmail: string
  token: string
}

export interface InviteInfo {
  surveyId: number
  reviewerId: number
}

export interface SendInviteItemResult {
  reviewerId: number
  reviewerEmail: string
  status: 'sent' | 'skipped' | 'failed' | string
  error: string | null
}

export interface SendInvitesResult {
  sent: number
  skipped: number
  failed: number
  items: SendInviteItemResult[]
}
