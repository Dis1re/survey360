import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { surveyApi } from '../api'
import type { RespondentLink, SendInvitesResult } from '../types'

function buildInviteResultModal(result: SendInvitesResult): {
  title: string
  variant: 'default' | 'warning' | 'danger'
  message: ReactNode
} {
  const failedItems = result.items.filter((i) => i.status === 'failed')
  const variant =
    result.failed > 0 && result.sent === 0
      ? 'danger'
      : result.failed > 0 || result.skipped > 0
        ? 'warning'
        : 'default'

  const title =
    result.failed > 0 && result.sent === 0
      ? 'Не удалось отправить'
      : result.failed > 0
        ? 'Отправлено частично'
        : 'Приглашения отправлены'

  return {
    title,
    variant,
    message: (
      <div className="space-y-2">
        <p>
          Отправлено: {result.sent}
          {result.skipped > 0 ? ` · пропущено: ${result.skipped}` : ''}
          {result.failed > 0 ? ` · ошибок: ${result.failed}` : ''}
        </p>
        {failedItems.length > 0 && (
          <ul className="space-y-1 text-xs text-gray-500">
            {failedItems.map((item) => (
              <li key={item.reviewerId}>
                <span className="font-medium text-gray-700">{item.reviewerEmail || item.reviewerId}</span>
                {item.error ? ` — ${item.error}` : ''}
              </li>
            ))}
          </ul>
        )}
        {result.sent > 0 && result.failed === 0 && (
          <p className="text-xs text-gray-500">Проверьте письма в Mailtrap → Sandboxes → Emails.</p>
        )}
      </div>
    ),
  }
}

export interface UseInviteManagerReturn {
  respondentLinks: RespondentLink[]
  sendingInvites: boolean
  inviteResult: {
    title: string
    variant: 'default' | 'warning' | 'danger'
    message: ReactNode
  } | null
  setInviteResult: (v: { title: string; variant: 'default' | 'warning' | 'danger'; message: ReactNode } | null) => void
  exportingReport: boolean
  exportingCsv: boolean
  loadRespondentLinks: (id: number) => Promise<void>
  clearRespondentLinks: () => void
  handleSendInvites: (reviewerId?: number) => Promise<void>
  handleExportReport: () => Promise<void>
  handleExportCsv: () => Promise<void>
}

export function useInviteManager(surveyId: number | null): UseInviteManagerReturn {
  const [respondentLinks, setRespondentLinks] = useState<RespondentLink[]>([])
  const [sendingInvites, setSendingInvites] = useState(false)
  const [inviteResult, setInviteResult] = useState<{
    title: string
    variant: 'default' | 'warning' | 'danger'
    message: ReactNode
  } | null>(null)
  const [exportingReport, setExportingReport] = useState(false)
  const [exportingCsv, setExportingCsv] = useState(false)

  useEffect(() => {
    setRespondentLinks([])
    setInviteResult(null)
    setSendingInvites(false)
    setExportingReport(false)
    setExportingCsv(false)
  }, [surveyId])

  const loadRespondentLinks = useCallback(async (id: number) => {
    try {
      const links = await surveyApi.getRespondentLinks(id)
      setRespondentLinks(links)
    } catch (err) {
      console.error(err)
      setRespondentLinks([])
    }
  }, [])

  const clearRespondentLinks = useCallback(() => {
    setRespondentLinks([])
  }, [])

  const handleSendInvites = useCallback(async (reviewerId?: number) => {
    if (surveyId === null) return
    setSendingInvites(true)
    try {
      const result = await surveyApi.sendInvites(surveyId, reviewerId)
      setInviteResult(buildInviteResultModal(result))
    } catch (err) {
      console.error(err)
      setInviteResult({
        title: 'Не удалось отправить',
        variant: 'danger',
        message: err instanceof Error ? err.message : 'Не удалось отправить приглашения',
      })
    } finally {
      setSendingInvites(false)
    }
  }, [surveyId])

  const handleExportReport = useCallback(async () => {
    if (surveyId === null) return
    setExportingReport(true)
    try {
      const info = await surveyApi.getReportInfo(surveyId)
      if (info.answerCount === 0) {
        alert('Нет ответов для формирования отчёта.')
        return
      }
      await surveyApi.downloadReport(surveyId)
    } catch (err) {
      console.error(err)
      alert('Не удалось сформировать отчёт')
    } finally {
      setExportingReport(false)
    }
  }, [surveyId])

  const handleExportCsv = useCallback(async () => {
    if (surveyId === null) return
    setExportingCsv(true)
    try {
      await surveyApi.downloadCsv(surveyId)
    } catch (err) {
      console.error(err)
      alert('Не удалось сформировать CSV')
    } finally {
      setExportingCsv(false)
    }
  }, [surveyId])

  return {
    respondentLinks,
    sendingInvites,
    inviteResult,
    setInviteResult,
    exportingReport,
    exportingCsv,
    loadRespondentLinks,
    clearRespondentLinks,
    handleSendInvites,
    handleExportReport,
    handleExportCsv,
  }
}
