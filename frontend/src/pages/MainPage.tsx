import { useEffect, useMemo, useState } from 'react'
import { MatrixTable, matrixToEntries } from '../components/MatrixTable'
import { SIDEBAR_WIDTH_COLLAPSED, SIDEBAR_WIDTH_EXPANDED } from '../components/Sidebar'
import { ConfirmModal } from '../components/ConfirmModal'
import { Modal } from '../components/Modal'
import { QuestionEditor } from '../components/QuestionEditor'
import { QuestionList } from '../components/QuestionList'
import { ResponseModal } from '../components/ResponseModal'
import { SurveyHeader, type SurveyHeaderForm, type StartSurveyPayload } from '../components/SurveyHeader'
import { TabBar, type Tab } from '../components/TabBar'
import { TemplatesModal } from '../components/TemplatesModal'
import { TemplateEditor } from '../components/TemplateEditor'
import { useSurveyLive } from '../hooks/useSurveyLive'
import { useSurveyData } from '../hooks/useSurveyData'
import { useMatrix } from '../hooks/useMatrix'
import { useInviteManager } from '../hooks/useInviteManager'
import { surveyApi } from '../api'
import { mapSurveyStatus } from '../mappers'

interface MainPageProps {
  surveyId: number | null
  onSurveyUpdated?: () => void
  onSurveyDeleted?: () => void | Promise<void>
  sidebarCollapsed?: boolean
}

