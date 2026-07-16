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
  'text-left px-4 py-3 text-xs font-bold text-gray-400 dark:text-gray-500 dark:text-gray-400 uppercase tracking-wider'
const tdClass = 'px-4 py-3 text-sm text-gray-600 dark:text-gray-400'

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
        <div className="max-w-6xl mx-auto text-sm text-gray-500 dark:text-gray-300">Загрузка…</div>
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
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 border-2 border-orange-300 dark:border-[#FF8600]/45 rounded-xl hover:bg-orange-50 dark:hover:bg-[#FF8600]/12 cursor-pointer"
            >
              К списку опросов
            </button>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Опрос не найден</h1>
          {error && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/40 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3">
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
      <header className="bg-white dark:bg-[#1e222e] border-b border-gray-200 dark:border-[#3a4250] p-6 flex-shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Опрос: {survey.name}</h1>
            <p className="text-xs text-gray-400 dark:text-gray-400 dark:text-gray-300 mt-1 font-mono">GET /api/survey/{id}</p>
          </div>
          <div className="flex items-center justify-end sm:self-start">
            <button
              type="button"
              onClick={onBack}
              className="soft-press px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 border-2 border-orange-300 dark:border-[#FF8600]/45 rounded-xl hover:bg-orange-50 dark:hover:bg-[#FF8600]/12 cursor-pointer"
            >
              К списку опросов
            </button>
          </div>
        </div>
      </header>


      <div className="p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <section className="bg-white dark:bg-[#1e222e] border border-gray-200 dark:border-[#3a4250] rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Основные данные</h2>
            <div className="border border-gray-200 dark:border-[#3a4250] rounded-xl overflow-hidden">
              <table className="w-full">
                <tbody className="divide-y divide-gray-100 dark:divide-[#3a4250]">
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
                      <th className={`${thClass} w-40 bg-gray-50/80 dark:bg-[#161a22]/80`}>{label}</th>
                      <td className={tdClass}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-white dark:bg-[#1e222e] border border-gray-200 dark:border-[#3a4250] rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Вопросы ({questions.length})</h2>
            {questions.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-300">Вопросов нет</p>
            ) : (
              <div className="border border-gray-200 dark:border-[#3a4250] rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/80 dark:bg-[#161a22]/80 border-b border-gray-200 dark:border-[#3a4250]">
                      <th className={thClass}>Id</th>
                      <th className={thClass}>Текст</th>
                      <th className={thClass}>Тип</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#3a4250]">
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

          <section className="bg-white dark:bg-[#1e222e] border border-gray-200 dark:border-[#3a4250] rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Ответы ({answers.length})</h2>
            {answers.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-300">Ответов нет</p>
            ) : (
              <div className="border border-gray-200 dark:border-[#3a4250] rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/80 dark:bg-[#161a22]/80 border-b border-gray-200 dark:border-[#3a4250]">
                      <th className={thClass}>Id</th>
                      <th className={thClass}>Вопрос</th>
                      <th className={thClass}>Респондент</th>
                      <th className={thClass}>Оцениваемый</th>
                      <th className={thClass}>Текст</th>
                      <th className={thClass}>Тип</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#3a4250]">
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

          <section className="bg-white dark:bg-[#1e222e] border border-gray-200 dark:border-[#3a4250] rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Назначения ({assignments.length})</h2>
            {assignments.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-300">Назначений нет</p>
            ) : (
              <div className="border border-gray-200 dark:border-[#3a4250] rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/80 dark:bg-[#161a22]/80 border-b border-gray-200 dark:border-[#3a4250]">
                      <th className={thClass}>Id</th>
                      <th className={thClass}>Рецензент</th>
                      <th className={thClass}>Оцениваемый</th>
                      <th className={thClass}>Назначен</th>
                      <th className={thClass}>Завершён</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#3a4250]">
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

          <section className="bg-white dark:bg-[#1e222e] border border-gray-200 dark:border-[#3a4250] rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">Пользователи ({users.length})</h2>
            <p className="text-xs text-gray-400 dark:text-gray-400 dark:text-gray-300 font-mono mb-4">GET /api/user</p>
            {users.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-300">Пользователей нет</p>
            ) : (
              <div className="border border-gray-200 dark:border-[#3a4250] rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/80 dark:bg-[#161a22]/80 border-b border-gray-200 dark:border-[#3a4250]">
                      <th className={thClass}>Id</th>
                      <th className={thClass}>Имя</th>
                      <th className={thClass}>Email</th>
                      <th className={thClass}>Создан</th>
                      <th className={thClass}>Обновлён</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#3a4250]">
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

          <section className="bg-white dark:bg-[#1e222e] border border-gray-200 dark:border-[#3a4250] rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Ответ API (JSON)</h2>
            <pre className="bg-gray-50 dark:bg-[#161a22] border border-gray-200 dark:border-[#3a4250] rounded-xl p-4 text-xs text-gray-700 dark:text-gray-200 overflow-x-auto">
              {JSON.stringify({ ...details, users }, null, 2)}
            </pre>
          </section>
        </div>
      </div>
    </div>
  )
}
