import { useAuth } from '../context/AuthContext'
import { getInitials } from '../utils'

interface UserBarProps {
  variant?: 'sidebar' | 'header'
  compact?: boolean
  /** Vertical layout for a collapsed sidebar column */
  stacked?: boolean
}

export function UserBar({ variant = 'sidebar', compact = false, stacked = false }: UserBarProps) {
  const { user, logout } = useAuth()
  if (!user) return null

  const initials = getInitials(user.name, user.email)
  const label = user.name.trim() || user.email
  const isHeader = variant === 'header'

  const avatar = (
    <div
      className={`rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
        compact || stacked ? 'w-8 h-8' : 'w-8 h-8'
      } ${
        isHeader
          ? 'bg-white text-[#FF8600]'
          : user.isAdmin
            ? 'bg-gray-800 text-white'
            : 'bg-[#FF8600] text-white'
      }`}
      title={user.email}
    >
      {initials}
    </div>
  )

  const logoutBtn = (
    <button
      type="button"
      onClick={() => logout().catch(console.error)}
      title="Выйти"
      aria-label="Выйти"
      className={`soft-press rounded-full cursor-pointer ${stacked ? 'p-1.5' : compact ? 'p-1.5' : 'p-2'} ${
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
  )

  if (stacked) {
    return (
      <div className="flex flex-col items-center gap-2 w-full">
        <div
          className="rounded-full p-0.5 border border-gray-200 bg-white shadow-sm"
          title={`${label}${user.isAdmin ? ' · Администратор' : ''}`}
        >
          {avatar}
        </div>
        {logoutBtn}
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 ${isHeader ? 'justify-end' : ''}`}>
      <div
        className={`flex items-center gap-2 min-w-0 ${
          isHeader
            ? 'rounded-full pl-1 pr-2.5 py-1 border border-white/25'
            : compact
              ? 'rounded-full p-0.5 border border-gray-200 bg-white shadow-sm'
              : 'rounded-full pl-1.5 pr-3 py-1.5 bg-white border border-gray-200 shadow-sm'
        }`}
        style={isHeader ? { backgroundColor: 'rgba(255,255,255,0.12)' } : undefined}
        title={user.email}
      >
        {avatar}
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
      {logoutBtn}
    </div>
  )
}
