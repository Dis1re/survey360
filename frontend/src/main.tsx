import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider, useAuth } from './context/AuthContext.tsx'
import { DevRoutePage } from './pages/DevRoutePage.tsx'
import { LoginPage } from './pages/LoginPage.tsx'
import { UserApp } from './pages/UserApp.tsx'
import { PublicSurveyPage } from './pages/PublicSurveyPage.tsx'
import { getPublicSurveyId, isDevRoute } from './routing.ts'
import './site.css'

function AuthenticatedApp() {
  const { user, loading } = useAuth()

  if (isDevRoute()) {
    return <DevRoutePage />
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Загрузка…</p>
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  return <UserApp />
}

const publicSurveyId = getPublicSurveyId()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {publicSurveyId !== null ? (
      <PublicSurveyPage surveyId={publicSurveyId} />
    ) : (
      <AuthProvider>
        <AuthenticatedApp />
      </AuthProvider>
    )}
  </StrictMode>,
)
