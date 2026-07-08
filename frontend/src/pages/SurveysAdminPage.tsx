import { useMemo, useState } from 'react'
import { Layout } from '../components/Layout'
import type { SurveysAdminStatus } from '../components/Surveys/SurveysAdminLeftColumn'
import { SurveysAdminLeftColumn } from '../components/Surveys/SurveysAdminLeftColumn'
import { SurveysCreateDrawer } from '../components/Surveys/SurveysCreateDrawer'
import { SurveysEditor } from '../components/Surveys/SurveysEditor'
import type { SurveysCreateDrawerValues } from '../components/Surveys/SurveysCreateDrawer'
import type { SurveysEditorValues } from '../components/Surveys/SurveysEditor'

type Survey = {
  id: number
  title: string
  description: string
  startDate: string
  endDate: string
  status: SurveysAdminStatus
  remainingTimeLabel: string
}

function calcStatusAndRemaining(startDate: string, endDate: string): {
  status: SurveysAdminStatus
  remainingTimeLabel: string
} {
  if (!startDate || !endDate) {
    return { status: 'черновик', remainingTimeLabel: '—' }
  }

  const now = new Date()
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T23:59:59`)

  if (now < start) return { status: 'черновик', remainingTimeLabel: 'До старта' }
  if (now > end) return { status: 'закрыт', remainingTimeLabel: 'Закрыт' }

  const diffMs = end.getTime() - now.getTime()
  const diffDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
  return { status: 'активен', remainingTimeLabel: `Осталось ${diffDays} дн.` }
}

function makeMockSurveys(): Survey[] {
  const today = new Date()
  const toDateStr = (d: Date) => d.toISOString().slice(0, 10)

  const start1 = new Date(today)
  start1.setDate(start1.getDate() - 2)
  const end1 = new Date(today)
  end1.setDate(end1.getDate() + 7)

  const start2 = new Date(today)
  start2.setDate(start2.getDate() + 10)
  const end2 = new Date(today)
  end2.setDate(end2.getDate() + 20)

  const start3 = new Date(today)
  start3.setDate(start3.getDate() - 30)
  const end3 = new Date(today)
  end3.setDate(end3.getDate() - 10)

  const s1 = calcStatusAndRemaining(toDateStr(start1), toDateStr(end1))
  const s2 = calcStatusAndRemaining(toDateStr(start2), toDateStr(end2))
  const s3 = calcStatusAndRemaining(toDateStr(start3), toDateStr(end3))

  return [
    {
      id: 1,
      title: 'Опрос удовлетворенности 1',
      description: 'Краткий опрос после обслуживания.',
      startDate: toDateStr(start1),
      endDate: toDateStr(end1),
      status: s1.status,
      remainingTimeLabel: s1.remainingTimeLabel,
    },
    {
      id: 2,
      title: 'Опрос перед внедрением 2',
      description: 'Сбор мнений перед изменениями.',
      startDate: toDateStr(start2),
      endDate: toDateStr(end2),
      status: s2.status,
      remainingTimeLabel: s2.remainingTimeLabel,
    },
    {
      id: 3,
      title: 'Сезонный опрос 3',
      description: 'Архивный опрос за прошлый период.',
      startDate: toDateStr(start3),
      endDate: toDateStr(end3),
      status: s3.status,
      remainingTimeLabel: s3.remainingTimeLabel,
    },
  ]
}

export function SurveysAdminPage() {
  const initial = useMemo(() => makeMockSurveys(), [])
  const [surveys, setSurveys] = useState<Survey[]>(initial)
  const [selectedId, setSelectedId] = useState<number>(() => initial[0]?.id ?? 0)

  const selected = useMemo(
    () => surveys.find((s) => s.id === selectedId) ?? null,
    [surveys, selectedId],
  )

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [savingCreate, setSavingCreate] = useState(false)
  const [editorSaving, setEditorSaving] = useState(false)

  const [editorValues, setEditorValues] = useState<SurveysEditorValues>(() => ({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    matrixRowsCount: 2,
  }))

  useMemo(() => {
    if (!selected) return
    setEditorValues({
      title: selected.title,
      description: selected.description,
      startDate: selected.startDate,
      endDate: selected.endDate,
      matrixRowsCount: 2,
    })
  }, [selected])

  const handleCreate = async (values: SurveysCreateDrawerValues) => {
    setSavingCreate(true)
    try {
      const nextId = Math.max(0, ...surveys.map((s) => s.id)) + 1
      const { status, remainingTimeLabel } = calcStatusAndRemaining(values.startDate, values.endDate)

      const created: Survey = {
        id: nextId,
        title: values.title || `Опрос ${nextId}`,
        description: values.description,
        startDate: values.startDate,
        endDate: values.endDate,
        status,
        remainingTimeLabel,
      }

      setSurveys((prev) => [created, ...prev])
      setSelectedId(created.id)
      setDrawerOpen(false)
    } finally {
      setSavingCreate(false)
    }
  }

  const headerStatusLabel = (status: SurveysAdminStatus) => {
    switch (status) {
      case 'активен':
        return <span className="badge bg-success">Активен</span>
      case 'закрыт':
        return <span className="badge bg-secondary">Закрыт</span>
      default:
        return <span className="badge bg-warning text-dark">Черновик</span>
    }
  }

  return (
    <Layout title="Админка — Опрос 360">
      <div className="surveys-admin">
        <div className="surveys-admin__grid">
          <SurveysAdminLeftColumn
            surveys={surveys.map((s) => ({
              id: s.id,
              title: s.title,
              description: s.description,
              startDate: s.startDate,
              endDate: s.endDate,
              status: s.status,
              remainingTimeLabel: s.remainingTimeLabel,
            }))}
            selectedId={selectedId}
            onSelect={(id) => setSelectedId(id)}
            onCreateClick={() => setDrawerOpen(true)}
          />

          <section className="surveys-admin__right">
            {!selected ? (
              <div className="text-muted">Выберите опрос из списка</div>
            ) : (
              <div className="surveys-admin__rightInner">
                <div className="surveys-editor__header card mb-3">
                  <div className="card-body">
                    <div className="row g-3">
                      <div className="col-12">
                        <div className="d-flex align-items-start justify-content-between gap-3">
                          <div>
                            <div className="surveys-editor__title fw-semibold">{selected.title}</div>
                            <div className="surveys-editor__desc text-muted">{selected.description}</div>
                          </div>
                          <div className="text-end">{headerStatusLabel(selected.status)}</div>
                        </div>
                      </div>

                      <div className="col-md-6">
                        <div className="surveys-editor__label text-muted">Дата начала</div>
                        <div className="surveys-editor__value fw-semibold">{selected.startDate}</div>
                      </div>

                      <div className="col-md-6">
                        <div className="surveys-editor__label text-muted">Дата окончания</div>
                        <div className="surveys-editor__value fw-semibold">{selected.endDate}</div>
                      </div>

                      <div className="col-12 d-flex gap-2 flex-wrap">
                        <a href={`/surveys/survey/${selected.id}`} className="btn btn-outline-primary">
                          Открыть опрос
                        </a>
                        <button type="button" className="btn btn-outline-secondary" disabled>
                          Сохранить (пока нет API)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="surveys-editor__body card">
                  <div className="card-body">
                    <SurveysEditor
                      values={editorValues}
                      onChange={(v) => setEditorValues(v)}
                      onSave={() => {
                        setEditorSaving(true)
                        setTimeout(() => setEditorSaving(false), 400)
                      }}
                      saving={editorSaving}
                    />
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        <SurveysCreateDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onCreate={async (values) => handleCreate(values)}
          saving={savingCreate}
        />
      </div>
    </Layout>
  )
}

export default SurveysAdminPage
