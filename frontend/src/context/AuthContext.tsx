import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authApi } from '../api'
import type { AuthUser } from '../types'

const AUTH_USER_STORAGE_KEY = 'survey360.auth.user'

function readStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

function writeStoredUser(user: AuthUser | null) {
  if (user) localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user))
  else localStorage.removeItem(AUTH_USER_STORAGE_KEY)
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  login: (email: string, asAdmin?: boolean) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser())
  const [loading, setLoading] = useState(() => readStoredUser() === null)

  useEffect(() => {
    authApi
      .me()
      .then((currentUser) => {
        setUser(currentUser)
        writeStoredUser(currentUser)
      })
      .catch(() => {
        setUser(null)
        writeStoredUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email: string, asAdmin = false) => {
    const loggedIn = asAdmin ? await authApi.adminLogin(email) : await authApi.login(email)
    setUser(loggedIn)
    writeStoredUser(loggedIn)
  }, [])

  const logout = useCallback(async () => {
    await authApi.logout()
    setUser(null)
    writeStoredUser(null)
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
