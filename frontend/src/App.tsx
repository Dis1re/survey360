import { useRouter } from './router'
import { EntitiesPage } from './pages/EntitiesPage'
import { EntityPage } from './pages/EntityPage'
import { HelpPage } from './pages/HelpPage'
import { HomePage } from './pages/HomePage'
import { ServicesPage } from './pages/ServicesPage'
import { SurveysAdminPage } from './pages/SurveysAdminPage'
import { SurveyFillPage } from './pages/SurveyFillPage'

export default function App() {
  const { path, entityId, surveyFillId } = useRouter()

  if (entityId !== null) {
    return <EntityPage id={entityId} />
  }

  if (surveyFillId !== null) {
    return <SurveyFillPage id={surveyFillId} />
  }

  switch (path) {
    case '/help':
      return <HelpPage />
    case '/entities':
      return <EntitiesPage />
    case '/services':
      return <ServicesPage />
    case '/surveys':
      return <SurveysAdminPage />
    case '/':
    default:
      return <HomePage />
  }
}
