import type {
  AddSurveyParticipantRequest,
  ApiAnswer,
  ApiQuestionDetails,
  ApiSurvey,
  ApiSurveyDetails,
  ApiSurveyMatrix,
  ApiSurveyTemplate,
  ApiSurveyTemplateDetails,
  ApiUser,
  AssignmentEntry,
  AuthUser,
  CreateAnswerRequest,
  CreateQuestionRequest,
  CreateUserRequest,
  CompleteAssignmentRequest,
  QuestionProps,
  SaveAsTemplateRequest,
  SurveyReportInfo,
  RespondentLink,
  InviteInfo,
  SendInvitesResult,
  UpdateQuestionRequest,
  UpdateSurveyRequest,
} from './types'

async function sendRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  // credentials: 'include' sends auth cookies on all requests, including public invite/survey routes.
  const response = await fetch(url, {
    credentials: 'include',
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
    let message = `Ошибка API [${response.status}]`
    try {
      const parsed = JSON.parse(errorText)
      if (parsed?.message) message = parsed.message
      else if (parsed?.title) message = parsed.title
    } catch {
      if (errorText) message = errorText
    }
    const err = new Error(message) as Error & { status?: number }
    err.status = response.status
    throw err
  }

  if (response.status === 204) {
    return null as T
  }

  const text = await response.text()
  return (text ? JSON.parse(text) : null) as T
}

const API = '/api'

export const authApi = {
  login: (email: string) =>
    sendRequest<AuthUser>(`${API}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  adminLogin: (email: string) =>
    sendRequest<AuthUser>(`${API}/auth/admin-login`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  me: () => sendRequest<AuthUser>(`${API}/auth/me`),

  logout: () => sendRequest<void>(`${API}/auth/logout`, { method: 'POST' }),
}

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

  removeParticipant: (id: number, userId: number, role: 'target' | 'respondent') =>
    sendRequest<void>(`${API}/survey/${id}/participants?userId=${userId}&role=${role}`, {
      method: 'DELETE',
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

  reorderQuestions: (id: number, orderedIds: number[]) =>
    sendRequest<void>(`${API}/survey/${id}/questions/order`, {
      method: 'PUT',
      body: JSON.stringify({ orderedIds }),
    }),

  deleteAllQuestions: (id: number) =>
    sendRequest<void>(`${API}/survey/${id}/questions`, { method: 'DELETE' }),

  getReportInfo: (id: number) =>
    sendRequest<SurveyReportInfo>(`${API}/survey/${id}/report/info`),

  getRespondentLinks: (id: number) =>
    sendRequest<RespondentLink[]>(`${API}/survey/${id}/links`),

  sendInvites: (id: number, reviewerId?: number) =>
    sendRequest<SendInvitesResult>(`${API}/survey/${id}/send-invites`, {
      method: 'POST',
      body: JSON.stringify({ reviewerId: reviewerId ?? null }),
    }),

  resolveInvite: (token: string) =>
    sendRequest<InviteInfo>(`${API}/survey/invite/${token}`),

  downloadReport: async (id: number) => {
    const response = await fetch(`${API}/survey/${id}/report.docx`)
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`API /survey/${id}/report.docx [${response.status}]:`, errorText || response.statusText)
      throw new Error(errorText || `Ошибка API [${response.status}]`)
    }

    const blob = await response.blob()
    const disposition = response.headers.get('Content-Disposition') ?? ''
    const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i)
    const plainMatch = disposition.match(/filename="?([^";]+)"?/i)
    const fileName = utfMatch
      ? decodeURIComponent(utfMatch[1])
      : plainMatch?.[1] ?? `survey-${id}-результаты.docx`

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.click()
    URL.revokeObjectURL(url)
  },
  saveAsTemplate: (id: number, data: SaveAsTemplateRequest) =>
    sendRequest<number>(`${API}/survey/${id}/save-as-template`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

export const templateApi = {
  list: () => sendRequest<ApiSurveyTemplate[]>(`${API}/survey-template`),

  get: (id: number) => sendRequest<ApiSurveyTemplateDetails>(`${API}/survey-template/${id}`),

  update: (id: number, data: { name: string; description: string; props: string }) =>
    sendRequest<void>(`${API}/survey-template/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    sendRequest<void>(`${API}/survey-template/${id}`, { method: 'DELETE' }),

  createQuestion: (templateId: number, data: { text: string; type: string; isRequired?: boolean; props?: QuestionProps }) =>
    sendRequest<number>(`${API}/survey-template/${templateId}/questions`, {
      method: 'POST',
      body: JSON.stringify({ ...data, props: data.props != null ? JSON.stringify(data.props) : null }),
    }),

  updateQuestion: (templateId: number, questionId: number, data: { text: string; type: string; isRequired?: boolean; props?: QuestionProps }) =>
    sendRequest<void>(`${API}/survey-template/${templateId}/questions/${questionId}`, {
      method: 'PUT',
      body: JSON.stringify({ ...data, props: data.props != null ? JSON.stringify(data.props) : null }),
    }),

  deleteQuestion: (templateId: number, questionId: number) =>
    sendRequest<void>(`${API}/survey-template/${templateId}/questions/${questionId}`, {
      method: 'DELETE',
    }),

  createSurveyFromTemplate: (id: number) =>
    sendRequest<number>(`${API}/survey-template/${id}/create-survey`, { method: 'POST' }),
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
      body: JSON.stringify({ ...data, props: data.props != null ? JSON.stringify(data.props) : null }),
    }),

  get: (id: number) => sendRequest<ApiQuestionDetails>(`${API}/question/${id}`),

  update: (id: number, data: UpdateQuestionRequest) =>
    sendRequest<ApiQuestionDetails['question']>(`${API}/question/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...data, props: data.props != null ? JSON.stringify(data.props) : null }),
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
