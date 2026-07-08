import { useCallback, useEffect, useState, type ReactNode } from 'react'

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
}

export function Link({ to, className, children, onClick }: LinkProps) {
  return (
    <a
      href={to}
      className={className}
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
