<<<<<<< HEAD
import type { EntityInput, LifecycleDemo, MySettings, SimpleEntity } from './types'

async function sendRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
=======
import type { Assignments, Participant, Question, QuestionInput, Survey, SurveyInput } from './types'

const API = '/api'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${url}`, {
>>>>>>> f3cbdd4d8dda8ac2d625614ddb884287868557b0
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
<<<<<<< HEAD
      ...options.headers,
=======
      ...options?.headers,
>>>>>>> f3cbdd4d8dda8ac2d625614ddb884287868557b0
    },
  })

  if (!response.ok) {
<<<<<<< HEAD
    const errorText = await response.text()
    throw new Error(`Ошибка API [${response.status}]: ${errorText || response.statusText}`)
  }

  const text = await response.text()
  return (text ? JSON.parse(text) : null) as T
}

const API = '/api'

export const entitiesApi = {
  list: () => sendRequest<SimpleEntity[]>(`${API}/entities`),
  get: (id: number) => sendRequest<SimpleEntity>(`${API}/entities/${id}`),
  create: (entity: EntityInput) =>
    sendRequest<number>(`${API}/entities`, {
      method: 'POST',
      body: JSON.stringify(entity),
    }),
  update: (id: number, entity: EntityInput) =>
    sendRequest<void>(`${API}/entities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(entity),
    }),
  delete: (id: number) =>
    sendRequest<void>(`${API}/entities/${id}`, { method: 'DELETE' }),
}

export const settingsApi = {
  get: () => sendRequest<MySettings>(`${API}/settings`),
}

export const servicesApi = {
  lifecycle: () => sendRequest<LifecycleDemo>(`${API}/services/lifecycle`),
=======
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
>>>>>>> f3cbdd4d8dda8ac2d625614ddb884287868557b0
}
