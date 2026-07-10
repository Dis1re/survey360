import { TakeSurvey } from './TakeSurvey'

interface PublicSurveyPageProps {
  surveyId: number
}

export function PublicSurveyPage({ surveyId }: PublicSurveyPageProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <TakeSurvey surveyId={surveyId} standalone />
    </div>
  )
}
