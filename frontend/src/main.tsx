import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { PublicSurveyPage } from './pages/PublicSurveyPage.tsx'
import { getPublicSurveyId } from './routing.ts'
import './site.css'

const publicSurveyId = getPublicSurveyId()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {publicSurveyId !== null ? <PublicSurveyPage surveyId={publicSurveyId} /> : <App />}
  </StrictMode>,
)