export function MainPage({ surveyId, onSurveyUpdated, onSurveyDeleted, sidebarCollapsed = false }: MainPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>('editor')
  const [matrixExpanded, setMatrixExpanded] = useState(false)
  const [templateModal, setTemplateModal] = useState<'save' | 'load' | null>(null)
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null)

  const {
    respondentLinks,
    sendingInvites,
    inviteResult,
    setInviteResult,
    exportingReport,
    exportingCsv,
    loadRespondentLinks,
    handleSendInvites,
    handleExportReport,
    handleExportCsv,
  } = useInviteManager(surveyId)

  const {
    targets,
    respondents,
    assignments,
    completedAssignments,
    savingMatrix,
    addingMatrixParticipant,
    responseView,
    setResponseView,
    loadMatrix,
    handleAddMatrixParticipant,
    handleRemoveMatrixParticipant,
    handleSaveMatrix,
    clearMatrix,
  } = useMatrix(surveyId)

  const {
    survey,
    setSurvey,
    questions,
    allUsers,
    activeQuestionId,
    setActiveQuestionId,
    surveyStatus,
    surveyEditable,
    reportInfo,
    loading,
    loadError,
    savingSurvey,
    startingSurvey,
    stoppingSurvey,
    creatingQuestion,
    savingQuestion,
    deletingQuestion,
    deletingAll,
    confirmDeleteAll,
    setConfirmDeleteAll,
    loadSurvey,
    loadUsers,
    handleSaveSurvey,
    handleStartSurvey,
    handleStopSurvey,
    handleCreateQuestion,
    handleSaveQuestion,
    handleDeleteQuestion,
    handleReorderQuestions,
    handleConfirmDeleteAll,
    handleDeleteSurvey,
    activeQuestion,
  } = useSurveyData(surveyId, onSurveyUpdated, onSurveyDeleted, loadMatrix, loadRespondentLinks, clearMatrix)

  const canExport = surveyStatus === 'closed' || (reportInfo?.answerCount ?? 0) > 0

  const handleStartSurveyWithAssignments = async (data: StartSurveyPayload) => {
    if (surveyId === null) return
    const entries = matrixToEntries(assignments, respondents, targets).map((e) => ({
      reviewerId: e.reviewerId,
      targetId: e.targetId,
      isAssigned: e.isAssigned,
    }))
    await surveyApi.saveAssignments(surveyId, entries)
    await handleStartSurvey(data)
  }

  useSurveyLive((event) => {
    if (surveyId === null || event.surveyId !== surveyId) return
    setSurvey((prev) => (prev ? { ...prev, status: event.status } : prev))
    void loadMatrix(surveyId).catch(console.error)
  })

  const surveyHeaderInitial = useMemo<SurveyHeaderForm>(
    () => ({
      title: survey?.name ?? '',
      description: survey?.description ?? '',
    }),
    [survey],
  )

  const hasQuestions = questions.length > 0
  const matrixFilled =
    targets.length > 0 &&
    respondents.length > 0 &&
    Object.values(assignments).some((row) => Object.values(row).some(Boolean))
  const canStart = hasQuestions && matrixFilled
  const startHint = !hasQuestions && !matrixFilled
    ? 'Добавьте хотя бы один вопрос и заполните матрицу назначений'
    : !hasQuestions
      ? 'Добавьте хотя бы один вопрос'
      : !matrixFilled
        ? 'Заполните матрицу назначений (хотя бы одну пару «оценивающий → оцениваемый»)'
        : ''

  if (editingTemplateId !== null) {
    return (
      <TemplateEditor
        templateId={editingTemplateId}
        onBack={() => {
          setEditingTemplateId(null)
          setTemplateModal('load')
        }}
      />
    )
  }

  if (surveyId === null) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <p className="text-sm text-gray-500">
          {loading ? 'Загрузка…' : 'Нет опросов. Создайте первый в боковой панели.'}
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <p className="text-sm text-gray-500">Загрузка опроса…</p>
      </div>
    )
  }

  if (!survey) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <p className="text-sm text-gray-500">{loadError ?? 'Не удалось загрузить опрос'}</p>
      </div>
    )
  }

  return (
    <div className="relative min-h-full">
      <SurveyHeader
        surveyId={surveyId}
        initial={surveyHeaderInitial}
        status={surveyStatus}
        startedAt={survey.startedAt}
        closedAt={survey.closedAt}
        saving={savingSurvey}
        starting={startingSurvey}
        stopping={stoppingSurvey}
        canStart={canStart}
        startHint={startHint}
        onSave={handleSaveSurvey}
        onStartSurvey={handleStartSurveyWithAssignments}
        onStopSurvey={handleStopSurvey}
        onUserCreated={loadUsers}
        onDelete={handleDeleteSurvey}
      />
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'editor' && (
        <div className="p-6">
          <div className="max-w-6xl mx-auto space-y-3">
            <div className="flex justify-start gap-2">
              <button
                type="button"
                onClick={() => setTemplateModal('save')}
                disabled={questions.length === 0}
                className="soft-press px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-default cursor-pointer"
                title={questions.length === 0 ? 'Добавьте хотя бы один вопрос' : ''}
              >
                Сохранить как шаблон
              </button>
              {surveyEditable && (
                <button
                  type="button"
                  onClick={() => setTemplateModal('load')}
                  className="soft-press px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  Загрузить из шаблона
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <QuestionList
                  questions={questions}
                  activeQuestionId={activeQuestionId}
                  creating={creatingQuestion}
                  readOnly={!surveyEditable}
                  onQuestionSelect={setActiveQuestionId}
                  onQuestionCreate={handleCreateQuestion}
                  onQuestionDelete={handleDeleteQuestion}
                  onReorder={handleReorderQuestions}
                  onDeleteAll={() => setConfirmDeleteAll(true)}
                  deleting={deletingQuestion}
                  onPreview={() =>
                    surveyId !== null && window.open(`${window.location.origin}/survey/${surveyId}?preview=1`, '_blank', 'noopener,noreferrer')
                  }
                />
              </div>
              <div className="lg:col-span-2">
                <QuestionEditor
                  question={activeQuestion}
                  saving={savingQuestion}
                  readOnly={!surveyEditable}
                  onSave={handleSaveQuestion}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'matrix' && (
        <div className="p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            <MatrixTable
              key={surveyId}
              targets={targets}
              respondents={respondents}
              allUsers={allUsers}
              initialAssignments={assignments}
              completedAssignments={completedAssignments}
              saving={savingMatrix}
              adding={addingMatrixParticipant}
              exporting={exportingReport}
              exportingCsv={exportingCsv}
              canExport={canExport}
              sendingInvites={sendingInvites}
              readOnly={!surveyEditable}
              surveyActive={surveyStatus === 'active'}
              surveyName={survey?.name ?? ''}
              respondentLinks={respondentLinks}
              onExportReport={handleExportReport}
              onExportCsv={handleExportCsv}
              onSendInvites={handleSendInvites}
              onViewResponse={(info) => setResponseView(info)}
              onAddParticipant={(userIds, role) => handleAddMatrixParticipant(userIds, role, surveyEditable)}
              onRemoveParticipant={(userId, role) => handleRemoveMatrixParticipant(userId, role, surveyEditable)}
              onSave={(next) => handleSaveMatrix(next, surveyEditable)}
              onExpand={() => setMatrixExpanded(true)}
            />

            {matrixExpanded && (
              <Modal
                title="Матрица оценки"
                description={survey?.name}
                size="full"
                scrollable
                onClose={() => setMatrixExpanded(false)}
                closeOnBackdrop={false}
              >
                <MatrixTable
                  key={`expanded-${surveyId}`}
                  targets={targets}
                  respondents={respondents}
                  allUsers={allUsers}
                  initialAssignments={assignments}
                  completedAssignments={completedAssignments}
                  saving={savingMatrix}
                  adding={addingMatrixParticipant}
                  exporting={exportingReport}
                  sendingInvites={sendingInvites}
                  readOnly={!surveyEditable}
                  surveyActive={surveyStatus === 'active'}
                  surveyName={survey?.name ?? ''}
                  respondentLinks={respondentLinks}
                  onExportReport={handleExportReport}
                  onSendInvites={handleSendInvites}
                  onAddParticipant={(userIds, role) => handleAddMatrixParticipant(userIds, role, surveyEditable)}
                  onRemoveParticipant={(userId, role) => handleRemoveMatrixParticipant(userId, role, surveyEditable)}
                  onSave={(next) => handleSaveMatrix(next, surveyEditable)}
                  onViewResponse={(info) => setResponseView(info)}
                  expanded
                />
              </Modal>
            )}
          </div>
        </div>
      )}

      {templateModal && (
        <TemplatesModal
          surveyId={surveyId}
          surveyName={survey?.name ?? ''}
          mode={templateModal}
          onClose={() => setTemplateModal(null)}
          onLoaded={() => {
            setTemplateModal(null)
            if (surveyId) loadSurvey(surveyId)
          }}
          onEditTemplate={(id) => {
            setTemplateModal(null)
            setEditingTemplateId(id)
          }}
        />
      )}

      {inviteResult && (
        <ConfirmModal
          title={inviteResult.title}
          variant={inviteResult.variant}
          message={inviteResult.message}
          confirmLabel="Понятно"
          hideCancel
          onConfirm={() => setInviteResult(null)}
          onCancel={() => setInviteResult(null)}
        />
      )}

      {confirmDeleteAll && (
        <ConfirmModal
          title="Удалить все вопросы?"
          variant="danger"
          confirmLabel="Удалить всё"
          loadingLabel="Удаление…"
          loading={deletingAll}
          onConfirm={handleConfirmDeleteAll}
          onCancel={() => !deletingAll && setConfirmDeleteAll(false)}
          message="Все вопросы анкеты и связанные с ними ответы будут безвозвратно удалены. Действие нельзя отменить."
        />
      )}

      {responseView && surveyId !== null && (
        <ResponseModal
          surveyId={surveyId}
          reviewerId={responseView.reviewerId}
          targetId={responseView.targetId}
          reviewerName={responseView.reviewerName}
          targetName={responseView.targetName}
          fullscreen
          sidebarWidth={sidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED}
          onClose={() => setResponseView(null)}
        />
      )}
    </div>
  )
}
