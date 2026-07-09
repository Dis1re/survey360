import { useCallback, useEffect, useState, type ReactNode, type CSSProperties } from 'react'

function matchEntityRoute(path: string): number | null {
  const match = path.match(/^\/entities\/entity\/(\d+)$/)
  return match ? Number(match[1]) : null
}

export function useRouter() {
  const [path, setPath] = useState(() => window.location.pathname)

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigate = useCallback((to: string) => {
    window.history.pushState({}, '', to)
    setPath(to)
  }, [])

  return { path, navigate, entityId: matchEntityRoute(path) }
}

interface LinkProps {
  to: string
  className?: string
  children: ReactNode
  onClick?: () => void
  style?: CSSProperties
}

export function Link({ to, className, children, onClick, style }: LinkProps) {
  return (
    <a
      href={to}
      className={className}
      style={style}
      onClick={(event) => {
        event.preventDefault()
        window.history.pushState({}, '', to)
        window.dispatchEvent(new PopStateEvent('popstate'))
        onClick?.()
      }}
    >
      {children}
    </a>
  )
}