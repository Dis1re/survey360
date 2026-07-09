import { useEffect, useState } from 'react'
import { surveyApi } from '../api'
import { Layout } from '../components/Layout'
import { Link } from '../router'
import type { ApiSurveyDetails } from '../types'

interface EntityPageProps {
  id: number
}

function formatDate(value: string) {
  if (!value || value.startsWith('0001')) return '—'
  return new Date(value).toLocaleString()
}

function boolLabel(value: boolean) {
  return value ? 'Да' : 'Нет'
}

export function EntityPage({ id }: EntityPageProps) {
  const [details, setDetails] = useState<ApiSurveyDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    surveyApi
      .get(id)
      .then(setDetails)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <Layout title="Загрузка">
        <p>Загрузка…</p>
      </Layout>
    )
  }

  if (error || !details) {
    return (
      <Layout title="Опрос не найден">
        <h1>Опрос не найден</h1>
        {error && <p className="text-danger">{error}</p>}
        <Link to="/surveys">← К списку опросов</Link>
      </Layout>
    )
  }

  const { survey, questions, answers, assignments } = details

  return (
    <Layout title={`Опрос ${survey.name}`}>
      <p>
        <Link to="/surveys">← К списку опросов</Link>
      </p>

      <h1>Опрос: {survey.name}</h1>
      <p className="text-muted">
        <code>GET /api/survey/{id}</code>
      </p>

      <h3>Основные данные</h3>
      <table className="table table-sm w-auto">
        <tbody>
          <tr>
            <th>Id</th>
            <td>{survey.id}</td>
          </tr>
          <tr>
            <th>Название</th>
            <td>{survey.name}</td>
          </tr>
          <tr>
            <th>Описание</th>
            <td>{survey.description || '—'}</td>
          </tr>
          <tr>
            <th>Статус</th>
            <td>{survey.status}</td>
          </tr>
          <tr>
            <th>Создан</th>
            <td>{formatDate(survey.createdAt)}</td>
          </tr>
          <tr>
            <th>Начат</th>
            <td>{formatDate(survey.startedAt)}</td>
          </tr>
          <tr>
            <th>Закрыт</th>
            <td>{formatDate(survey.closedAt)}</td>
          </tr>
        </tbody>
      </table>

      <h3>Вопросы ({questions.length})</h3>
      {questions.length === 0 ? (
        <p className="text-muted">Вопросов нет</p>
      ) : (
        <table className="table table-hover">
          <thead>
            <tr>
              <td>Id</td>
              <td>Текст</td>
              <td>Тип</td>
            </tr>
          </thead>
          <tbody>
            {questions.map((question) => (
              <tr key={question.id}>
                <td>{question.id}</td>
                <td>{question.text || '—'}</td>
                <td>{question.type || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>Ответы ({answers.length})</h3>
      {answers.length === 0 ? (
        <p className="text-muted">Ответов нет</p>
      ) : (
        <table className="table table-hover">
          <thead>
            <tr>
              <td>Id</td>
              <td>Вопрос</td>
              <td>Пользователь</td>
              <td>Текст</td>
              <td>Тип</td>
            </tr>
          </thead>
          <tbody>
            {answers.map((answer) => (
              <tr key={answer.id}>
                <td>{answer.id}</td>
                <td>{answer.questionId}</td>
                <td>{answer.userId}</td>
                <td>{answer.text || '—'}</td>
                <td>{answer.type || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>Назначения ({assignments.length})</h3>
      {assignments.length === 0 ? (
        <p className="text-muted">Назначений нет</p>
      ) : (
        <table className="table table-hover">
          <thead>
            <tr>
              <td>Id</td>
              <td>Рецензент</td>
              <td>Оцениваемый</td>
              <td>Назначен</td>
              <td>Завершён</td>
            </tr>
          </thead>
          <tbody>
            {assignments.map((assignment) => (
              <tr key={assignment.id}>
                <td>{assignment.id}</td>
                <td>{assignment.reviewerId}</td>
                <td>{assignment.targetId}</td>
                <td>{boolLabel(assignment.isAssigned)}</td>
                <td>{boolLabel(assignment.isCompleted)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>Ответ API (JSON)</h3>
      <pre className="bg-light p-3 rounded border">
        {JSON.stringify(details, null, 2)}
      </pre>
    </Layout>
  )
}
