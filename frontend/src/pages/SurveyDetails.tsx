import { useEffect, useState } from 'react'
import { surveyApi, userApi } from '../api'
import type { ApiSurveyDetails, ApiUser } from '../types'

interface EntityPageProps {
  id: number
  onBack: () => void
}

function formatDate(value: string) {
  if (!value || value.startsWith('0001')) return '—'
  return new Date(value).toLocaleString()
}

function boolLabel(value: boolean) {
  return value ? 'Да' : 'Нет'
}

const thClass =
  'text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider'
const tdClass = 'px-4 py-3 text-sm text-gray-600'

export function EntityPage({ id, onBack }: EntityPageProps) {
  const [details, setDetails] = useState<ApiSurveyDetails | null>(null)
  const [users, setUsers] = useState<ApiUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    Promise.all([surveyApi.get(id), userApi.list()])
      .then(([surveyDetails, allUsers]) => {
        setDetails(surveyDetails)
        setUsers(allUsers)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-6xl mx-auto text-sm text-gray-500">Загрузка…</div>
      </div>
    )
  }

  if (error || !details) {
    return (
      <div className="p-6">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 text-sm font-medium text-gray-600 border-2 border-orange-300 rounded-xl hover:bg-orange-50 cursor-pointer"
            >
              К списку опросов
            </button>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Опрос не найден</h1>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}
        </div>
      </div>
    )
  }

  const { survey, questions, answers, assignments } = details

  return (
    <div className="">
      <header className="bg-white border-b border-gray-200 p-6 flex-shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Опрос: {survey.name}</h1>
            <p className="text-xs text-gray-400 mt-1 font-mono">GET /api/survey/{id}</p>
          </div>
          <div className="flex items-center justify-end sm:self-start">
            <button
              type="button"
              onClick={onBack}
              className="soft-press px-4 py-2 text-sm font-medium text-gray-600 border-2 border-orange-300 rounded-xl hover:bg-orange-50 cursor-pointer"
            >
              К списку опросов
            </button>
          </div>
        </div>
      </header>


      <div className="p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Основные данные</h2>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <tbody className="divide-y divide-gray-100">
                  {[
                    ['Id', survey.id],
                    ['Название', survey.name],
                    ['Описание', survey.description || '—'],
                    ['Статус', survey.status],
                    ['Создан', formatDate(survey.createdAt)],
                    ['Начат', formatDate(survey.startedAt)],
                    ['Закрыт', formatDate(survey.closedAt)],
                  ].map(([label, value]) => (
                    <tr key={String(label)}>
                      <th className={`${thClass} w-40 bg-gray-50/80`}>{label}</th>
                      <td className={tdClass}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Вопросы ({questions.length})</h2>
            {questions.length === 0 ? (
              <p className="text-sm text-gray-500">Вопросов нет</p>
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-200">
                      <th className={thClass}>Id</th>
                      <th className={thClass}>Текст</th>
                      <th className={thClass}>Тип</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {questions.map((question) => (
                      <tr key={question.id}>
                        <td className={tdClass}>{question.id}</td>
                        <td className={tdClass}>{question.text || '—'}</td>
                        <td className={tdClass}>{question.type || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Ответы ({answers.length})</h2>
            {answers.length === 0 ? (
              <p className="text-sm text-gray-500">Ответов нет</p>
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-200">
                      <th className={thClass}>Id</th>
                      <th className={thClass}>Вопрос</th>
                      <th className={thClass}>Респондент</th>
                      <th className={thClass}>Оцениваемый</th>
                      <th className={thClass}>Текст</th>
                      <th className={thClass}>Тип</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {answers.map((answer) => (
                      <tr key={answer.id}>
                        <td className={tdClass}>{answer.id}</td>
                        <td className={tdClass}>{answer.questionId}</td>
                        <td className={tdClass}>{answer.userId}</td>
                        <td className={tdClass}>{answer.targetId}</td>
                        <td className={tdClass}>{answer.text || '—'}</td>
                        <td className={tdClass}>{answer.type || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Назначения ({assignments.length})</h2>
            {assignments.length === 0 ? (
              <p className="text-sm text-gray-500">Назначений нет</p>
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-200">
                      <th className={thClass}>Id</th>
                      <th className={thClass}>Рецензент</th>
                      <th className={thClass}>Оцениваемый</th>
                      <th className={thClass}>Назначен</th>
                      <th className={thClass}>Завершён</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {assignments.map((assignment) => (
                      <tr key={assignment.id}>
                        <td className={tdClass}>{assignment.id}</td>
                        <td className={tdClass}>{assignment.reviewerId}</td>
                        <td className={tdClass}>{assignment.targetId}</td>
                        <td className={tdClass}>{boolLabel(assignment.isAssigned)}</td>
                        <td className={tdClass}>{boolLabel(assignment.isCompleted)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Пользователи ({users.length})</h2>
            <p className="text-xs text-gray-400 font-mono mb-4">GET /api/user</p>
            {users.length === 0 ? (
              <p className="text-sm text-gray-500">Пользователей нет</p>
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-200">
                      <th className={thClass}>Id</th>
                      <th className={thClass}>Имя</th>
                      <th className={thClass}>Email</th>
                      <th className={thClass}>Создан</th>
                      <th className={thClass}>Обновлён</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className={`${tdClass} font-mono`}>{user.id}</td>
                        <td className={tdClass}>{user.name || '—'}</td>
                        <td className={tdClass}>{user.email || '—'}</td>
                        <td className={tdClass}>{formatDate(user.createdAt)}</td>
                        <td className={tdClass}>{formatDate(user.updatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Ответ API (JSON)</h2>
            <pre className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-700 overflow-x-auto">
              {JSON.stringify({ ...details, users }, null, 2)}
            </pre>
          </section>
        </div>
      </div>
    </div>
  )
}
