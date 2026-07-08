import { useMemo, useState } from 'react'
import type { SurveyQuestion, SurveySubmitAnswer } from '../../types'

type SurveyFillQuestionsProps = {
  survey: {
    id: number
    title: string
    description: string
  } | null
  questions: SurveyQuestion[]
  saving?: boolean
  onSubmit: (answers: SurveySubmitAnswer[]) => Promise<void> | void
}

export function SurveyFillQuestions({
  survey,
  questions,
  saving,
  onSubmit,
}: SurveyFillQuestionsProps) {
  const [answers, setAnswers] = useState<Record<number, SurveySubmitAnswer['value']>>({})

  const isEmpty = useMemo(() => questions.every((q) => !answers[q.id]), [questions, answers])

  const handleSubmit = async () => {
    const payload: SurveySubmitAnswer[] = questions.map((q, idx) => ({
      questionId: q.id,
      order: idx + 1,
      value: answers[q.id] ?? '',
    }))

    await onSubmit(payload)
  }

  return (
    <section className="surveys-fill">
      <div className="surveys-fill__header">
        <h2 className="surveys-fill__title">{survey ? survey.title : 'Опрос'}</h2>
        {survey?.description && (
          <p className="surveys-fill__description text-muted mb-0">{survey.description}</p>
        )}
      </div>

      <div className="surveys-fill__questions">
        {questions.length === 0 && (
          <p className="text-muted">Вопросов пока нет</p>
        )}

        {questions.map((q, i) => (
          <div key={q.id} className="surveys-fill__question">
            <div className="surveys-fill__questionHeader">
              <div className="surveys-fill__questionNumber">{i + 1}</div>
              <div className="surveys-fill__questionText">{q.text}</div>
              <div className="surveys-fill__questionType text-muted small">
                {q.type}
              </div>
            </div>

            {q.type === 'choice' ? (
              <div className="mt-2">
                {q.options?.map((opt) => (
                  <label key={opt} className="form-check d-flex align-items-center gap-2 mb-2">
                    <input
                      className="form-check-input"
                      type="radio"
                      name={`question-${q.id}`}
                      value={opt}
                      checked={answers[q.id] === opt}
                      onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="mt-2">
                <input
                  className="form-control"
                  value={(answers[q.id] as string) ?? ''}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder="Введите ответ"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="surveys-fill__footer">
        <button
          type="button"
          className="btn btn-primary"
          disabled={saving || questions.length === 0 || isEmpty}
          onClick={handleSubmit}
        >
          {saving ? 'Отправляем…' : 'Отправить'}
        </button>
      </div>
    </section>
  )
}
