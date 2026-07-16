import { useEffect, useState } from 'react'
import { questionApi, surveyApi, templateApi } from '../api'
import { Modal } from './Modal'
import type { ApiSurveyTemplate, ApiQuestionTemplate } from '../types'

const typeLabels: Record<string, string> = {
  text: 'Текстовый ответ',
  rating: 'Шкала оценок',
  scale: 'Шкала оценок',
  radio: 'Один из вариантов',
}

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await surveyApi.saveAsTemplate(surveyId, { name: name.trim(), description: description.trim() })
      setDone(true)
    } catch (err) {
      console.error(err)
      alert('Не удалось сохранить шаблон')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Сохранить как шаблон" preventClose={saving}>
      {done ? (
        <div className="space-y-4">
          <p className="text-base text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/40 rounded-xl px-4 py-3">
            Шаблон «{name}» сохранён
          </p>
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-base font-medium text-white bg-[#FF8600] hover:bg-[#FF6B00] rounded-xl soft-press cursor-pointer"
            >
              Закрыть
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-2">
              Название шаблона
            </label>
            <input
              type="text"
              className="w-full border border-gray-200 dark:border-[#3a4250] rounded-xl px-4 py-3 text-base focus:outline-none focus:border-blue-500 dark:focus:border-[#FF8600]"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-2">
              Описание
            </label>
            <input
              type="text"
              className="w-full border border-gray-200 dark:border-[#3a4250] rounded-xl px-4 py-3 text-base focus:outline-none focus:border-blue-500 dark:focus:border-[#FF8600]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Необязательно"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-base font-medium text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200 rounded-xl soft-press cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="px-5 py-2 text-base font-medium text-white bg-[#FF8600] hover:bg-[#FF6B00] disabled:opacity-50 rounded-xl soft-press shadow-sm cursor-pointer"
            >
              {saving ? 'Сохранение…' : 'Сохранить'}
            </button>
          </div>
        </form>
      )}
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
    try {
      if (mode === 'replace') {
        await surveyApi.deleteAllQuestions(surveyId)
      }
      for (const q of preview) {
        const props = q.props ? JSON.parse(q.props) as Record<string, string | number> : undefined
        await questionApi.create({ surveyId, text: q.text, type: q.type, isRequired: q.isRequired, props })
      }
      setDone(true)
      onLoaded?.()
    } catch (err) {
      console.error(err)
      alert('Не удалось загрузить вопросы из шаблона')
    } finally {
      setApplying(false)
    }
  }

  const selectedTemplate = templates.find((t) => t.id === selectedId)

  return (
    <Modal title="Загрузить из шаблона" onClose={onClose} preventClose={applying}>
      {done ? (
        <div className="space-y-4">
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            Вопросы из шаблона «{selectedTemplate?.name}» {applyMode === 'replace' ? 'заменили существующие вопросы' : 'добавлены в опрос'}
          </p>
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-[#FF8600] hover:bg-[#FF6B00] rounded-xl soft-press cursor-pointer"
            >
              Закрыть
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
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
                    onClick={(e) => { e.stopPropagation(); setDeletingId(t.id) }}
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-gray-400 dark:text-gray-400 hover:text-red-500 transition cursor-pointer p-1.5"
                    title="Удалить шаблон"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onEditTemplate?.(t.id) }}
                    className="absolute top-3 right-10 opacity-0 group-hover:opacity-100 text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition cursor-pointer p-1.5"
                    title="Редактировать шаблон"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelect(t.id)}
                    className="w-full text-left cursor-pointer pr-10"
                  >
                    <div className="font-medium text-base text-gray-900 dark:text-gray-100">{t.name}</div>
                    {t.description && (
                      <div className="text-sm text-gray-500 dark:text-gray-300 mt-0.5">{t.description}</div>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

          {selectedId !== null && (
            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-2">
                Вопросы шаблона
              </p>
              {loadingPreview ? (
                <p className="text-sm text-gray-400 dark:text-gray-400">Загрузка…</p>
              ) : preview && preview.length > 0 ? (
                <ul className="space-y-3">
                  {preview.map((q, i) => (
                    <li key={q.id} className="text-base text-gray-700 dark:text-gray-200">
                      <div className="flex items-start gap-2">
                        <span className="text-sm text-gray-400 dark:text-gray-400 mt-0.5 shrink-0">{i + 1}.</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
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
                                  <li key={j} className="text-sm text-gray-500 dark:text-gray-300 flex items-center gap-1.5">
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

          <div className="flex items-center gap-3 pt-2">
            <div className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              disabled={applying}
              className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200 rounded-xl soft-press cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={() => handleApply('add')}
              disabled={selectedId === null || applying || !preview || preview.length === 0}
              className="px-5 py-2 text-sm font-medium text-white bg-[#FF8600] hover:bg-[#FF6B00] disabled:opacity-50 rounded-xl soft-press shadow-sm cursor-pointer"
            >
              {applying && applyMode === 'add' ? 'Добавление…' : `Добавить ${preview?.length ?? 0}`}
            </button>
            <button
              type="button"
              onClick={() => handleApply('replace')}
              disabled={selectedId === null || applying || !preview || preview.length === 0}
              className="px-5 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 rounded-xl soft-press shadow-sm cursor-pointer"
            >
              {applying && applyMode === 'replace' ? 'Замена…' : `Заменить на ${preview?.length ?? 0}`}
            </button>
          </div>
        </div>
      )}

      {deletingId !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-[#1e222e] rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4">
            <p className="text-base text-gray-700 dark:text-gray-200">
              Удалить шаблон «{templates.find((t) => t.id === deletingId)?.name}»?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 text-base font-medium text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200 rounded-xl soft-press cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deletingId)}
                className="px-5 py-2 text-base font-medium text-white bg-red-50 dark:bg-red-500/100 hover:bg-red-600 rounded-xl soft-press cursor-pointer"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
