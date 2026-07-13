import { useAuth } from '../context/AuthContext'

function getInitials(name: string, email: string) {
  const trimmed = name.trim()
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return trimmed.slice(0, 2).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

interface UserBarProps {
  variant?: 'sidebar' | 'header'
  compact?: boolean
}

export function UserBar({ variant = 'sidebar', compact = false }: UserBarProps) {
  const { user, logout } = useAuth()
  if (!user) return null

  const initials = getInitials(user.name, user.email)
  const label = user.name.trim() || user.email
  const isHeader = variant === 'header'

  return (
    <div className={`flex items-center gap-2 ${isHeader ? 'justify-end' : ''}`}>
      <div
        className={`flex items-center gap-2 min-w-0 ${
          isHeader
            ? 'rounded-full pl-1 pr-2.5 py-1 border border-white/25'
            : compact
              ? 'rounded-full p-0.5'
              : 'rounded-full pl-1.5 pr-3 py-1.5 bg-white border border-gray-200 shadow-sm'
        }`}
        style={isHeader ? { backgroundColor: 'rgba(255,255,255,0.12)' } : undefined}
        title={user.email}
      >
        <div
          className={`rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
            compact ? 'w-7 h-7' : 'w-8 h-8'
          } ${
            isHeader
              ? 'bg-white text-[#FF8600]'
              : user.isAdmin
                ? 'bg-gray-800 text-white'
                : 'bg-[#FF8600] text-white'
          }`}
        >
          {initials}
        </div>
        {!compact && (
          <div className="min-w-0 hidden sm:block">
            <div
              className={`text-sm font-medium truncate max-w-[140px] ${
                isHeader ? 'text-white' : 'text-gray-900'
              }`}
            >
              {label}
            </div>
            {user.isAdmin && (
              <div className={`text-[10px] leading-none ${isHeader ? 'text-white/60' : 'text-gray-400'}`}>
                Администратор
              </div>
            )}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => logout().catch(console.error)}
        title="Выйти"
        aria-label="Выйти"
        className={`rounded-full transition cursor-pointer ${
          compact ? 'p-1.5' : 'p-2'
        } ${
          isHeader
            ? 'text-white/80 hover:text-white border border-white/25 hover:bg-white/10'
            : 'border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 shadow-sm'
        }`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
      </button>
    </div>
  )
}
