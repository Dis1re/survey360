import { useMemo, useState, type FormEvent } from 'react'
import { Layout } from '../components/Layout'

type QuestionType = 'choice' | 'text'

type SurveyQuestion = {
  id: number
  number: number
  text: string
  type: QuestionType
  options?: string[]
}

type SurveyFillProps = {
  id: number
}

type AnswerPayload = {
  questionId: number
  value: string
}

function makeMockQuestions(): SurveyQuestion[] {
  return [
    {
      id: 1,
      number: 1,
      text: 'Насколько вы довольны качеством обслуживания?',
      type: 'choice',
      options: ['Отлично', 'Хорошо', 'Удовлетворительно', 'Плохо'],
    },
    {
      id: 2,
      number: 2,
      text: 'Опишите, что можно улучшить (если есть).',
      type: 'text',
    },
  ]
}

export function SurveyFillPage({ id }: SurveyFillProps) {
  const questions = useMemo(() => makeMockQuestions(), [])
  const [answers, setAnswers] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {}
    for (const q of questions) initial[q.id] = ''
    return initial
  })
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = questions.every((q) => (answers[q.id] ?? '').trim().length > 0)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit || submitting) return

    setSubmitting(true)
    try {
      // Заглушка под будущий surveysApi.submit(...)
      const payload: AnswerPayload[] = questions.map((q) => ({
        questionId: q.id,
        value: answers[q.id],
      }))

      console.log('submit survey', id, payload)

      alert('Ответы отправлены (пока заглушка).')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Layout title={`Опрос ${id}`}>
      <div className="surveys-fill">
        <div className="mb-3">
          <h1 className="h4 mb-1">Опрос №{id}</h1>
          <div className="text-muted">
            Заполните вопросы и нажмите «Отправить».
          </div>
        </div>

        <form onSubmit={onSubmit}>
          <div className="card">
            <div className="card-body">
              <div className="d-flex flex-column gap-3">
                {questions.map((q) => (
                  <div key={q.id} className="surveys-fill__question">
                    <div className="d-flex align-items-start justify-content-between gap-3">
                      <div>
                        <div className="text-muted small">Вопрос №{q.number}</div>
                        <div className="fw-semibold">{q.text}</div>
                      </div>
                      <div className="text-end" />
                    </div>

                    <div className="mt-2">
                      {q.type === 'choice' ? (
                        <div className="d-flex flex-column gap-2">
                          {(q.options ?? []).map((opt) => (
                            <label key={opt} className="d-flex align-items-center gap-2">
                              <input
                                type="radio"
                                name={`q-${q.id}`}
                                value={opt}
                                checked={answers[q.id] === opt}
                                onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <textarea
                          className="form-control"
                          rows={4}
                          value={answers[q.id] ?? ''}
                          onChange={(e) =>
                            setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                          }
                          placeholder="Введите ответ"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="d-flex justify-content-end mt-3 gap-2 flex-wrap">
            <button type="submit" className="btn btn-primary" disabled={!canSubmit || submitting}>
              {submitting ? 'Отправляем…' : 'Отправить'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  )
}
