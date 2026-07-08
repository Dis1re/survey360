import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'

export type SurveysCreateDrawerValues = {
  title: string
  description: string
  startDate: string
  endDate: string
}

type SurveysCreateDrawerProps = {
  open: boolean
  onClose: () => void
  onCreate: (values: SurveysCreateDrawerValues) => Promise<void> | void
}

const emptyValues: SurveysCreateDrawerValues = {
  title: '',
  description: '',
  startDate: '',
  endDate: '',
}

export function SurveysCreateDrawer({ open, onClose, onCreate }: SurveysCreateDrawerProps) {
  const [values, setValues] = useState<SurveysCreateDrawerValues>(emptyValues)
  const [saving, setSaving] = useState(false)

  const titleId = useMemo(() => `surveys-create-title-${Math.random().toString(16).slice(2)}`, [])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      await onCreate(values)
      setValues(emptyValues)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="surveys-drawer" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="surveys-drawer__overlay" onClick={onClose} />
      <div className="surveys-drawer__panel">
        <div className="surveys-drawer__header">
          <h2 className="surveys-drawer__title" id={titleId}>
            Создать опрос
          </h2>
          <button type="button" className="btn btn-link text-decoration-none" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="surveys-drawer__body">
          <div className="mb-3">
            <label className="form-label">
              Название
              <input
                type="text"
                className="form-control"
                value={values.title}
                onChange={(e) => setValues({ ...values, title: e.target.value })}
                required
              />
            </label>
          </div>

          <div className="mb-3">
            <label className="form-label">
              Описание
              <textarea
                className="form-control"
                value={values.description}
                onChange={(e) => setValues({ ...values, description: e.target.value })}
                rows={3}
              />
            </label>
          </div>

          <div className="row g-3">
            <div className="col-12 col-lg-6">
              <label className="form-label">
                Дата начала
                <input
                  type="date"
                  className="form-control"
                  value={values.startDate}
                  onChange={(e) => setValues({ ...values, startDate: e.target.value })}
                  required
                />
              </label>
            </div>
            <div className="col-12 col-lg-6">
              <label className="form-label">
                Дата окончания
                <input
                  type="date"
                  className="form-control"
                  value={values.endDate}
                  onChange={(e) => setValues({ ...values, endDate: e.target.value })}
                  required
                />
              </label>
            </div>
          </div>

          <div className="surveys-drawer__footer">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={saving}>
              Отмена
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Создаём…' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
