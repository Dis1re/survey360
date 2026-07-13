export function getPublicSurveyId(): number | null {
  const match = window.location.pathname.match(/^\/survey\/(\d+)\/?$/)
  if (!match) return null
  const id = Number(match[1])
  return Number.isFinite(id) && id > 0 ? id : null
}

export function isDevRoute(): boolean {
  return new URLSearchParams(window.location.search).has('dev')
}

export function openDevPage(): void {
  const url = new URL(window.location.href)
  url.searchParams.set('dev', '1')
  window.location.assign(`${url.pathname}${url.search}`)
}

export function closeDevPage(): void {
  const url = new URL(window.location.href)
  url.searchParams.delete('dev')
  window.location.assign(url.pathname || '/')
}

export function parseSurveyResponseParams(): { reviewerId: number | null; targetId: number | null } {
  const params = new URLSearchParams(window.location.search)
  const reviewer = Number(params.get('reviewer'))
  const target = Number(params.get('target'))
  return {
    reviewerId: Number.isFinite(reviewer) && reviewer > 0 ? reviewer : null,
    targetId: Number.isFinite(target) && target > 0 ? target : null,
  }
}

export function buildSurveyResponseLink(surveyId: number, reviewerId: number, targetId: number): string {
  const url = new URL(`${window.location.origin}/survey/${surveyId}`)
  url.searchParams.set('reviewer', String(reviewerId))
  url.searchParams.set('target', String(targetId))
  return url.toString()
}
