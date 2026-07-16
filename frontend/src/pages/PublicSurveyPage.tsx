import { TakeSurvey } from './TakeSurvey'
import { isPreviewMode } from '../routing'

interface PublicSurveyPageProps {
  surveyId: number
}

export function PublicSurveyPage({ surveyId }: PublicSurveyPageProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#161a22]">
      <TakeSurvey surveyId={surveyId} standalone preview={isPreviewMode()} />
    </div>
  )
}
