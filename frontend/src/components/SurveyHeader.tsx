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
  'w-full border border-gray-200 dark:border-[#3a4250] rounded-xl px-3 py-2 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:border-[#FF8600] dark:focus:border-[#FF8600]'

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
  const dirtyRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onSaveRef = useRef(onSave)
  const formRef = useRef(form)
  formRef.current = form
  useEffect(() => {
    onSaveRef.current = onSave
  }, [onSave])
  const [descOpen, setDescOpen] = useState(false)
  const descAreaRef = useRef<HTMLDivElement>(null)
  const descTextareaRef = useRef<HTMLTextAreaElement>(null)
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

  useEffect(() => {
    if (!descOpen) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDescOpen(false)
    }
    const onPointerDown = (e: MouseEvent) => {
      if (descAreaRef.current && !descAreaRef.current.contains(e.target as Node)) {
        setDescOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('mousedown', onPointerDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('mousedown', onPointerDown)
    }
  }, [descOpen])

  useEffect(() => {
    if (descOpen && !readOnly) {
      requestAnimationFrame(() => descTextareaRef.current?.focus())
    }
  }, [descOpen, readOnly])

  const cfg = statusConfig[status]
  const surveyTitle = form.title.trim() || 'этот опрос'
  const descriptionPreview = form.description.trim()
  const canOpenDescription = !readOnly || Boolean(descriptionPreview)

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
      className={`flex-shrink-0 relative survey-header-wave ${descOpen ? 'z-30 overflow-visible' : 'overflow-hidden'}`}
      style={{
        background:
          'linear-gradient(90deg, rgb(255,134,0) 0%, rgb(255,130,0) 15%, rgb(255,120,0) 30%, rgb(255,110,0) 45%, rgb(255,105,0) 55%, rgb(245,95,5) 70%, rgb(235,90,4) 85%, rgb(232,93,4) 100%)',
        backgroundSize: '150% 100%',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <form onSubmit={handleSubmit} className="px-5 py-3">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-end gap-2.5 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-white/70 mb-1">
                  Название
                </label>
                <input
                  type="text"
                  className={`${inputClass} text-lg font-bold ${readOnly ? 'opacity-90 cursor-default' : ''}`}
                  value={form.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  placeholder="Например: Оценка руководителя 2026"
                  readOnly={readOnly}
                  aria-label="Название опроса"
                />
              </div>
              <span
                className="px-2 py-0.5 text-xs font-medium rounded-md border flex items-center gap-1.5 shrink-0 mb-1.5"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  borderColor: 'rgba(255,255,255,0.35)',
                  color: '#fff',
                }}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </span>
              {!readOnly && saving && (
                <span className="text-[11px] text-white/80 flex items-center gap-1.5 mb-1.5">
                  <span className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                  Сохранение…
                </span>
              )}
            </div>

            <div
              ref={descAreaRef}
              className={`relative w-fit max-w-xs ${descOpen ? 'z-40' : ''}`}
            >
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-white/70 mb-1">
                Описание
              </span>
              <button
                type="button"
                onClick={() => canOpenDescription && setDescOpen(true)}
                disabled={!canOpenDescription}
                aria-expanded={descOpen}
                aria-label="Описание опроса"
                className={`desc-chip w-full max-w-xs inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border text-left truncate ${
                  descOpen ? 'invisible pointer-events-none' : ''
                } ${
                  canOpenDescription
                    ? 'text-white/90 cursor-pointer hover:bg-white/25'
                    : 'text-white/55 cursor-default opacity-80'
                }`}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.12)',
                  borderColor: 'rgba(255,255,255,0.28)',
                }}
                title={
                  canOpenDescription
                    ? readOnly
                      ? 'Открыть описание'
                      : descriptionPreview
                        ? 'Редактировать описание'
                        : 'Добавить описание'
                    : undefined
                }
              >
                <span className="truncate">
                  {descriptionPreview || (readOnly ? 'Не указано' : 'Нажмите, чтобы добавить')}
                </span>
              </button>

              {descOpen && (
                <div
                  className="desc-popover absolute left-0 top-0 z-40 w-[min(28rem,calc(100vw-2.5rem))] rounded-xl border p-3 shadow-2xl"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(255,140,20,0.98) 0%, rgba(232,93,4,0.98) 100%)',
                    borderColor: 'rgba(255,255,255,0.45)',
                    backdropFilter: 'blur(8px)',
                  }}
                  role="dialog"
                  aria-label="Описание опроса"
                >
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-white/70 mb-1.5">
                    Описание
                  </span>
                  {readOnly ? (
                    <p className="text-sm text-white whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                      {descriptionPreview}
                    </p>
                  ) : (
                    <textarea
                      ref={descTextareaRef}
                      className="w-full min-h-[7.5rem] max-h-52 bg-white/20 border border-white/40 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/60 resize-none focus:outline-none focus:border-white/70 focus:bg-white/25 leading-relaxed"
                      value={form.description}
                      onChange={(e) => updateField('description', e.target.value)}
                      placeholder="Кратко опишите цель опроса…"
                      aria-label="Текст описания"
                    />
                  )}
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setDescOpen(false)}
                      className="px-3 py-1 text-xs font-medium text-[#FF8600] bg-white hover:bg-white/90 rounded-lg transition cursor-pointer"
                    >
                      Готово
                    </button>
                  </div>
                </div>
              )}
            </div>

            {readOnly && status === 'active' && (startDateLabel || endDateLabel) && (
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-white/75">
                {startDateLabel && <span>Начало: {startDateLabel}</span>}
                {endDateLabel ? (
                  <span>Окончание: {endDateLabel}</span>
                ) : (
                  <span>Окончание: не задано</span>
                )}
              </div>
            )}
          </div>

          <div className="relative z-0 flex flex-col gap-2 self-stretch lg:self-center shrink-0 w-full lg:w-64 header-actions-enter">
            {showPublicLink ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={publicLink}
                    title="Ссылка на опрос"
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
                <button
                  type="button"
                  onClick={() => setConfirmDialog('stop')}
                  disabled={stopping}
                  className="w-full px-3 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg transition cursor-pointer border border-red-700"
                >
                  {stopping ? 'Остановка…' : 'Остановить опрос'}
                </button>
              </div>
            ) : status === 'draft' ? (
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={handleOpenStartModal}
                  disabled={!canStart}
                  className="w-full px-3 py-2 text-sm font-semibold text-[#FF8600] bg-white hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition cursor-pointer shadow-sm"
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

            {(!readOnly || (onDelete && status === 'closed')) && (
              <div className="flex gap-2">
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => setUserModalOpen(true)}
                    className="flex-1 px-2.5 py-1.5 text-xs font-medium text-white border rounded-lg transition cursor-pointer hover:bg-white/10"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.12)',
                      borderColor: 'rgba(255,255,255,0.25)',
                    }}
                  >
                    + Пользователь
                  </button>
                )}
                {onDelete && (status === 'draft' || status === 'closed') && (
                  <button
                    type="button"
                    onClick={() => setConfirmDialog('delete')}
                    disabled={deleting}
                    className={`px-2.5 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg transition cursor-pointer border border-red-700 ${
                      readOnly ? 'w-full' : 'shrink-0'
                    }`}
                  >
                    {deleting ? 'Удаление…' : 'Удалить'}
                  </button>
                )}
              </div>
            )}
            {status === 'closed' && (startDateLabel || endDateLabel) && (
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-white/80 px-0.5">
                {startDateLabel && <span>Начало: {startDateLabel}</span>}
                {endDateLabel && <span>Окончание: {endDateLabel}</span>}
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
              className="w-full py-2.5 text-sm font-semibold text-white bg-[#FF8600] hover:bg-[#FF6B00] disabled:opacity-50 rounded-xl soft-press cursor-pointer"
            >
              {starting ? 'Запуск…' : 'Начать опрос'}
            </button>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-2">
                Ссылка на опрос
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={publicLink}
                  className="flex-1 min-w-0 border border-gray-200 dark:border-[#3a4250] rounded-xl px-3 py-2 text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-[#161a22] truncate"
                />
                <button
                  type="button"
                  onClick={() => handleCopyLink(publicLink, 'modal')}
                  className="shrink-0 px-3 py-2 text-sm font-medium text-[#FF8600] border border-[#FF8600]/30 hover:bg-[#FF8600]/5 rounded-xl soft-press cursor-pointer"
                >
                  {modalLinkCopied ? 'Скопировано' : 'Копировать'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-2">
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
                    <label className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">
                      Дата окончания
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowEndDate(false)
                        setStartDates((prev) => ({ ...prev, endDate: '' }))
                      }}
                      disabled={starting}
                      className="text-[11px] text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 dark:hover:text-gray-300 dark:hover:text-gray-400 transition cursor-pointer disabled:opacity-50"
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
              <label className="block text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-2">Имя</label>
              <input
                type="text"
                  className="w-full border border-gray-200 dark:border-[#3a4250] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#FF8600] dark:focus:border-[#FF8600]"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Иван Иванов"
                autoFocus
                disabled={userSaving}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-2">Email</label>
              <input
                type="email"
                  className="w-full border border-gray-200 dark:border-[#3a4250] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#FF8600] dark:focus:border-[#FF8600]"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="ivan@example.com"
                disabled={userSaving}
              />
            </div>
            <button
              type="submit"
              disabled={userSaving || !userName.trim() || !userEmail.trim()}
              className="w-full py-2.5 text-sm font-medium text-white bg-[#FF8600] hover:bg-[#FF6B00] disabled:opacity-50 rounded-xl soft-press cursor-pointer"
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
              Опрос <span className="font-semibold text-gray-900 dark:text-gray-100">«{surveyTitle}»</span> будет удалён безвозвратно вместе со всеми данными.
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
              Опрос <span className="font-semibold text-gray-900 dark:text-gray-100">«{surveyTitle}»</span> будет закрыт. Респонденты больше не смогут его заполнять.
            </>
          }
        />
      )}
    </header>
  )
}
