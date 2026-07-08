import type { ReactNode } from 'react'
import { Link } from '../../router'

export type SurveysAdminStatus = 'черновик' | 'активен' | 'закрыт'

export type SurveysAdminSurvey = {
  id: number
  title: string
  description: string
  startDate: string
  endDate: string
  status: SurveysAdminStatus
  remainingTimeLabel: string
}

type SurveysAdminLeftColumnProps = {
  surveys: SurveysAdminSurvey[]
  selectedId: number
  onSelect: (id: number) => void
  onCreateClick: () => void
  childrenRightHeader?: ReactNode
}

function statusBadge(status: SurveysAdminStatus) {
  switch (status) {
    case 'активен':
      return <span className="badge bg-success">Активен</span>
    case 'закрыт':
      return <span className="badge bg-secondary">Закрыт</span>
    default:
      return <span className="badge bg-warning text-dark">Черновик</span>
  }
}

export function SurveysAdminLeftColumn({
  surveys,
  selectedId,
  onSelect,
  onCreateClick,
}: SurveysAdminLeftColumnProps) {
  return (
    <aside className="surveys-admin__left">
      <div className="surveys-admin__leftHeader">
        <button
          type="button"
          className="btn btn-primary w-100"
          onClick={onCreateClick}
        >
          + Создать опрос
        </button>
      </div>

      <div className="surveys-admin__list">
        {surveys.length === 0 ? (
          <p className="text-muted mb-0">Опросов пока нет</p>
        ) : (
          <div className="list-group">
            {surveys.map((s) => {
              const isActive = s.id === selectedId
              return (
                <button
                  key={s.id}
                  type="button"
                  className={[
                    'list-group-item',
                    'list-group-item-action',
                    isActive ? 'active' : '',
                  ].join(' ')}
                  onClick={() => onSelect(s.id)}
                >
                  <div className="d-flex w-100 justify-content-between gap-2">
                    <div className="text-start">
                      <div className="fw-semibold">{s.title}</div>
                    </div>
                    <div className="text-end text-nowrap">
                      <span className="badge bg-secondary">
                        {s.remainingTimeLabel}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 text-muted small">
                    Статус: <span className="fw-semibold text-dark">{s.status}</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </aside>
  )
}
