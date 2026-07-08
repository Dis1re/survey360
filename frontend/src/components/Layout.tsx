import { useEffect, type ReactNode } from 'react'
import { Link } from '../router'
import directumLogo from '../assets/Directum_logo.png'

interface LayoutProps {
  title: string
  children: ReactNode
}

export function Layout({ title, children }: LayoutProps) {
  useEffect(() => {
    document.title = title
  }, [title])

  return (
    <>
      <header>
        <nav className="navbar navbar-expand-sm navbar-toggleable-sm navbar-light bg-white border-bottom box-shadow mb-3">
            <div className="container-fluid">
              <Link className="navbar-brand surveys-brand" to="/">
                <img className="surveys-brand__logo" src={directumLogo} alt="Directum" />
                <span className="surveys-brand__text">Опросы 360</span>
              </Link>
            <button
              className="navbar-toggler"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target=".navbar-collapse"
              aria-controls="navbarSupportedContent"
              aria-expanded="false"
              aria-label="Toggle navigation"
            >
              <span className="navbar-toggler-icon" />
            </button>
            <div className="navbar-collapse collapse d-sm-inline-flex justify-content-between">
              <ul className="navbar-nav flex-grow-1">
                <li className="nav-item">
                  <Link className="nav-link text-dark" to="/">
                    Главная
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link text-dark" to="/help">
                    Помощь
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link text-dark" to="/entities">
                    Сущности
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </nav>
      </header>
      <div className="container">
        <main role="main" className="pb-3">
          {children}
        </main>
      </div>
      <footer className="border-top footer text-muted">
        <div className="container">Текст в футере</div>
      </footer>
    </>
  )
}
