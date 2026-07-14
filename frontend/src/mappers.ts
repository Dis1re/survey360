import type {
  ApiQuestion,
  ApiSurvey,
  ApiSurveyAssignment,
  ApiUser,
  Participant,
  Question,
  Survey,
} from './types'

const PARTICIPANT_COLORS = [
  'bg-blue-100 text-blue-600',
  'bg-green-100 text-green-600',
  'bg-purple-100 text-purple-600',
  'bg-orange-100 text-orange-600',
  'bg-pink-100 text-pink-600',
  'bg-teal-100 text-teal-600',
]

export function mapSurveyStatus(status: string): Survey['status'] {
  const normalized = status.toLowerCase()
  if (normalized.includes('актив') || normalized === 'active') return 'active'
  if (normalized.includes('заверш') || normalized.includes('закрыт') || normalized === 'closed') {
    return 'closed'
  }
  return 'draft'
}

export function mapSurveyStatusToApi(status: Survey['status']): string {
  if (status === 'active') return 'Активен'
  if (status === 'closed') return 'Завершен'
  return 'Черновик'
}

export function mapQuestionTypeToApi(type: Question['type']): string {
  if (type === 'scale') return 'rating'
  if (type === 'radio') return 'radio'
  return 'text'
}

function isEmptyDate(value: string) {
  return !value || value.startsWith('0001')
}

export function apiDateToInput(value: string) {
  if (isEmptyDate(value)) return ''
  return new Date(value).toISOString().slice(0, 10)
}

export function inputDateToApi(value: string): string | null {
  if (!value) return null
  return new Date(`${value}T00:00:00.000Z`).toISOString()
}

export function formatShortDate(value: string) {
  if (isEmptyDate(value)) return '—'
  return new Date(value).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
}

function formatSurveyDate(survey: ApiSurvey) {
  if (!isEmptyDate(survey.closedAt)) return `До ${formatShortDate(survey.closedAt)}`
  if (!isEmptyDate(survey.startedAt)) return formatShortDate(survey.startedAt)
  return formatShortDate(survey.createdAt)
}

export function apiSurveyToSurvey(api: ApiSurvey): Survey {
  return {
    id: api.id,
    title: api.name,
    description: api.description,
    status: mapSurveyStatus(api.status),
    date: formatSurveyDate(api),
    createdByUserId: api.createdByUserId ?? null,
    myAssignedCount: api.myAssignedCount ?? null,
    myCompletedCount: api.myCompletedCount ?? null,
  }
}

export function isMySurvey(survey: Survey, userId: number): boolean {
  return survey.createdByUserId === userId
}

export function isParticipationSurvey(survey: Survey): boolean {
  return survey.status !== 'draft' && (survey.myAssignedCount ?? 0) > 0
}

export function isParticipationPending(survey: Survey): boolean {
  if (survey.status === 'closed') return false
  const assigned = survey.myAssignedCount ?? 0
  const completed = survey.myCompletedCount ?? 0
  return assigned > 0 && completed < assigned
}

export function isParticipationDone(survey: Survey): boolean {
  if (survey.status === 'closed') return true
  const assigned = survey.myAssignedCount ?? 0
  const completed = survey.myCompletedCount ?? 0
  return assigned > 0 && completed >= assigned
}

export function mapQuestionType(type: string): Question['type'] {
  const normalized = type.toLowerCase()
  if (normalized === 'radio' || normalized === 'single') return 'radio'
  if (normalized === 'scale' || normalized === 'rating') return 'scale'
  return 'text'
}

export function apiQuestionToQuestion(api: ApiQuestion): Question {
  const type = mapQuestionType(api.type)
  const parsedProps: Record<string, string | number> | undefined =
    api.props == null
      ? undefined
      : typeof api.props === 'string'
        ? JSON.parse(api.props)
        : api.props
  return {
    id: api.id,
    surveyId: api.surveyId,
    text: api.text,
    type,
    isRequired: api.isRequired ?? false,
    props: parsedProps,
    options:
      type === 'radio'
        ? Object.entries(parsedProps ?? {})
            .map(([k, v]) => ({ value: Number(k), label: String(v) }))
            .sort((a, b) => a.value - b.value)
        : undefined,
  }
}

export function apiUserToParticipant(user: ApiUser, index: number): Participant {
  const initial = user.name.trim().charAt(0).toUpperCase() || '?'
  return {
    id: user.id,
    name: user.name,
    role: user.email.split('@')[0] ?? '',
    initial,
    color: PARTICIPANT_COLORS[index % PARTICIPANT_COLORS.length],
  }
}

export function usersToParticipants(users: ApiUser[]): Participant[] {
  return users.map((user, index) => apiUserToParticipant(user, index))
}

export function assignmentsToMatrix(
  assignments: ApiSurveyAssignment[],
): Record<string, Record<string, boolean>> {
  const result: Record<string, Record<string, boolean>> = {}
  for (const assignment of assignments) {
    if (!assignment.isAssigned) continue
    const reviewerKey = String(assignment.reviewerId)
    const targetKey = String(assignment.targetId)
    if (!result[reviewerKey]) result[reviewerKey] = {}
    result[reviewerKey][targetKey] = true
  }
  return result
}

export function assignmentsToCompletionMatrix(
  assignments: ApiSurveyAssignment[],
): Record<string, Record<string, boolean>> {
  const result: Record<string, Record<string, boolean>> = {}
  for (const assignment of assignments) {
    if (!assignment.isAssigned || !assignment.isCompleted) continue
    const reviewerKey = String(assignment.reviewerId)
    const targetKey = String(assignment.targetId)
    if (!result[reviewerKey]) result[reviewerKey] = {}
    result[reviewerKey][targetKey] = true
  }
  return result
}

export function getUniqueUserIds(assignments: ApiSurveyAssignment[]) {
  const ids = new Set<number>()
  for (const assignment of assignments) {
    ids.add(assignment.reviewerId)
    ids.add(assignment.targetId)
  }
  return [...ids].sort((a, b) => a - b)
}
