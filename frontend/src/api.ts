import type { EntityInput, LifecycleDemo, MySettings, SimpleEntity } from './types'

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
}
