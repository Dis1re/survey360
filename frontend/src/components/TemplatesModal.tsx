import { useEffect, useState } from 'react'
import { questionApi, surveyApi, templateApi } from '../api'
import { ConfirmModal } from './ConfirmModal'
import { Modal } from './Modal'
import type { ApiSurveyTemplate, ApiQuestionTemplate } from '../types'

const typeLabels: Record<string, string> = {
  text: 'Текстовый ответ',
  rating: 'Шкала оценок',
  scale: 'Шкала оценок',
  radio: 'Один из вариантов',
  checkboxes: 'Несколько из вариантов',
  dropdown: 'Выпадающий список',
  date: 'Дата',
  stars: 'Оценка звёздами',
}

const inputClass =
  'w-full border border-gray-200 dark:border-[#3a4250] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#FF8600] dark:focus:border-[#FF8600]'

function parseRadioOptions(props: string | null): string[] {
  if (!props) return []
  try {
    const obj = JSON.parse(props)
    return Object.values(obj).map(String)
  } catch {
    return []
  }
}

interface TemplatesModalProps {
  surveyId: number
  surveyName: string
  mode: 'save' | 'load'
  onClose: () => void
  onLoaded?: () => void
  onEditTemplate?: (id: number) => void
}

export function TemplatesModal({ surveyId, surveyName, mode, onClose, onLoaded, onEditTemplate }: TemplatesModalProps) {
  if (mode === 'save') {
    return <SaveTemplate surveyId={surveyId} surveyName={surveyName} onClose={onClose} />
  }
  return <LoadTemplate surveyId={surveyId} onClose={onClose} onLoaded={onLoaded} onEditTemplate={onEditTemplate} />
}

function SaveTemplate({
  surveyId,
  surveyName,
  onClose,
}: {
  surveyId: number
  surveyName: string
  onClose: () => void
}) {
  const [name, setName] = useState(surveyName)
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      await surveyApi.saveAsTemplate(surveyId, { name: name.trim(), description: description.trim() })
      setDone(true)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Не удалось сохранить шаблон')
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <Modal
        title="Шаблон сохранён"
        size="md"
        onClose={onClose}
        scrollable={false}
        footer={
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-sm font-semibold text-white bg-[#FF8600] hover:bg-[#FF6B00] rounded-xl soft-press cursor-pointer"
          >
            Готово
          </button>
        }
      >
        <p className="text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/40 rounded-xl px-4 py-3">
          Шаблон «{name}» сохранён и доступен в списке шаблонов.
        </p>
      </Modal>
    )
  }

  return (
    <Modal
      title="Сохранить как шаблон"
      description="Вопросы текущего опроса будут сохранены как шаблон для повторного использования."
      size="md"
      onClose={onClose}
      preventClose={saving}
      scrollable={false}
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="soft-press flex-1 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-[#1e222e] border border-gray-200 dark:border-[#3a4250] hover:bg-gray-50 dark:hover:bg-[#262d3a] disabled:opacity-50 rounded-xl cursor-pointer"
          >
            Отмена
          </button>
          <button
            type="submit"
            form="save-template-form"
            disabled={saving || !name.trim()}
            className="soft-press flex-1 py-2.5 text-sm font-semibold text-white bg-[#FF8600] hover:bg-[#FF6B00] disabled:opacity-50 rounded-xl cursor-pointer"
          >
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      }
    >
      <form id="save-template-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/40 rounded-xl px-4 py-3">
            {error}
          </p>
        )}
        <div>
          <label className="block text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-2">
            Название шаблона
          </label>
          <input
            type="text"
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            disabled={saving}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-2">
            Описание
          </label>
          <input
            type="text"
            className={inputClass}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Необязательно"
            disabled={saving}
          />
        </div>
      </form>
    </Modal>
  )
}

