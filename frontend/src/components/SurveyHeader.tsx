import { useEffect, useRef, useState } from 'react'
import { userApi } from '../api'
import type { Survey } from '../types'
import { ConfirmModal } from './ConfirmModal'
import { Modal } from './Modal'

export interface SurveyHeaderForm {
  title: string
  description: string
}

export interface StartSurveyPayload extends SurveyHeaderForm {
  startDate: string
  endDate: string
}

interface SurveyHeaderProps {
  surveyId: number
  initial: SurveyHeaderForm
  status: Survey['status']
  startedAt?: string
  closedAt?: string
  saving?: boolean
  starting?: boolean
  stopping?: boolean
  canStart?: boolean
  startHint?: string
  onSave: (data: SurveyHeaderForm) => Promise<void>
  onStartSurvey: (data: StartSurveyPayload) => Promise<void>
  onStopSurvey: (data: SurveyHeaderForm) => Promise<void>
  onUserCreated?: () => void | Promise<void>
  onDelete?: () => Promise<void>
}

const statusConfig = {
  active: { label: 'Активен', dot: 'bg-green-500' },
  draft: { label: 'Черновик', dot: 'bg-gray-400' },
  closed: { label: 'Завершен', dot: 'bg-red-500' },
}

const inputClass =
  'w-full bg-white/20 backdrop-blur-sm border border-white/40 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-white/60 focus:outline-none focus:border-white/70 focus:bg-white/25'

const modalDateClass =
  'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#FF8600]'

const DESCRIPTION_MIN_ROWS = 3
const DESCRIPTION_MAX_HEIGHT = 168

