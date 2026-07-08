import { useRouter } from './router'
import { EntitiesPage } from './pages/EntitiesPage'
import { EntityPage } from './pages/EntityPage'
import { HelpPage } from './pages/HelpPage'
import { HomePage } from './pages/HomePage'
import { ServicesPage } from './pages/ServicesPage'

export default function App() {
  const { path, entityId } = useRouter()

  if (entityId !== null) {
    return <EntityPage id={entityId} />
  }

  switch (path) {
    case '/help':
      return <HelpPage />
    case '/entities':
      return <EntitiesPage />
    case '/services':
      return <ServicesPage />
    case '/':
    default:
      return <HomePage />
  }
}
