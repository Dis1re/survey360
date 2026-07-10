import type {
  AddSurveyParticipantRequest,
  ApiAnswer,
  ApiQuestionDetails,
  ApiSurvey,
  ApiSurveyDetails,
  ApiSurveyMatrix,
  ApiUser,
  AssignmentEntry,
  CreateAnswerRequest,
  CreateQuestionRequest,
  CreateUserRequest,
  CompleteAssignmentRequest,
  UpdateQuestionRequest,
  UpdateSurveyRequest,
} from './types'

async function sendRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`API ${url} [${response.status}]:`, errorText || response.statusText)
    throw new Error(`Ошибка API [${response.status}]`)
  }

  const text = await response.text()
  return (text ? JSON.parse(text) : null) as T
}

const API = '/api'

export const surveyApi = {
  create: () =>
    sendRequest<number>(`${API}/survey`, { method: 'POST' }),

  list: () => sendRequest<ApiSurvey[]>(`${API}/survey`),

  get: (id: number) => sendRequest<ApiSurveyDetails>(`${API}/survey/${id}`),

  getMatrix: (id: number) => sendRequest<ApiSurveyMatrix>(`${API}/survey/${id}/matrix`),

  addParticipant: (id: number, data: AddSurveyParticipantRequest) =>
    sendRequest<void>(`${API}/survey/${id}/participants`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  saveAssignments: (id: number, entries: AssignmentEntry[]) =>
    sendRequest<void>(`${API}/survey/${id}/assignments`, {
      method: 'PUT',
      body: JSON.stringify({ entries }),
    }),

  completeAssignment: (id: number, data: CompleteAssignmentRequest) =>
    sendRequest<void>(`${API}/survey/${id}/assignments/complete`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: UpdateSurveyRequest) =>
    sendRequest<ApiSurvey>(`${API}/survey/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    sendRequest<void>(`${API}/survey/${id}`, { method: 'DELETE' }),
}

export const userApi = {
  list: () => sendRequest<ApiUser[]>(`${API}/user`),

  create: (data: CreateUserRequest) =>
    sendRequest<number>(`${API}/user`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  get: (id: number) => sendRequest<ApiUser>(`${API}/user/${id}`),
}

export const questionApi = {
  create: (data: CreateQuestionRequest) =>
    sendRequest<number>(`${API}/question`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  get: (id: number) => sendRequest<ApiQuestionDetails>(`${API}/question/${id}`),

  update: (id: number, data: UpdateQuestionRequest) =>
    sendRequest<ApiQuestionDetails['question']>(`${API}/question/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    sendRequest<void>(`${API}/question/${id}`, { method: 'DELETE' }),
}

export const answerApi = {
  create: (data: CreateAnswerRequest) =>
    sendRequest<number>(`${API}/answer`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  get: (id: number) => sendRequest<ApiAnswer>(`${API}/answer/${id}`),
}

export const databaseApi = {
  clearAll: () => sendRequest<void>(`${API}/database`, { method: 'DELETE' }),
}
