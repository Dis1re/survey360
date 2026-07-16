import type { AuthUser } from './types'

const TOKEN_KEY = 'survey360.auth.token'
const USER_KEY = 'survey360.auth.user'

/** Per-tab session (sessionStorage) — tabs can stay on different accounts. */
export function getAuthToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function readStoredUser(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem(USER_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuthUser
    if (!parsed || typeof parsed.id !== 'number' || typeof parsed.email !== 'string') return null
    return parsed
  } catch {
    return null
  }
}

export function writeAuthSession(user: AuthUser, token: string) {
  sessionStorage.setItem(TOKEN_KEY, token)
  sessionStorage.setItem(USER_KEY, JSON.stringify(user))
  // Drop legacy shared storage so refreshes don't pull another tab's user
  try {
    localStorage.removeItem('survey360.auth.user')
  } catch {
    /* ignore */
  }
}

export function clearAuthSession() {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(USER_KEY)
  try {
    localStorage.removeItem('survey360.auth.user')
  } catch {
    /* ignore */
  }
}

export function toAuthUser(user: AuthUser & { token?: string | null }): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isAdmin: user.isAdmin,
  }
}