function LoadTemplate({
  surveyId,
  onClose,
  onLoaded,
  onEditTemplate,
}: {
  surveyId: number
  onClose: () => void
  onLoaded?: () => void
  onEditTemplate?: (id: number) => void
}) {
  const [templates, setTemplates] = useState<ApiSurveyTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [preview, setPreview] = useState<ApiQuestionTemplate[] | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [applying, setApplying] = useState(false)
  const [done, setDone] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [applyMode, setApplyMode] = useState<'add' | 'replace'>('add')
  const [error, setError] = useState<string | null>(null)

  const reload = () => templateApi.list().then(setTemplates).catch(console.error)

  useEffect(() => {
    reload().finally(() => setLoading(false))
  }, [])

  const handleDelete = async (id: number) => {
    try {
      await templateApi.delete(id)
      setDeletingId(null)
      if (selectedId === id) {
        setSelectedId(null)
        setPreview(null)
      }
      await reload()
    } catch (err) {
      console.error(err)
    }
  }

  const handleSelect = async (id: number) => {
    setSelectedId(id)
    setLoadingPreview(true)
    try {
      const details = await templateApi.get(id)
      setPreview(details.questions)
    } catch (err) {
      console.error(err)
      setPreview(null)
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleApply = async (mode: 'add' | 'replace') => {
    if (selectedId === null || !preview) return
    setApplyMode(mode)
    setApplying(true)
    setError(null)
    try {
      if (mode === 'replace') {
        await surveyApi.deleteAllQuestions(surveyId)
      }
      for (const q of preview) {
        const props = q.props
          ? (() => {
              try {
                return JSON.parse(q.props) as Record<string, string | number>
              } catch {
                return undefined
              }
            })()
          : undefined
        await questionApi.create({ surveyId, text: q.text, type: q.type, isRequired: q.isRequired, props })
      }
      setDone(true)
      onLoaded?.()
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Не удалось загрузить вопросы из шаблона')
    } finally {
      setApplying(false)
    }
  }

  const selectedTemplate = templates.find((t) => t.id === selectedId)
  const deletingTemplate = templates.find((t) => t.id === deletingId)

  if (done) {
    return (
      <Modal
        title="Шаблон применён"
        size="md"
        onClose={onClose}
        scrollable={false}
        footer={
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-sm font-semibold text-white bg-[#FF8600] hover:bg-[#FF6B00] rounded-xl soft-press cursor-pointer"
          >
            Готово
          </button>
        }
      >
        <p className="text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/40 rounded-xl px-4 py-3">
          Вопросы из шаблона «{selectedTemplate?.name}»{' '}
          {applyMode === 'replace' ? 'заменили существующие вопросы' : 'добавлены в опрос'}.
        </p>
      </Modal>
    )
  }

  return (
    <>
      <Modal
        title="Загрузить из шаблона"
        description="Выберите шаблон и добавьте или замените вопросы в текущем опросе."
        size="lg"
        onClose={onClose}
        preventClose={applying}
        scrollable
        footer={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={applying}
              className="soft-press px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-[#1e222e] border border-gray-200 dark:border-[#3a4250] hover:bg-gray-50 dark:hover:bg-[#262d3a] disabled:opacity-50 rounded-xl cursor-pointer"
            >
              Отмена
            </button>
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => handleApply('add')}
              disabled={selectedId === null || applying || !preview || preview.length === 0}
              className="soft-press px-5 py-2.5 text-sm font-semibold text-white bg-[#FF8600] hover:bg-[#FF6B00] disabled:opacity-50 rounded-xl cursor-pointer"
            >
              {applying && applyMode === 'add' ? 'Добавление…' : `Добавить ${preview?.length ?? 0}`}
            </button>
            <button
              type="button"
              onClick={() => handleApply('replace')}
              disabled={selectedId === null || applying || !preview || preview.length === 0}
              className="soft-press px-5 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl cursor-pointer"
            >
              {applying && applyMode === 'replace' ? 'Замена…' : `Заменить на ${preview?.length ?? 0}`}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {error && (
            <p className="text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/40 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          {loading ? (
            <p className="text-sm text-gray-400 dark:text-gray-400 py-4 text-center">Загрузка шаблонов…</p>
          ) : templates.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-400 py-4 text-center">Нет сохранённых шаблонов</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className={`relative group p-4 rounded-xl border transition ${
                    selectedId === t.id
                      ? 'bg-orange-50 dark:bg-[#FF8600]/12 border-orange-300 dark:border-[#FF8600]/45'
                      : 'bg-white dark:bg-[#1e222e] border-gray-200 dark:border-[#3a4250] hover:bg-gray-50 dark:hover:bg-[#262d3a]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeletingId(t.id)
                    }}
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-gray-400 dark:text-gray-400 hover:text-red-500 transition cursor-pointer p-1.5"
                    title="Удалить шаблон"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  {onEditTemplate && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onEditTemplate(t.id)
                      }}
                      className="absolute top-3 right-10 opacity-0 group-hover:opacity-100 text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition cursor-pointer p-1.5"
                      title="Редактировать шаблон"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleSelect(t.id)}
                    className="w-full text-left cursor-pointer pr-10"
                  >
                    <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{t.name}</div>
                    {t.description && (
                      <div className="text-xs text-gray-500 dark:text-gray-300 mt-0.5">{t.description}</div>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

          {selectedId !== null && (
            <div className="border-t border-gray-100 dark:border-[#3a4250] pt-3">
              <p className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-2">
                Вопросы шаблона
              </p>
              {loadingPreview ? (
                <p className="text-sm text-gray-400 dark:text-gray-400">Загрузка…</p>
              ) : preview && preview.length > 0 ? (
                <ul className="space-y-3">
                  {preview.map((q, i) => (
                    <li key={q.id} className="text-sm text-gray-700 dark:text-gray-200">
                      <div className="flex items-start gap-2">
                        <span className="text-xs text-gray-400 dark:text-gray-400 mt-0.5 shrink-0">{i + 1}.</span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{q.text}</span>
                            {q.isRequired && (
                              <span className="text-red-500" title="Обязательный вопрос">*</span>
                            )}
                            <span className="text-xs text-gray-400 dark:text-gray-400 bg-gray-100 dark:bg-[#303a48] px-2 py-0.5 rounded shrink-0">
                              {typeLabels[q.type] ?? q.type}
                            </span>
                          </div>
                          {q.type === 'radio' && (() => {
                            const options = parseRadioOptions(q.props)
                            return options.length > 0 && (
                              <ul className="mt-1.5 ml-1 space-y-1">
                                {options.map((opt, j) => (
                                  <li key={j} className="text-xs text-gray-500 dark:text-gray-300 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-[#3a4250] shrink-0" />
                                    {opt}
                                  </li>
                                ))}
                              </ul>
                            )
                          })()}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-400">Нет вопросов</p>
              )}
            </div>
          )}
        </div>
      </Modal>

      {deletingId !== null && (
        <ConfirmModal
          title="Удалить шаблон?"
          variant="danger"
          confirmLabel="Удалить"
          onConfirm={() => handleDelete(deletingId)}
          onCancel={() => setDeletingId(null)}
          message={
            <>
              Шаблон <span className="font-semibold text-gray-900 dark:text-gray-100">«{deletingTemplate?.name}»</span> будет удалён безвозвратно.
            </>
          }
        />
      )}
    </>
  )
}
