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
