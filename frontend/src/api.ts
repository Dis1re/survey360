import type { Assignments, Participant, Question, QuestionInput, Survey, SurveyInput } from './types'

const API = '/api'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`[${response.status}] ${text || response.statusText}`)
  }

  const text = await response.text()
  return text ? JSON.parse(text) : (undefined as T)
}

export const surveysApi = {
  list: () => request<Survey[]>('/surveys'),

  get: (id: number) => request<Survey>(`/surveys/${id}`),

  create: (data: SurveyInput) =>
    request<number>('/surveys', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: number, data: SurveyInput) =>
    request<void>(`/surveys/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id: number) =>
    request<void>(`/surveys/${id}`, { method: 'DELETE' }),
}

export const questionsApi = {
  list: (surveyId: number) => request<Question[]>(`/surveys/${surveyId}/questions`),

  get: (surveyId: number, id: number) =>
    request<Question>(`/surveys/${surveyId}/questions/${id}`),

  create: (surveyId: number, data: QuestionInput) =>
    request<number>(`/surveys/${surveyId}/questions`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (surveyId: number, id: number, data: QuestionInput) =>
    request<void>(`/surveys/${surveyId}/questions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (surveyId: number, id: number) =>
    request<void>(`/surveys/${surveyId}/questions/${id}`, { method: 'DELETE' }),
}

export const participantsApi = {
  list: (surveyId: number) => request<Participant[]>(`/surveys/${surveyId}/participants`),
}

export const assignmentsApi = {
  get: (surveyId: number) => request<Assignments>(`/surveys/${surveyId}/assignments`),

  save: (surveyId: number, data: Assignments) =>
    request<void>(`/surveys/${surveyId}/assignments`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
}
