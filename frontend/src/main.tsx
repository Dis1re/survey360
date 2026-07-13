import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { InviteSurveyPage } from './pages/InviteSurveyPage.tsx'
import { PublicSurveyPage } from './pages/PublicSurveyPage.tsx'
import { getInviteToken, getPublicSurveyId } from './routing.ts'
import './site.css'

const inviteToken = getInviteToken()
const publicSurveyId = inviteToken === null ? getPublicSurveyId() : null

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {inviteToken !== null ? (
      <InviteSurveyPage token={inviteToken} />
    ) : publicSurveyId !== null ? (
      <PublicSurveyPage surveyId={publicSurveyId} />
    ) : (
      <App />
    )}
  </StrictMode>,
)
