export function getInviteToken(): string | null {
  const match = window.location.pathname.match(/^\/survey\/invite\/([a-f0-9]{32})\/?$/i)
  return match?.[1] ?? null
}

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

export function parseAdminResponseViewParams(): { reviewerId: number; targetId: number } | null {
  const params = new URLSearchParams(window.location.search)
  const reviewerId = Number(params.get('viewReviewer'))
  const targetId = Number(params.get('viewTarget'))
  if (!Number.isFinite(reviewerId) || reviewerId <= 0) return null
  if (!Number.isFinite(targetId) || targetId <= 0) return null
  return { reviewerId, targetId }
}

export function setAdminResponseViewParams(reviewerId: number, targetId: number): void {
  const url = new URL(window.location.href)
  url.searchParams.set('viewReviewer', String(reviewerId))
  url.searchParams.set('viewTarget', String(targetId))
  url.searchParams.set('tab', 'matrix')
  window.history.replaceState(null, '', url)
}

export function clearAdminResponseViewParams(): void {
  const url = new URL(window.location.href)
  url.searchParams.delete('viewReviewer')
  url.searchParams.delete('viewTarget')
  window.history.replaceState(null, '', url)
}

export type MainPageTab = 'editor' | 'matrix' | 'analytics'

const mainPageTabStorageKey = (surveyId: number) => `survey360.mainTab.${surveyId}`

export function readStoredMainPageTab(surveyId: number | null): MainPageTab | null {
  if (surveyId === null) return null
  try {
    const raw = sessionStorage.getItem(mainPageTabStorageKey(surveyId))
    return raw === 'matrix' || raw === 'editor' || raw === 'analytics' ? raw : null
  } catch {
    return null
  }
}

export function storeMainPageTab(surveyId: number, tab: MainPageTab): void {
  try {
    sessionStorage.setItem(mainPageTabStorageKey(surveyId), tab)
  } catch {
    // sessionStorage unavailable
  }
}

export function resolveInitialMainPageTab(surveyId: number | null): MainPageTab {
  // Per-survey memory wins over shared ?tab= in the URL (URL is one for the whole app).
  if (parseAdminResponseViewParams()) return 'matrix'

  const stored = readStoredMainPageTab(surveyId)
  if (stored) return stored

  const params = new URLSearchParams(window.location.search)
  const urlTab = params.get('tab')
  if (urlTab === 'matrix' || urlTab === 'editor' || urlTab === 'analytics') return urlTab

  return 'editor'
}

export function setMainPageTabState(surveyId: number | null, tab: MainPageTab): void {
  const url = new URL(window.location.href)
  if (tab === 'editor') {
    url.searchParams.delete('tab')
  } else {
    url.searchParams.set('tab', tab)
  }
  window.history.replaceState(null, '', url)

  if (surveyId !== null) storeMainPageTab(surveyId, tab)
}

export function isPreviewMode(): boolean {
  return new URLSearchParams(window.location.search).get('preview') === '1'
}

export function buildSurveyResponseLink(surveyId: number, reviewerId: number, targetId: number): string {
  const url = new URL(`${window.location.origin}/survey/${surveyId}`)
  url.searchParams.set('reviewer', String(reviewerId))
  url.searchParams.set('target', String(targetId))
  return url.toString()
}

export function buildRespondentInviteLink(token: string): string {
  return `${window.location.origin}/survey/invite/${token}`
}

export function buildInviteMailto(email: string, surveyName: string, inviteLink: string): string {
  const subject = encodeURIComponent(`Приглашение к опросу: ${surveyName}`)
  const body = encodeURIComponent(
    `Здравствуйте!\n\nВас приглашают пройти опрос «${surveyName}».\n\nПерейдите по персональной ссылке:\n${inviteLink}\n\nПо этой ссылке вам не нужно указывать свои данные — система уже знает, кто вы.`,
  )
  return `mailto:${email}?subject=${subject}&body=${body}`
}
