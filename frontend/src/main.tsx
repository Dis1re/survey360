import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider, useAuth } from './context/AuthContext.tsx'
import { DevRoutePage } from './pages/DevRoutePage.tsx'
import { LoginPage } from './pages/LoginPage.tsx'
import { UserApp } from './pages/UserApp.tsx'
import { PublicSurveyPage } from './pages/PublicSurveyPage.tsx'
import { getPublicSurveyId, isDevRoute, normalizeLegacyInviteUrl } from './routing.ts'
import { ThemeProvider } from './theme.tsx'
import './site.css'

// Old email links: /survey/invite/{token} → /?invite={token} (normal app)
normalizeLegacyInviteUrl()

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
    <ThemeProvider>
      {publicSurveyId !== null ? (
        <PublicSurveyPage surveyId={publicSurveyId} />
      ) : (
        <AuthProvider>
          <AuthenticatedApp />
        </AuthProvider>
      )}
    </ThemeProvider>
  </StrictMode>,
)
