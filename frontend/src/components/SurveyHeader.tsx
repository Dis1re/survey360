import { useEffect, useRef, useState } from 'react'
import { userApi } from '../api'
import type { Survey } from '../types'

export interface SurveyHeaderForm {
  title: string
  description: string
  startDate: string
  endDate: string
}

interface SurveyHeaderProps {
  initial: SurveyHeaderForm
  status: Survey['status']
  saving?: boolean
  onSave: (data: SurveyHeaderForm) => Promise<void>
  onUserCreated?: () => void | Promise<void>
  onDelete?: () => Promise<void>
}

const statusConfig = {
  active: { label: 'Активен', dot: 'bg-green-500' },
  draft: { label: 'Черновик', dot: 'bg-gray-400' },
  closed: { label: 'Завершен', dot: 'bg-red-500' },
}

const inputClass =
  'w-full bg-white/15 border border-white/30 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-white/50 focus:outline-none focus:border-white/60'

const dateInputClass = `${inputClass} survey-header-date`

const DESCRIPTION_MIN_ROWS = 3
const DESCRIPTION_MAX_HEIGHT = 168

export function SurveyHeader({ initial, status, saving = false, onSave, onUserCreated, onDelete }: SurveyHeaderProps) {
  const [form, setForm] = useState(initial)
  const [dirty, setDirty] = useState(false)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userSaving, setUserSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setForm(initial)
    setDirty(false)
  }, [initial])

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

  const updateField = <K extends keyof SurveyHeaderForm>(key: K, value: SurveyHeaderForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    await onSave(form)
    setDirty(false)
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

  const handleDeleteSurvey = async () => {
    const title = form.title.trim() || 'этот опрос'
    if (!confirm(`Удалить опрос «${title}»?`)) return

    setDeleting(true)
    try {
      await onDelete?.()
    } catch (err) {
      console.error(err)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <header
      className="flex-shrink-0"
      style={{
        background:
          'linear-gradient(90deg, rgba(255,134,0,1) 0%, rgba(255,107,0,1) 45%, rgba(232,93,4,1) 100%)',
      }}
    >
      <style>{`
        .survey-header-date {
          color: #fff;
        }
        .survey-header-date::-webkit-datetime-edit,
        .survey-header-date::-webkit-datetime-edit-fields-wrapper,
        .survey-header-date::-webkit-datetime-edit-text,
        .survey-header-date::-webkit-datetime-edit-month-field,
        .survey-header-date::-webkit-datetime-edit-day-field,
        .survey-header-date::-webkit-datetime-edit-year-field {
          color: #fff;
          -webkit-text-fill-color: #fff;
        }
        .survey-header-date::-webkit-calendar-picker-indicator {
          filter: invert(1);
          opacity: 0.85;
          cursor: pointer;
        }
      `}</style>

      <form onSubmit={handleSubmit} className="p-6">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-start gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  className={`${inputClass} text-xl font-bold`}
                  value={form.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  placeholder="Название опроса"
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
              className={`${inputClass} resize-none leading-relaxed`}
              rows={DESCRIPTION_MIN_ROWS}
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Описание опроса"
            />

            {dirty && (
              <button
                type="submit"
                disabled={saving || !form.title.trim()}
                className="px-4 py-1.5 text-sm font-medium text-[#FF8600] bg-white hover:bg-white/90 disabled:opacity-50 rounded-lg transition cursor-pointer"
              >
                {saving ? 'Сохранение…' : 'Сохранить'}
              </button>
            )}
          </div>

          <div className="flex flex-col gap-3 self-start shrink-0">
            <div
              className="flex items-center gap-3 text-xs border p-3 rounded-xl"
              style={{
                backgroundColor: 'rgba(255,255,255,0.12)',
                borderColor: 'rgba(255,255,255,0.25)',
              }}
            >
              <svg className="w-4 h-4 text-white/70 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div className="space-y-2">
                <span className="block text-white/70 font-medium">Период проведения</span>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    className={dateInputClass}
                    style={{ color: '#fff' }}
                    value={form.startDate}
                    onChange={(e) => updateField('startDate', e.target.value)}
                  />
                  <span className="text-white">—</span>
                  <input
                    type="date"
                    className={dateInputClass}
                    style={{ color: '#fff' }}
                    value={form.endDate}
                    onChange={(e) => updateField('endDate', e.target.value)}
                  />
                </div>
              </div>
            </div>
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
            {onDelete && (
              <button
                type="button"
                onClick={handleDeleteSurvey}
                disabled={deleting}
                className="w-full px-3 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl transition cursor-pointer border border-red-700"
              >
                {deleting ? 'Удаление…' : 'Удалить опрос'}
              </button>
            )}
          </div>
        </div>
      </form>

      {userModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => !userSaving && setUserModalOpen(false)}>
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-bold text-gray-900 mb-4">Новый пользователь</h2>
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
          </div>
        </div>
      )}
    </header>
  )
}
