import { useEffect, useState } from 'react'
import { questionApi, surveyApi, templateApi } from '../api'
import { Modal } from './Modal'
import type { ApiSurveyTemplate, ApiQuestionTemplate } from '../types'

interface TemplatesModalProps {
  surveyId: number
  surveyName: string
  mode: 'save' | 'load'
  onClose: () => void
  onLoaded?: () => void
}

export function TemplatesModal({ surveyId, surveyName, mode, onClose, onLoaded }: TemplatesModalProps) {
  if (mode === 'save') {
    return <SaveTemplate surveyId={surveyId} surveyName={surveyName} onClose={onClose} />
  }
  return <LoadTemplate surveyId={surveyId} onClose={onClose} onLoaded={onLoaded} />
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
    <Modal title="Сохранить как шаблон">
      {done ? (
        <div className="space-y-4">
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            Шаблон «{name}» сохранён
          </p>
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-[#FF8600] hover:bg-[#FF6B00] rounded-xl transition cursor-pointer"
            >
              Закрыть
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Название шаблона
            </label>
            <input
              type="text"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Описание
            </label>
            <input
              type="text"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
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
              className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 rounded-xl transition cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="px-5 py-2 text-sm font-medium text-white bg-[#FF8600] hover:bg-[#FF6B00] disabled:opacity-50 rounded-xl transition shadow-sm cursor-pointer"
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
}: {
  surveyId: number
  onClose: () => void
  onLoaded?: () => void
}) {
  const [templates, setTemplates] = useState<ApiSurveyTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [preview, setPreview] = useState<ApiQuestionTemplate[] | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [applying, setApplying] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    templateApi.list().then(setTemplates).catch(console.error).finally(() => setLoading(false))
  }, [])

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

  const handleApply = async () => {
    if (selectedId === null || !preview) return
    setApplying(true)
    try {
      for (const q of preview) {
        await questionApi.create({ surveyId, text: q.text, type: q.type })
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
    <Modal title="Загрузить из шаблона">
      {done ? (
        <div className="space-y-4">
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            Вопросы из шаблона «{selectedTemplate?.name}» добавлены в опрос
          </p>
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-[#FF8600] hover:bg-[#FF6B00] rounded-xl transition cursor-pointer"
            >
              Закрыть
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {loading ? (
            <p className="text-sm text-gray-400 py-4 text-center">Загрузка шаблонов…</p>
          ) : templates.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Нет сохранённых шаблонов</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSelect(t.id)}
                  className={`w-full text-left p-3 rounded-xl border transition cursor-pointer ${
                    selectedId === t.id
                      ? 'bg-orange-50 border-orange-300'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium text-sm text-gray-900">{t.name}</div>
                  {t.description && (
                    <div className="text-xs text-gray-500 mt-0.5">{t.description}</div>
                  )}
                </button>
              ))}
            </div>
          )}

          {selectedId !== null && (
            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Вопросы шаблона
              </p>
              {loadingPreview ? (
                <p className="text-sm text-gray-400">Загрузка…</p>
              ) : preview && preview.length > 0 ? (
                <ul className="space-y-1">
                  {preview.map((q, i) => (
                    <li key={q.id} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-xs text-gray-400 mt-0.5 shrink-0">{i + 1}.</span>
                      <span>{q.text}</span>
                      <span className="text-xs text-gray-400 shrink-0">({q.type})</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400">Нет вопросов</p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={applying}
              className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 rounded-xl transition cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={selectedId === null || applying || !preview || preview.length === 0}
              className="px-5 py-2 text-sm font-medium text-white bg-[#FF8600] hover:bg-[#FF6B00] disabled:opacity-50 rounded-xl transition shadow-sm cursor-pointer"
            >
              {applying ? 'Добавление…' : `Добавить ${preview?.length ?? 0} вопрос(ов)`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
