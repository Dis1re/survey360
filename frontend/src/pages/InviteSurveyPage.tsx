import { useEffect, useState } from 'react'
import { surveyApi } from '../api'
import { TakeSurvey } from './TakeSurvey'

export function InviteSurveyPage({ token }: { token: string }) {
  const [surveyId, setSurveyId] = useState<number | null>(null)
  const [reviewerId, setReviewerId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    surveyApi
      .resolveInvite(token)
      .then((info) => {
        setSurveyId(info.surveyId)
        setReviewerId(info.reviewerId)
        setError(null)
      })
      .catch(() => setError('Ссылка недействительна или устарела'))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <p className="text-sm text-gray-500">Загрузка…</p>
      </div>
    )
  }

  if (error || surveyId === null || reviewerId === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl p-8 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-gray-900">Ссылка недоступна</h2>
          <p className="text-sm text-gray-500 mt-2">{error ?? 'Не удалось открыть опрос'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TakeSurvey surveyId={surveyId} lockedReviewerId={reviewerId} standalone />
    </div>
  )
}
