import { useEffect, type ReactNode } from 'react'
import { Link } from '../router'

interface LayoutProps {
  title: string
  children: ReactNode
}

export function Layout({ title, children }: LayoutProps) {
  useEffect(() => {
    document.title = title
  }, [title])

  const brandBoxStyle: React.CSSProperties = {
    color: '#fff',
    fontWeight: 700,
    fontSize: '1.15rem',
    border: '2px solid rgba(255, 255, 255, 0.6)',
    borderRadius: '8px',
    padding: '6px 14px',
    marginRight: '16px',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  }

  const navLinkStyle: React.CSSProperties = {
    color: '#fff',
    fontWeight: 500,
  }

  const logoBoxStyle: React.CSSProperties = {
    width: 80,
    height: 80,
    backgroundColor: '#fff',
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginLeft: 'auto',
    padding: 8,
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
  }

  return (
    <>
      <header>
        <nav
          className="navbar navbar-expand-sm navbar-toggleable-sm navbar-light border-bottom box-shadow mb-3"
          style={{
            background: 'linear-gradient(135deg, #FF8600 0%, #FF6B00 50%, #E85D04 100%)',
          }}
        >
          <div className="container-fluid">
            <button
              className="navbar-toggler"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target=".navbar-collapse"
              aria-controls="navbarSupportedContent"
              aria-expanded="false"
              aria-label="Toggle navigation"
              style={{ borderColor: 'rgba(255,255,255,0.5)' }}
            >
              <span
                className="navbar-toggler-icon"
                style={{ filter: 'invert(1)' }}
              />
            </button>
            <div className="navbar-collapse collapse d-sm-inline-flex justify-content-between">
              <ul className="navbar-nav flex-grow-1 align-items-center">
                <li className="nav-item">
                  <span style={brandBoxStyle}>Оценка 360</span>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/" style={navLinkStyle}>
                    Главная
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/help" style={navLinkStyle}>
                    Помошь
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/entities" style={navLinkStyle}>
                    Сущности
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/services" style={navLinkStyle}>
                    Сервисы
                  </Link>
                </li>
              </ul>
              <div style={logoBoxStyle}>
                <img
                  src="/logo_dir.svg"
                  alt="Directum"
                  width={64}
                  height={64}
                  style={{ objectFit: 'contain' }}
                />
              </div>
            </div>
          </div>
        </nav>
      </header>

      <div className="container" style={{ minHeight: 'calc(100vh - 200px)' }}>
        <main role="main" className="pb-3">
          {children}
        </main>
      </div>

      <footer
        className="border-top footer"
        style={{
          background: 'linear-gradient(135deg, #E85D04 0%, #FF6B00 50%, #FF8600 100%)',
          position: 'relative',
          marginTop: 'auto',
        }}
      >
               <div className="container d-flex justify-content-between align-items-center" style={{ color: '#fff', lineHeight: '50px' }}>
          <span style={{ color: '#fff', fontSize: '0.85rem' }}>
            Корпоративный портал
          </span>
        </div>
      </footer>
    </>
  )
}