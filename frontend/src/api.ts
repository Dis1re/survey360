import type {
  ApiAnswer,
  ApiQuestionDetails,
  ApiSurvey,
  ApiSurveyDetails,
  ApiUser,
  CreateAnswerRequest,
  CreateQuestionRequest,
  CreateUserRequest,
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
    throw new Error(`Ошибка API [${response.status}]: ${errorText || response.statusText}`)
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

  delete: (id: number) =>
    sendRequest<void>(`${API}/survey/${id}`, { method: 'DELETE' }),
}

export const userApi = {
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

export const settingsApi = {
  get: () => sendRequest<{ value1: string; value2: number; value3: boolean }>(`${API}/settings`),
}
