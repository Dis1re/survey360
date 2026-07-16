import { useCallback, useEffect, useState } from 'react'
import { templateApi } from '../api'
import { Modal } from './Modal'
import { QuestionEditor } from './QuestionEditor'
import { QuestionPreviewInput } from './QuestionPreview'
import { mapQuestionType, mapQuestionTypeToApi } from '../mappers'
import type { ApiQuestionTemplate, Question } from '../types'

interface TemplateEditorProps {
  templateId: number
  onBack: () => void
}

export function TemplateEditor({ templateId, onBack }: TemplateEditorProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [activeQuestionId, setActiveQuestionId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingQuestion, setSavingQuestion] = useState(false)
  const [creatingQuestion, setCreatingQuestion] = useState(false)
  const [deletingQuestion, setDeletingQuestion] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const details = await templateApi.get(templateId)
      setName(details.template.name)
      setDescription(details.template.description)
      const mapped = details.questions.map(templateQuestionToQuestion)
      setQuestions(mapped)
      setActiveQuestionId((prev) => {
        if (prev !== null && mapped.some((q) => q.id === prev)) return prev
        return mapped[0]?.id ?? null
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [templateId])

  useEffect(() => {
    load()
  }, [load])

  const activeQuestion = questions.find((q) => q.id === activeQuestionId) ?? null

  const handleSaveInfo = async () => {
    setSaving(true)
    try {
      await templateApi.update(templateId, { name, description, props: '' })
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveQuestion = async (updated: Question) => {
    setSavingQuestion(true)
    try {
      await templateApi.updateQuestion(templateId, updated.id, {
        text: updated.text,
        type: mapQuestionTypeToApi(updated.type),
        isRequired: updated.isRequired ?? false,
        props: updated.props,
      })
      setQuestions((prev) => prev.map((q) => (q.id === updated.id ? { ...q, ...updated } : q)))
    } catch (err) {
      console.error(err)
    } finally {
      setSavingQuestion(false)
    }
  }

  const handleCreateQuestion = async () => {
    setCreatingQuestion(true)
    try {
      const id = await templateApi.createQuestion(templateId, { text: 'Новый вопрос', type: 'rating' })
      const newQ = templateQuestionToQuestion({ id, surveyTemplateId: templateId, text: 'Новый вопрос', type: 'rating', isRequired: false, props: null })
      setQuestions((prev) => [...prev, newQ])
      setActiveQuestionId(id)
    } catch (err) {
      console.error(err)
    } finally {
      setCreatingQuestion(false)
    }
  }

  const handleDeleteQuestion = async (id: number) => {
    setDeletingQuestion(true)
    try {
      await templateApi.deleteQuestion(templateId, id)
      setQuestions((prev) => {
        const next = prev.filter((q) => q.id !== id)
        setActiveQuestionId((curr) => {
          if (curr !== id) return curr
          return next[0]?.id ?? null
        })
        return next
      })
    } catch (err) {
      console.error(err)
    } finally {
      setDeletingQuestion(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <p className="text-sm text-gray-500 dark:text-gray-300">Загрузка шаблона…</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="soft-press text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Редактирование шаблона</h1>
        </div>

        <div className="bg-white dark:bg-[#1e222e] border border-gray-200 dark:border-[#3a4250] rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-2">
              Название
            </label>
            <input
              type="text"
              className="w-full border border-gray-200 dark:border-[#3a4250] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-[#FF8600]"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-2">
              Описание
            </label>
            <input
              type="text"
              className="w-full border border-gray-200 dark:border-[#3a4250] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-[#FF8600]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Необязательно"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSaveInfo}
              disabled={saving || !name.trim()}
              className="px-5 py-2 text-sm font-medium text-white bg-[#FF8600] hover:bg-[#FF6B00] disabled:opacity-50 rounded-xl soft-press shadow-sm cursor-pointer"
            >
              {saving ? 'Сохранение…' : 'Сохранить'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-[#1e222e] border border-gray-200 dark:border-[#3a4250] rounded-2xl p-4 shadow-sm space-y-2">
              <p className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">
                Вопросы ({questions.length})
              </p>
              {questions.map((q) => (
                <div key={q.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveQuestionId(q.id)}
                    className={`flex-1 text-left px-3 py-2 rounded-lg text-sm transition cursor-pointer ${
                      activeQuestionId === q.id
                        ? 'bg-orange-50 dark:bg-[#FF8600]/12 text-orange-700 dark:text-orange-400 font-medium'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#262d3a]'
                    }`}
                  >
                    {q.text || 'Без текста'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteQuestion(q.id)}
                    disabled={deletingQuestion}
                    className="text-gray-300 dark:text-gray-400 hover:text-red-500 transition cursor-pointer p-1 shrink-0"
                    title="Удалить вопрос"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={handleCreateQuestion}
                disabled={creatingQuestion}
                className="w-full text-sm text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200 py-2 rounded-lg border border-dashed border-gray-200 dark:border-[#3a4250] hover:border-gray-300 dark:hover:border-[#3a4250] transition cursor-pointer"
              >
                {creatingQuestion ? 'Добавление…' : '+ Добавить вопрос'}
              </button>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="w-full text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-gray-100 dark:hover:text-gray-200 py-2.5 rounded-lg border border-gray-200 dark:border-[#3a4250] hover:border-gray-300 dark:hover:border-[#3a4250] transition cursor-pointer"
                >
                  Предпросмотр
                </button>
              </div>
            </div>
          </div>
          <div className="lg:col-span-2">
            <QuestionEditor
              question={activeQuestion}
              saving={savingQuestion}
              onSave={handleSaveQuestion}
            />
          </div>
        </div>

        {previewOpen && (
          <Modal title="Предпросмотр опросника" onClose={() => setPreviewOpen(false)}>
            <div className="space-y-4">
              <div className="bg-white dark:bg-[#1e222e] border border-gray-200 dark:border-[#3a4250] rounded-2xl p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{name || 'Опрос'}</h2>
                {description && <p className="text-sm text-gray-500 dark:text-gray-300 mt-2">{description}</p>}
              </div>

              <div className="space-y-4">
                {questions.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-300">В этом опроснике пока нет вопросов.</p>
                ) : (
                  questions.map((q, idx) => (
                    <div key={q.id} className="bg-white dark:bg-[#1e222e] border border-gray-200 dark:border-[#3a4250] rounded-2xl p-5 shadow-sm">
                      <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                        <span className="text-gray-400 dark:text-gray-400 mr-1.5">{idx + 1}.</span>
                        {q.text}
                      </label>
                      <QuestionPreviewInput question={q} />
                    </div>
                  ))
                )}
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setPreviewOpen(false)}
                  className="px-5 py-2 text-sm font-medium text-white bg-[#FF8600] hover:bg-[#FF6B00] rounded-xl soft-press shadow-sm cursor-pointer"
                >
                  Выйти из предпросмотра
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  )
}

function templateQuestionToQuestion(q: ApiQuestionTemplate): Question {
  const type = mapQuestionType(q.type)
  const parsed = q.props ? JSON.parse(q.props) as Record<string, string | number> : undefined
  return {
    id: q.id,
    surveyId: q.surveyTemplateId,
    text: q.text,
    type,
    isRequired: q.isRequired ?? false,
    props: parsed,
    options:
      type === 'radio'
        ? Object.entries(parsed ?? {})
            .map(([k, v]) => ({ value: Number(k), label: String(v) }))
            .sort((a, b) => a.value - b.value)
        : undefined,
  }
}
