import { useCallback, useEffect, useState } from 'react'
import { templateApi } from '../api'
import { QuestionEditor } from './QuestionEditor'
import { mapQuestionType, mapQuestionTypeToApi, apiQuestionToQuestion } from '../mappers'
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
        <p className="text-sm text-gray-500">Загрузка шаблона…</p>
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
            className="text-gray-400 hover:text-gray-600 transition cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Редактирование шаблона</h1>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Название
            </label>
            <input
              type="text"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSaveInfo}
              disabled={saving || !name.trim()}
              className="px-5 py-2 text-sm font-medium text-white bg-[#FF8600] hover:bg-[#FF6B00] disabled:opacity-50 rounded-xl transition shadow-sm cursor-pointer"
            >
              {saving ? 'Сохранение…' : 'Сохранить'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-2">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Вопросы ({questions.length})
              </p>
              {questions.map((q) => (
                <div key={q.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveQuestionId(q.id)}
                    className={`flex-1 text-left px-3 py-2 rounded-lg text-sm transition cursor-pointer ${
                      activeQuestionId === q.id
                        ? 'bg-orange-50 text-orange-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {q.text || 'Без текста'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteQuestion(q.id)}
                    disabled={deletingQuestion}
                    className="text-gray-300 hover:text-red-500 transition cursor-pointer p-1 shrink-0"
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
                className="w-full text-sm text-gray-500 hover:text-gray-700 py-2 rounded-lg border border-dashed border-gray-200 hover:border-gray-300 transition cursor-pointer"
              >
                {creatingQuestion ? 'Добавление…' : '+ Добавить вопрос'}
              </button>
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
      </div>
    </div>
  )
}

function templateQuestionToQuestion(q: ApiQuestionTemplate): Question {
  const type = mapQuestionType(q.type)
  return {
    id: q.id,
    surveyId: q.surveyTemplateId,
    text: q.text,
    type,
    options:
      type === 'scale'
        ? [{ value: 1, label: '' }, { value: 5, label: '' }]
        : type === 'radio'
          ? []
          : undefined,
  }
}