function todayInputDate() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatHeaderDate(value: string | undefined) {
  if (!value || value.startsWith('0001')) return null
  return new Date(value).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function SurveyHeader({
  surveyId,
  initial,
  status,
  startedAt,
  closedAt,
  saving = false,
  starting = false,
  stopping = false,
  canStart = false,
  startHint = '',
  onSave,
  onStartSurvey,
  onStopSurvey,
  onUserCreated,
  onDelete,
}: SurveyHeaderProps) {
  const [form, setForm] = useState(initial)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)
  const dirtyRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onSaveRef = useRef(onSave)
  const formRef = useRef(form)
  formRef.current = form
  useEffect(() => {
    onSaveRef.current = onSave
  }, [onSave])
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [startModalOpen, setStartModalOpen] = useState(false)
  const [startDates, setStartDates] = useState({ startDate: '', endDate: '' })
  const [showEndDate, setShowEndDate] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [modalLinkCopied, setModalLinkCopied] = useState(false)
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userSaving, setUserSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<'delete' | 'stop' | null>(null)

  const publicLink = `${window.location.origin}/survey/${surveyId}`
  const readOnly = status !== 'draft'
  const showPublicLink = status === 'active'
  const startDateLabel = formatHeaderDate(startedAt)
  const endDateLabel = formatHeaderDate(closedAt)

  useEffect(() => {
    setForm(initial)
    dirtyRef.current = false
  }, [initial])

  useEffect(() => {
    if (readOnly || !dirtyRef.current) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      dirtyRef.current = false
      onSaveRef.current(formRef.current).catch(() => {
        dirtyRef.current = true
      })
    }, 500)
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [form, readOnly])

  useEffect(() => {
    return () => {
      if (dirtyRef.current && !readOnly) {
        dirtyRef.current = false
        onSaveRef.current(formRef.current).catch(() => {
          dirtyRef.current = true
        })
      }
    }
  }, [readOnly])

  const resizeDescription = () => {
    const el = descriptionRef.current
    if (!el) return
    el.style.height = 'auto'
    const nextHeight = Math.min(el.scrollHeight, DESCRIPTION_MAX_HEIGHT)
    el.style.height = `${nextHeight}px`
    el.style.overflowY = el.scrollHeight > DESCRIPTION_MAX_HEIGHT ? 'auto' : 'hidden'
  }

  useEffect(() => {
    resizeDescription()
  }, [form.description, initial.description])

  const cfg = statusConfig[status]
  const surveyTitle = form.title.trim() || 'этот опрос'

  const updateField = <K extends keyof SurveyHeaderForm>(key: K, value: SurveyHeaderForm[K]) => {
    if (readOnly) return
    setForm((prev) => ({ ...prev, [key]: value }))
    dirtyRef.current = true
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = userName.trim()
    const email = userEmail.trim()
    if (!name || !email) return

    setUserSaving(true)
    try {
      await userApi.create({ name, email })
      setUserModalOpen(false)
      setUserName('')
      setUserEmail('')
      await onUserCreated?.()
    } catch (err) {
      console.error(err)
    } finally {
      setUserSaving(false)
    }
  }

  const handleCopyLink = async (link: string, target: 'header' | 'modal') => {
    try {
      await navigator.clipboard.writeText(link)
      if (target === 'header') {
        setLinkCopied(true)
        window.setTimeout(() => setLinkCopied(false), 2000)
      } else {
        setModalLinkCopied(true)
        window.setTimeout(() => setModalLinkCopied(false), 2000)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleOpenStartModal = () => {
    setStartDates({ startDate: todayInputDate(), endDate: '' })
    setShowEndDate(false)
    setModalLinkCopied(false)
    setStartModalOpen(true)
  }

  const handleStartSurvey = async () => {
    if (!form.title.trim()) return
    try {
      await onStartSurvey({
        title: form.title,
        description: form.description,
        startDate: startDates.startDate,
        endDate: startDates.endDate,
      })
      setStartModalOpen(false)
      dirtyRef.current = false
    } catch (err) {
      console.error(err)
    }
  }

  const handleStopSurvey = async () => {
    try {
      await onStopSurvey(form)
      setConfirmDialog(null)
      dirtyRef.current = false
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteSurvey = async () => {
    setDeleting(true)
    try {
      await onDelete?.()
      setConfirmDialog(null)
    } catch (err) {
      console.error(err)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <header
      className="flex-shrink-0 relative overflow-hidden survey-header-wave"
      style={{
        background:
          'linear-gradient(90deg, rgb(255,134,0) 0%, rgb(255,130,0) 15%, rgb(255,120,0) 30%, rgb(255,110,0) 45%, rgb(255,105,0) 55%, rgb(245,95,5) 70%, rgb(235,90,4) 85%, rgb(232,93,4) 100%)',
        backgroundSize: '150% 100%',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <form onSubmit={handleSubmit} className="p-6">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-start gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  className={`${inputClass} text-xl font-bold ${readOnly ? 'opacity-90 cursor-default' : ''}`}
                  value={form.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  placeholder="Название опроса"
                  readOnly={readOnly}
                />
              </div>
              <span
                className="px-2.5 py-1 text-xs font-medium rounded-md border flex items-center gap-1.5 shrink-0 mt-1"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  borderColor: 'rgba(255,255,255,0.35)',
                  color: '#fff',
                }}
              >
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </span>
            </div>

            <textarea
              ref={descriptionRef}
              className={`${inputClass} resize-none leading-relaxed ${readOnly ? 'opacity-90 cursor-default' : ''}`}
              rows={DESCRIPTION_MIN_ROWS}
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Описание опроса"
              readOnly={readOnly}
            />

            {readOnly && status === 'active' && (startDateLabel || endDateLabel) && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/75">
                {startDateLabel && <span>Начало: {startDateLabel}</span>}
                {endDateLabel ? (
                  <span>Окончание: {endDateLabel}</span>
                ) : (
                  <span>Окончание: не задано</span>
                )}
              </div>
            )}

            {!readOnly && saving && (
              <span className="text-xs text-white/80 flex items-center gap-1.5">
                <span className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                Сохранение…
              </span>
            )}
          </div>

          <div className="flex flex-col gap-3 self-start shrink-0 w-full lg:w-72">
            {showPublicLink ? (
              <div className="space-y-2">
                <div
                  className="border p-3 rounded-xl space-y-2"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.12)',
                    borderColor: 'rgba(255,255,255,0.25)',
                  }}
                >
                  <span className="block text-xs text-white/70 font-medium">Ссылка на опрос</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={publicLink}
                      className="flex-1 min-w-0 bg-white/15 border border-white/30 rounded-lg px-2.5 py-1.5 text-xs text-white truncate"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopyLink(publicLink, 'header')}
                      className="shrink-0 px-2.5 py-1.5 text-xs font-medium text-[#FF8600] bg-white hover:bg-white/90 rounded-lg transition cursor-pointer"
                    >
                      {linkCopied ? 'Скопировано' : 'Копировать'}
                    </button>
                  </div>
                  <p className="text-[11px] text-white/60 leading-relaxed">
                    Персональные ссылки для каждого респондента — на вкладке «Матрица участников».
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmDialog('stop')}
                  disabled={stopping}
                  className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl transition cursor-pointer border border-red-700"
                >
                  {stopping ? 'Остановка…' : 'Остановить опрос'}
                </button>
              </div>
            ) : status === 'draft' ? (
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={handleOpenStartModal}
                  disabled={!canStart}
                  className="w-full px-4 py-2.5 text-sm font-semibold text-[#FF8600] bg-white hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition cursor-pointer shadow-sm"
                >
                  Начать опрос
                </button>
                {!canStart && startHint && (
                  <p className="text-[11px] text-white/80 text-center leading-snug">
                    {startHint}
                  </p>
                )}
              </div>
            ) : null}

            {!readOnly && (
              <button
                type="button"
                onClick={() => setUserModalOpen(true)}
                className="w-full px-3 py-2 text-xs font-medium text-white border rounded-xl transition cursor-pointer hover:bg-white/10"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.12)',
                  borderColor: 'rgba(255,255,255,0.25)',
                }}
              >
                + Добавить пользователя
              </button>
            )}
            {onDelete && status !== 'active' && (
              <button
                type="button"
                onClick={() => setConfirmDialog('delete')}
                disabled={deleting}
                className="w-full px-3 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl transition cursor-pointer border border-red-700"
              >
                {deleting ? 'Удаление…' : 'Удалить опрос'}
              </button>
            )}
            {status === 'closed' && (startDateLabel || endDateLabel) && (
              <div
                className="rounded-xl border p-3.5 space-y-3"
                style={{
                  background: 'linear-gradient(90deg, rgb(255,134,0) 0%, rgb(255,130,0) 15%, rgb(255,120,0) 30%, rgb(255,110,0) 45%, rgb(255,105,0) 55%, rgb(245,95,5) 70%, rgb(235,90,4) 85%, rgb(232,93,4) 100%)',
                  borderColor: 'rgba(255,255,255,0.25)',
                }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
                  >
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-white/90 uppercase tracking-wide">
                    Период проведения
                  </span>
                </div>
                <div className="space-y-2">
                  {startDateLabel && (
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-white/60 text-xs">Начало</span>
                      <span className="text-white font-medium tabular-nums">{startDateLabel}</span>
                    </div>
                  )}
                  {endDateLabel && (
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-white/60 text-xs">Окончание</span>
                      <span className="text-white font-medium tabular-nums">{endDateLabel}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </form>

      {startModalOpen && (
        <Modal
          title="Опубликовать опрос"
          description="Опрос станет доступен по персональным ссылкам. Каждый респондент получит свою ссылку на вкладке «Матрица участников»."
          size="md"
          onClose={() => setStartModalOpen(false)}
          preventClose={starting}
          scrollable={false}
          footer={
            <button
              type="button"
              onClick={handleStartSurvey}
              disabled={starting || !form.title.trim()}
              className="w-full py-2.5 text-sm font-semibold text-white bg-[#FF8600] hover:bg-[#FF6B00] disabled:opacity-50 rounded-xl transition cursor-pointer"
            >
              {starting ? 'Запуск…' : 'Начать опрос'}
            </button>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Ссылка на опрос
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={publicLink}
                  className="flex-1 min-w-0 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 bg-gray-50 truncate"
                />
                <button
                  type="button"
                  onClick={() => handleCopyLink(publicLink, 'modal')}
                  className="shrink-0 px-3 py-2 text-sm font-medium text-[#FF8600] border border-[#FF8600]/30 hover:bg-[#FF8600]/5 rounded-xl transition cursor-pointer"
                >
                  {modalLinkCopied ? 'Скопировано' : 'Копировать'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Дата начала
              </label>
              <input
                type="date"
                className={modalDateClass}
                value={startDates.startDate}
                onChange={(e) => setStartDates((prev) => ({ ...prev, startDate: e.target.value }))}
                disabled={starting}
              />

              {showEndDate ? (
                <div className="mt-3">
                  <div className="flex items-baseline justify-between gap-2 mb-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Дата окончания
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowEndDate(false)
                        setStartDates((prev) => ({ ...prev, endDate: '' }))
                      }}
                      disabled={starting}
                      className="text-[11px] text-gray-400 hover:text-gray-600 transition cursor-pointer disabled:opacity-50"
                    >
                      Убрать
                    </button>
                  </div>
                  <input
                    type="date"
                    className={modalDateClass}
                    value={startDates.endDate}
                    min={startDates.startDate || undefined}
                    onChange={(e) => setStartDates((prev) => ({ ...prev, endDate: e.target.value }))}
                    disabled={starting}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowEndDate(true)}
                  disabled={starting}
                  className="mt-2 text-sm text-[#FF8600] hover:text-[#FF6B00] transition cursor-pointer disabled:opacity-50"
                >
                  + Добавить дату окончания
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {userModalOpen && (
        <Modal
          title="Новый пользователь"
          size="sm"
          onClose={() => setUserModalOpen(false)}
          preventClose={userSaving}
          scrollable={false}
        >
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Имя</label>
              <input
                type="text"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#FF8600]"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Иван Иванов"
                autoFocus
                disabled={userSaving}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Email</label>
              <input
                type="email"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#FF8600]"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="ivan@example.com"
                disabled={userSaving}
              />
            </div>
            <button
              type="submit"
              disabled={userSaving || !userName.trim() || !userEmail.trim()}
              className="w-full py-2.5 text-sm font-medium text-white bg-[#FF8600] hover:bg-[#FF6B00] disabled:opacity-50 rounded-xl transition cursor-pointer"
            >
              {userSaving ? 'Добавление…' : 'Добавить'}
            </button>
          </form>
        </Modal>
      )}

      {confirmDialog === 'delete' && (
        <ConfirmModal
          title="Удалить опрос?"
          variant="danger"
          confirmLabel="Удалить"
          loadingLabel="Удаление…"
          loading={deleting}
          onConfirm={handleDeleteSurvey}
          onCancel={() => !deleting && setConfirmDialog(null)}
          message={
            <>
              Опрос <span className="font-semibold text-gray-900">«{surveyTitle}»</span> будет удалён безвозвратно вместе со всеми данными.
            </>
          }
        />
      )}

      {confirmDialog === 'stop' && (
        <ConfirmModal
          title="Остановить опрос?"
          variant="warning"
          confirmLabel="Остановить"
          loadingLabel="Остановка…"
          loading={stopping}
          onConfirm={handleStopSurvey}
          onCancel={() => !stopping && setConfirmDialog(null)}
          message={
            <>
              Опрос <span className="font-semibold text-gray-900">«{surveyTitle}»</span> будет закрыт. Респонденты больше не смогут его заполнять.
            </>
          }
        />
      )}
    </header>
  )
}
