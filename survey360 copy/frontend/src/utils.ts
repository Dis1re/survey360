export function getInitials(name: string, email: string): string {
  const trimmed = name.trim()
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return trimmed.slice(0, 2).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}
