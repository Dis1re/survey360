import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authApi } from '../api'
import {
  clearAuthSession,
  getAuthToken,
  readStoredUser,
  toAuthUser,
  writeAuthSession,
} from '../authStorage'
import type { AuthUser } from '../types'

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  login: (email: string, options?: { password?: string; asAdmin?: boolean }) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function applySession(session: { id: number; name: string; email: string; isAdmin: boolean; token?: string | null }) {
  const user = toAuthUser(session)
  if (session.token) {
    writeAuthSession(user, session.token)
  }
  return user
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    // If this tab already has a bearer token, /me uses it (cookie from another tab is ignored).
    // If not, cookie fallback can pin the last cookie user into this new tab once.
    authApi
      .me()
      .then((session) => {
        if (cancelled) return
        setUser(applySession(session))
      })
      .catch((err) => {
        if (cancelled) return
        const status = (err as Error & { status?: number }).status
        if (status === 401 || status === 403) {
          clearAuthSession()
          setUser(null)
        } else if (!getAuthToken()) {
          setUser(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (email: string, options: { password?: string; asAdmin?: boolean } = {}) => {
    const { password, asAdmin = false } = options
    const session = asAdmin
      ? await authApi.adminLogin(email)
      : await authApi.login(email, password ?? '')
    setUser(applySession(session))
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // Clear local tab session even if the server call fails
    }
    clearAuthSession()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, logout }),
    [user, loading, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

/** Demo password used for all seeded users (shown in UI for testing). */
export const DEMO_PASSWORD = '123456'
