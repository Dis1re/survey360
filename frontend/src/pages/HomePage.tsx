import { Layout } from '../components/Layout'
import { Link } from '../router'

export function HomePage() {
  return (
    <Layout title="Опросы">
      <div className="text-center">
        <h1 className="display-4">Survey360</h1>
        <p className="lead">Система 360-градусных опросов</p>
        <Link className="btn btn-primary" to="/surveys">
          Тест API опросов
        </Link>
      </div>
    </Layout>
  )
}
