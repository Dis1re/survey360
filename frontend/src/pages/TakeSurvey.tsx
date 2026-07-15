import { Modal } from '../components/Modal'
import { UserPicker } from '../components/UserPicker'
import { TargetPicker } from '../components/TargetPicker'
import { QuestionInput } from '../components/QuestionInput'
import { useSurveyTaking } from '../hooks/useSurveyTaking'
import { mapSurveyStatus } from '../mappers'

interface TakeSurveyProps {
  surveyId: number
  onBack?: () => void
  standalone?: boolean
  authUserId?: number | null
  hideUserSwitch?: boolean
  lockedReviewerId?: number
  preview?: boolean
}

export function TakeSurvey({
  surveyId,
  onBack,
  standalone = false,
  authUserId = null,
  hideUserSwitch = false,
  lockedReviewerId,
  preview = false,
}: TakeSurveyProps) {
  const {
    survey,
    questions,
    answers,
    loading,
    autoResolvingTarget,
    submitting,
    submitted,
    thanksPopupOpen,
    setThanksPopupOpen,
    error,
    userId,
    targetId,
    userModalOpen,
    setUserModalOpen,
    targetModalOpen,
    setTargetModalOpen,
    surveyClosed,
    lockedUserId,
    reviewerLocked,
    userPickerLocked,
    showUserModal,
    showTargetModal,
    effectiveReadOnly,
    respondent,
    target,
    assignmentChecked,
    setAnswer,
    handleSelectUser,
    handleSelectTarget,
    handleBackToUsers,
    handleSubmit,
    setSubmitted,
    setTargetId,
  } = useSurveyTaking({ surveyId, authUserId, lockedReviewerId, hideUserSwitch, preview })

  if (loading || autoResolvingTarget) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh] p-6">
        <p className="text-sm text-gray-500">Загрузка опроса…</p>
      </div>
    )
  }

  if (hideUserSwitch && lockedUserId !== null && targetId === null && !targetModalOpen) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh] p-6">
        <div className="text-center max-w-md">
          <p className="text-sm text-gray-500">Для вас нет назначенных целей в этом опросе</p>
        </div>
      </div>
    )
  }

  if (surveyClosed && !effectiveReadOnly && targetId !== null && assignmentChecked) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">{survey?.name ?? 'Опрос'}</h2>
          <p className="text-sm text-gray-500 mt-3">
            {mapSurveyStatus(survey?.status ?? '') === 'closed'
              ? 'Этот опрос завершён. Новые ответы отправить нельзя — выберите цель с уже отправленными ответами для просмотра.'
              : 'Опрос ещё не опубликован. Дождитесь, пока организатор запустит его.'}
          </p>
          {hideUserSwitch && (
            <button
              type="button"
              onClick={() => { setTargetId(null); setTargetModalOpen(true) }}
              className="mt-6 px-4 py-2 text-sm font-medium text-white bg-[#FF8600] hover:bg-[#FF6B00] rounded-xl cursor-pointer"
            >
              Выбрать цель для просмотра
            </button>
          )}
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <>
        {thanksPopupOpen && (
          <div className="fixed top-4 right-4 z-50 w-72 bg-white border border-gray-200 rounded-2xl shadow-lg p-4 flex items-start gap-3">
            <img src="/sobaka.webp" alt="" className="w-12 h-12 rounded-full object-cover shrink-0" />
            <p className="flex-1 min-w-0 text-sm font-medium text-gray-900">
              Спасибо за помощь в улучшении работы! Ты крут!
            </p>
            <button
              type="button"
              onClick={() => setThanksPopupOpen(false)}
              className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
              aria-label="Закрыть"
            >
              ✕
            </button>
          </div>
        )}
        <div className="max-w-2xl mx-auto p-6 text-center">
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
            <div className="mx-auto w-20 h-20 rounded-full bg-green-100 flex items-center justify-center overflow-hidden">
              <img src="/cat_icon.webp" alt="Успешное завершение" className="w-full h-full object-cover" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mt-4">Спасибо!</h2>
            <p className="text-sm text-gray-500 mt-1">Ваши ответы успешно сохранены в базе данных.</p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false)
                  setTargetId(null)
                  if (!hideUserSwitch) setTargetModalOpen(true)
                }}
                className="px-4 py-2 text-sm font-medium text-gray-600 border-2 border-orange-300 rounded-xl hover:bg-orange-50 cursor-pointer"
              >
                {standalone || userPickerLocked ? 'Оценить ещё' : 'Другой пользователь'}
              </button>
              {!standalone && onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#FF8600] hover:bg-[#FF6B00] rounded-xl cursor-pointer"
                >
                  Вернуться к опросам
                </button>
              )}
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {hideUserSwitch && !standalone && lockedUserId !== null && targetId !== null && (
        <div className="flex justify-end mb-4">
          <button
            type="button"
            onClick={() => setTargetModalOpen(true)}
            className="soft-press text-xs font-medium text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 cursor-pointer"
          >
            Сменить цель
          </button>
        </div>
      )}

      {!standalone && onBack && (
        <div className="flex items-start justify-between gap-3 mb-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Назад
          </button>
          <div className="flex gap-2">
            {!userPickerLocked && (
              <button
                type="button"
                onClick={() => setUserModalOpen(true)}
                className="text-xs font-medium text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 cursor-pointer"
              >
                Сменить пользователя
              </button>
            )}
            <button
              type="button"
              onClick={() => setTargetModalOpen(true)}
              className="text-xs font-medium text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 cursor-pointer"
            >
              Сменить цель
            </button>
          </div>
        </div>
      )}

      {standalone && lockedUserId !== null && targetId !== null && (
        <div className="flex justify-end gap-2 mb-4">
          {!userPickerLocked && (
            <button
              type="button"
              onClick={() => setUserModalOpen(true)}
              className="text-xs font-medium text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 cursor-pointer"
            >
              Сменить пользователя
            </button>
          )}
          <button
            type="button"
            onClick={() => setTargetModalOpen(true)}
            className="text-xs font-medium text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 cursor-pointer"
          >
            Сменить цель
          </button>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mb-5">
        {preview && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-200 px-4 py-2.5 text-sm text-blue-700">
            <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Режим предпросмотра
          </div>
        )}
        {effectiveReadOnly && !preview && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-gray-100 border border-gray-200 px-4 py-2.5 text-sm text-gray-600">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            {surveyClosed
              ? 'Опрос завершён — просмотр ваших отправленных ответов'
              : 'Режим просмотра — ответы нельзя изменить'}
          </div>
        )}
        {survey?.description && (
          <p className="text-sm text-gray-500 mt-1">{survey.description}</p>
        )}
        {respondent && (
          <p className="text-xs text-gray-400 mt-2">
            Ответы записываются за пользователя: <span className="font-medium text-gray-600">{respondent.name}</span>
          </p>
        )}
        {!preview && (
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-orange-100 border-2 border-orange-300 px-4 py-3 shadow-sm">
            <svg className="w-6 h-6 text-[#FF6B00] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-sm text-gray-600">
              Опрос по:{' '}
              <span className="ml-1 text-lg font-bold text-gray-900">
                {target ? target.name : '— не задано —'}
              </span>
            </span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className={`space-y-4 ${effectiveReadOnly ? 'opacity-75' : ''}`}>
        {questions.length === 0 ? (
          <p className="text-sm text-gray-400">В этом опросе пока нет вопросов.</p>
        ) : (
          questions.map((question, index) => (
            <div key={question.id} className="soft-lift bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <label className="block text-sm font-medium text-gray-900 mb-3">
                <span className="text-gray-400 mr-1.5">{index + 1}.</span>
                {question.text}
                {question.isRequired && (
                  <span className="ml-1.5 text-red-500" title="Обязательный вопрос">*</span>
                )}
              </label>
              <QuestionInput
                question={question}
                value={answers[question.id] ?? ''}
                onChange={(v) => setAnswer(question.id, v)}
                readOnly={effectiveReadOnly}
              />
            </div>
          ))
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        {!effectiveReadOnly && (
          <button
            type="submit"
            disabled={submitting || questions.length === 0}
            className="w-full bg-[#FF8600] hover:bg-[#FF6B00] disabled:opacity-50 text-white font-medium py-3 px-4 rounded-xl soft-press shadow-sm cursor-pointer"
          >
            {submitting ? 'Отправка…' : 'Отправить ответы'}
          </button>
        )}
      </form>

      {preview && (
        <div className="flex justify-center mt-6">
          <button
            type="button"
            onClick={() => window.close()}
            className="px-6 py-2.5 text-sm font-medium text-white bg-[#FF8600] hover:bg-[#FF6B00] rounded-xl soft-press shadow-sm cursor-pointer"
          >
            Выйти из предпросмотра
          </button>
        </div>
      )}

      {showUserModal && (
        <Modal title="Выбор пользователя">
          <UserPicker
            surveyId={surveyId}
            onSelect={handleSelectUser}
            onBack={onBack ?? (() => {})}
            showBack={!standalone || userId !== null}
          />
        </Modal>
      )}

      {showTargetModal && lockedUserId !== null && (
        <Modal title="Выбор цели опроса">
          <TargetPicker
            surveyId={surveyId}
            userId={lockedUserId}
            onSelect={handleSelectTarget}
            onBack={hideUserSwitch && !reviewerLocked ? () => setTargetModalOpen(false) : handleBackToUsers}
            backLabel={hideUserSwitch ? 'Отмена' : 'Сменить пользователя'}
            hideBackButton={userPickerLocked}
          />
        </Modal>
      )}
    </div>
  )
}
