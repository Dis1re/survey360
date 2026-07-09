import { useEffect, useState } from 'react'

interface SurveyEditModalProps {
  name: string
  description: string
  startedAt: string
  closedAt: string
  onSave: (data: { name: string; description: string; startedAt: string; closedAt: string }) => void
  onClose: () => void
  onDelete: () => void
  saving?: boolean
}

export function SurveyEditModal({ name, description, startedAt, closedAt, onSave, onClose, onDelete, saving }: SurveyEditModalProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [form, setForm] = useState({ name, description, startedAt, closedAt })

  useEffect(() => {
    setForm({ name, description, startedAt, closedAt })
  }, [name, description, startedAt, closedAt])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Редактировать опрос</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Название</label>
            <input
              type="text"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Описание</label>
            <textarea
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 resize-none"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Дата начала</label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                value={form.startedAt ? form.startedAt.split('T')[0] : ''}
                onChange={(e) => setForm({ ...form, startedAt: e.target.value ? `${e.target.value}T00:00:00Z` : '' })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Дата завершения</label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                value={form.closedAt ? form.closedAt.split('T')[0] : ''}
                onChange={(e) => setForm({ ...form, closedAt: e.target.value ? `${e.target.value}T00:00:00Z` : '' })}
              />
            </div>
          </div>

          {confirmDelete ? (
            <div className="pt-4 border-t border-gray-100 space-y-3">
              <p className="text-sm text-red-700 font-medium">Удалить опрос «{form.name}»? Это действие необратимо.</p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 rounded-xl transition cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition shadow-sm cursor-pointer"
                >
                  Да, удалить
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition cursor-pointer"
              >
                Удалить опрос
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 rounded-xl transition cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Сохранение…' : 'Сохранить'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
