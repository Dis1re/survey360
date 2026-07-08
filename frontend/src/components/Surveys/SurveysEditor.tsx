import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'

export type SurveysEditorValues = {
  title: string
  description: string
  startDate: string
  endDate: string
  matrixRowsCount: number
}

type SurveysEditorProps = {
  values: SurveysEditorValues
  onChange: (values: SurveysEditorValues) => void
  onSave: () => Promise<void> | void
  saving?: boolean
}

function toLabelDate(iso: string) {
  // Оставляем как есть (date input ожидает yyyy-mm-dd)
  return iso
}

export function SurveysEditor({ values, onChange, onSave, saving }: SurveysEditorProps) {
  const titleId = useMemo(
    () => `surveys-editor-title-${Math.random().toString(16).slice(2)}`,
    [],
  )

  const [local, setLocal] = useState<SurveysEditorValues>(values)

  useEffect(() => {
    setLocal(values)
  }, [values])

  useEffect(() => {
    onChange(local)
  }, [local, onChange])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    await onSave()
  }

  return (
    <section className="surveys-editor" aria-labelledby={titleId}>
      <form onSubmit={handleSubmit}>
        <div className="surveys-editor__header">
          <h2 className="surveys-editor__title" id={titleId}>
            Редактор опроса
          </h2>
          <div className="surveys-editor__actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Сохранение…' : 'Сохранить'}
            </button>
          </div>
        </div>

        <div className="row g-3">
          <div className="col-12">
            <label className="form-label">
              Название
              <input
                type="text"
                className="form-control"
                value={local.title}
                onChange={(e) => setLocal({ ...local, title: e.target.value })}
                required
              />
            </label>
          </div>

          <div className="col-12">
            <label className="form-label">
              Описание
              <textarea
                className="form-control"
                rows={3}
                value={local.description}
                onChange={(e) => setLocal({ ...local, description: e.target.value })}
              />
            </label>
          </div>

          <div className="col-12 col-lg-6">
            <label className="form-label">
              Дата начала
              <input
                type="date"
                className="form-control"
                value={toLabelDate(local.startDate)}
                onChange={(e) => setLocal({ ...local, startDate: e.target.value })}
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
                value={toLabelDate(local.endDate)}
                onChange={(e) => setLocal({ ...local, endDate: e.target.value })}
                required
              />
            </label>
          </div>
        </div>

        <hr className="my-4" />

        <div className="surveys-editor__matrix">
          <h3 className="h5 mb-3">Матрица опрашиваемых</h3>

          <div className="mb-3">
            <label className="form-label">
              Количество строк (скелет)
              <input
                type="number"
                className="form-control"
                min={0}
                value={local.matrixRowsCount}
                onChange={(e) =>
                  setLocal({ ...local, matrixRowsCount: Number(e.target.value || 0) })
                }
              />
            </label>
          </div>

          <div className="table-responsive">
            <table className="table table-bordered align-middle">
              <thead>
                <tr>
                  <th style={{ width: 220 }}>Группа/Сотрудник</th>
                  <th>Роль</th>
                  <th style={{ width: 180 }}>Статус (скелет)</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: local.matrixRowsCount }).map((_, idx) => (
                  <tr key={idx}>
                    <td>
                      <input type="text" className="form-control" defaultValue="" />
                    </td>
                    <td>
                      <input type="text" className="form-control" defaultValue="" />
                    </td>
                    <td>
                      <span className="badge bg-light text-dark">—</span>
                    </td>
                  </tr>
                ))}
                {local.matrixRowsCount === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center text-muted">
                      Нет строк матрицы
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </form>
    </section>
  )
}
