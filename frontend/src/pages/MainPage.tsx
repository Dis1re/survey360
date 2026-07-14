import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { questionApi, surveyApi, userApi } from '../api'
import { MatrixTable, matrixToEntries } from '../components/MatrixTable'
import { ConfirmModal } from '../components/ConfirmModal'
import { Modal } from '../components/Modal'
import { QuestionEditor } from '../components/QuestionEditor'
import { QuestionList } from '../components/QuestionList'
import { SurveyHeader, type SurveyHeaderForm, type StartSurveyPayload } from '../components/SurveyHeader'
import { TabBar, type Tab } from '../components/TabBar'
import { TemplatesModal } from '../components/TemplatesModal'
import { TemplateEditor } from '../components/TemplateEditor'
import { useSurveyLive } from '../hooks/useSurveyLive'
import {
  apiDateToInput,
  apiQuestionToQuestion,
  assignmentsToCompletionMatrix,
  assignmentsToMatrix,
  inputDateToApi,
  mapQuestionTypeToApi,
  mapSurveyStatus,
  mapSurveyStatusToApi,
  usersToParticipants,
} from '../mappers'
import type { ApiSurvey, ApiUser, Participant, Question, RespondentLink, SendInvitesResult, SurveyReportInfo } from '../types'

function buildInviteResultModal(result: SendInvitesResult): {
  title: string
  variant: 'default' | 'warning' | 'danger'
  message: ReactNode
} {
  const failedItems = result.items.filter((i) => i.status === 'failed')
  const variant =
    result.failed > 0 && result.sent === 0
      ? 'danger'
      : result.failed > 0 || result.skipped > 0
        ? 'warning'
        : 'default'

  const title =
    result.failed > 0 && result.sent === 0
      ? 'Не удалось отправить'
      : result.failed > 0
        ? 'Отправлено частично'
        : 'Приглашения отправлены'

  return {
    title,
    variant,
    message: (
      <div className="space-y-2">
        <p>
          Отправлено: {result.sent}
          {result.skipped > 0 ? ` · пропущено: ${result.skipped}` : ''}
          {result.failed > 0 ? ` · ошибок: ${result.failed}` : ''}
        </p>
        {failedItems.length > 0 && (
          <ul className="space-y-1 text-xs text-gray-500">
            {failedItems.map((item) => (
              <li key={item.reviewerId}>
                <span className="font-medium text-gray-700">{item.reviewerEmail || item.reviewerId}</span>
                {item.error ? ` — ${item.error}` : ''}
              </li>
            ))}
          </ul>
        )}
        {result.sent > 0 && result.failed === 0 && (
          <p className="text-xs text-gray-500">Проверьте письма в Mailtrap → Sandboxes → Emails.</p>
        )}
      </div>
    ),
  }
}

interface MainPageProps {
  surveyId: number | null
  onSurveyUpdated?: () => void
  onSurveyDeleted?: () => void | Promise<void>
}

export function MainPage({ surveyId, onSurveyUpdated, onSurveyDeleted }: MainPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>('editor')
  const [matrixExpanded, setMatrixExpanded] = useState(false)
  const [loading, setLoading] = useState(() => surveyId !== null)
  const [survey, setSurvey] = useState<ApiSurvey | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [allUsers, setAllUsers] = useState<ApiUser[]>([])
  const [targets, setTargets] = useState<Participant[]>([])
  const [respondents, setRespondents] = useState<Participant[]>([])
  const [assignments, setAssignments] = useState<Record<string, Record<string, boolean>>>({})
  const [completedAssignments, setCompletedAssignments] = useState<Record<string, Record<string, boolean>>>({})
  const [activeQuestionId, setActiveQuestionId] = useState<number | null>(null)
  const [savingSurvey, setSavingSurvey] = useState(false)
  const [startingSurvey, setStartingSurvey] = useState(false)
  const [stoppingSurvey, setStoppingSurvey] = useState(false)
  const [creatingQuestion, setCreatingQuestion] = useState(false)
  const [savingQuestion, setSavingQuestion] = useState(false)
  const [deletingQuestion, setDeletingQuestion] = useState(false)
  const [savingMatrix, setSavingMatrix] = useState(false)
  const [addingMatrixParticipant, setAddingMatrixParticipant] = useState(false)
  const [exportingReport, setExportingReport] = useState(false)
  const [sendingInvites, setSendingInvites] = useState(false)
  const [inviteResult, setInviteResult] = useState<{
    title: string
    variant: 'default' | 'warning' | 'danger'
    message: ReactNode
  } | null>(null)
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)
  const [deletingAll, setDeletingAll] = useState(false)
  const [reportInfo, setReportInfo] = useState<SurveyReportInfo | null>(null)
  const [exportingCsv, setExportingCsv] = useState(false)
  const [respondentLinks, setRespondentLinks] = useState<RespondentLink[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [templateModal, setTemplateModal] = useState<'save' | 'load' | null>(null)
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null)

  const loadUsers = useCallback(async () => {
    const users = await userApi.list()
    setAllUsers(users)
  }, [])

  const loadMatrix = useCallback(async (id: number) => {
    const matrix = await surveyApi.getMatrix(id)
    setTargets(usersToParticipants(matrix.targets))
    setRespondents(usersToParticipants(matrix.respondents))
    setAssignments(assignmentsToMatrix(matrix.assignments))
    setCompletedAssignments(assignmentsToCompletionMatrix(matrix.assignments))
  }, [])

  const loadRespondentLinks = useCallback(async (id: number) => {
    try {
      const links = await surveyApi.getRespondentLinks(id)
      setRespondentLinks(links)
    } catch (err) {
      console.error(err)
      setRespondentLinks([])
    }
  }, [])

    const loadSurvey = useCallback(async (id: number) => {
    const details = await surveyApi.get(id)
    setSurvey(details.survey)
    const mappedQuestions = details.questions.map(apiQuestionToQuestion)
    setQuestions(mappedQuestions)
    setActiveQuestionId((prev) => {
      if (prev !== null && mappedQuestions.some((q) => q.id === prev)) return prev
      return mappedQuestions[0]?.id ?? null
    })
    try {
      setReportInfo(await surveyApi.getReportInfo(id))
    } catch (err) {
      console.error(err)
      setReportInfo(null)
    }
    try {
      await loadMatrix(id)
    } catch (err) {
      console.error(err)
      setTargets([])
      setRespondents([])
      setAssignments({})
      setCompletedAssignments({})
    }
    if (mapSurveyStatus(details.survey.status) === 'active') {
      await loadRespondentLinks(id)
    } else {
      setRespondentLinks([])
    }
  }, [loadMatrix, loadRespondentLinks])

  useEffect(() => {
    if (surveyId === null) {
      setSurvey(null)
      setQuestions([])
      setAllUsers([])
      setTargets([])
      setRespondents([])
      setAssignments({})
      setCompletedAssignments({})
      setRespondentLinks([])
      setActiveQuestionId(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setLoadError(null)
    setSurvey(null)
    setQuestions([])
    setTargets([])
    setRespondents([])
    setAssignments({})
    setCompletedAssignments({})
    setActiveQuestionId(null)

    Promise.all([loadSurvey(surveyId), loadUsers()])
      .catch((err) => {
        console.error(err)
        if (!cancelled) {
          setLoadError('Не удалось загрузить опрос')
          setSurvey(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [surveyId, loadSurvey, loadUsers])

  // Live: when someone completes an assignment, refresh matrix "Ответы" links.
  useSurveyLive((event) => {
    if (surveyId === null || event.surveyId !== surveyId) return
    void loadMatrix(surveyId).catch(console.error)
    setSurvey((prev) => {
      if (!prev || prev.status === event.status) return prev
      return { ...prev, status: event.status }
    })
  })

  const surveyHeaderInitial = useMemo<SurveyHeaderForm>(
    () => ({
      title: survey?.name ?? '',
      description: survey?.description ?? '',
    }),
    [survey],
  )

  const surveyStatus = survey ? mapSurveyStatus(survey.status) : 'draft'
  const surveyEditable = surveyStatus === 'draft'
  const canExport = surveyStatus === 'closed' || (reportInfo?.answerCount ?? 0) > 0

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

  const activeQuestion = questions.find((q) => q.id === activeQuestionId) ?? null

  const handleSaveSurvey = async (data: SurveyHeaderForm) => {
    if (surveyId === null || !survey || !surveyEditable) return
    setSavingSurvey(true)
    try {
      const updated = await surveyApi.update(surveyId, {
        name: data.title.trim(),
        description: data.description.trim(),
        status: survey.status,
        startedAt: inputDateToApi(apiDateToInput(survey.startedAt ?? '')),
        closedAt: inputDateToApi(apiDateToInput(survey.closedAt ?? '')),
      })
      setSurvey(updated)
      onSurveyUpdated?.()
    } catch (err) {
      console.error(err)
      throw err
    } finally {
      setSavingSurvey(false)
    }
  }

  const handleStartSurvey = async (data: StartSurveyPayload) => {
    if (surveyId === null || !survey) return
    setStartingSurvey(true)
    try {
      const entries = matrixToEntries(assignments, respondents, targets).map((e) => ({
        reviewerId: e.reviewerId,
        targetId: e.targetId,
        isAssigned: e.isAssigned,
      }))
      await surveyApi.saveAssignments(surveyId, entries)

      const updated = await surveyApi.update(surveyId, {
        name: data.title.trim(),
        description: data.description.trim(),
        status: mapSurveyStatusToApi('active'),
        startedAt: inputDateToApi(data.startDate),
        closedAt: inputDateToApi(data.endDate),
      })
      setSurvey(updated)
      onSurveyUpdated?.()
      await loadRespondentLinks(surveyId)
    } catch (err) {
      console.error(err)
      throw err
    } finally {
      setStartingSurvey(false)
    }
  }

  const handleStopSurvey = async (data: SurveyHeaderForm) => {
    if (surveyId === null || !survey) return
    setStoppingSurvey(true)
    try {
      const today = new Date()
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      const updated = await surveyApi.update(surveyId, {
        name: data.title.trim(),
        description: data.description.trim(),
        status: mapSurveyStatusToApi('closed'),
        startedAt: inputDateToApi(apiDateToInput(survey.startedAt ?? '')),
        closedAt: inputDateToApi(todayStr),
      })
      setSurvey(updated)
      onSurveyUpdated?.()
    } catch (err) {
      console.error(err)
      throw err
    } finally {
      setStoppingSurvey(false)
    }
  }

  const handleCreateQuestion = async (text: string) => {
    if (surveyId === null || !surveyEditable) return
    setCreatingQuestion(true)
    try {
      const id = await questionApi.create({ surveyId, text, type: 'rating', isRequired: false })
      setQuestions((prev) => [...prev, apiQuestionToQuestion({ id, surveyId, text, type: 'rating' })])
      setActiveQuestionId(id)
    } catch (err) {
      console.error(err)
      throw err
    } finally {
      setCreatingQuestion(false)
    }
  }

  const handleSaveQuestion = async (updated: Question) => {
    if (!surveyEditable) return
    setSavingQuestion(true)
    try {
      const saved = await questionApi.update(updated.id, {
        text: updated.text,
        type: mapQuestionTypeToApi(updated.type),
        isRequired: updated.isRequired ?? false,
        props: updated.props,
      })
      const mapped = apiQuestionToQuestion(saved)
      setQuestions((prev) => prev.map((q) => (q.id === updated.id ? mapped : q)))
    } catch (err) {
      console.error(err)
      throw err
    } finally {
      setSavingQuestion(false)
    }
  }

  const handleAddMatrixParticipant = async (userIds: number[], role: 'target' | 'respondent') => {
    if (surveyId === null || !surveyEditable || userIds.length === 0) return
    setAddingMatrixParticipant(true)
    try {
      for (const userId of userIds) {
        await surveyApi.addParticipant(surveyId, { userId, role })
      }
      await loadMatrix(surveyId)
    } catch (err) {
      console.error(err)
      throw err
    } finally {
      setAddingMatrixParticipant(false)
    }
  }

  const handleRemoveMatrixParticipant = async (userId: number, role: 'target' | 'respondent') => {
    if (surveyId === null || !surveyEditable) return
    try {
      await surveyApi.removeParticipant(surveyId, userId, role)
      await loadMatrix(surveyId)
    } catch (err) {
      console.error(err)
      throw err
    }
  }

  const handleSaveMatrix = async (next: Record<string, Record<string, boolean>>) => {
    if (surveyId === null || !surveyEditable) return
    setSavingMatrix(true)
    try {
      const entries = matrixToEntries(next, respondents, targets).map((e) => ({
        reviewerId: e.reviewerId,
        targetId: e.targetId,
        isAssigned: e.isAssigned,
      }))
      await surveyApi.saveAssignments(surveyId, entries)
      setAssignments(next)
      await loadMatrix(surveyId)
    } catch (err) {
      console.error(err)
      throw err
    } finally {
      setSavingMatrix(false)
    }
  }

  const handleDeleteQuestion = async (id: number) => {
    if (surveyId === null || !surveyEditable) return
    setDeletingQuestion(true)
    try {
      await questionApi.delete(id)
      setQuestions((prev) => {
        const next = prev.filter((q) => q.id !== id)
        setActiveQuestionId((curr) => {
          if (curr !== id) return curr
          return next[0]?.id ?? null
        })
        return next
      })
    } catch (err) {
      console.error(err)
    } finally {
      setDeletingQuestion(false)
    }
  }

  const handleReorderQuestions = async (orderedIds: number[]) => {
    if (surveyId === null || !surveyEditable) return
    const map = new Map(questions.map((q) => [q.id, q]))
    const next = orderedIds.map((id) => map.get(id)).filter((q): q is Question => q !== undefined)
    setQuestions(next)
    try {
      await surveyApi.reorderQuestions(surveyId, orderedIds)
    } catch (err) {
      console.error(err)
      if (surveyId !== null) void loadSurvey(surveyId)
    }
  }

  const handleConfirmDeleteAll = async () => {
    if (surveyId === null) return
    setDeletingAll(true)
    try {
      await surveyApi.deleteAllQuestions(surveyId)
      setQuestions([])
      setActiveQuestionId(null)
      setConfirmDeleteAll(false)
    } catch (err) {
      console.error(err)
    } finally {
      setDeletingAll(false)
    }
  }

  const handleDeleteSurvey = async () => {
    if (surveyId === null) return
    await surveyApi.delete(surveyId)
    setSurvey(null)
    setQuestions([])
    setTargets([])
    setRespondents([])
    setAssignments({})
    setCompletedAssignments({})
    await onSurveyDeleted?.()
  }

  const handleExportReport = async () => {
    if (surveyId === null) return
    setExportingReport(true)
    try {
      const info = await surveyApi.getReportInfo(surveyId)
      if (info.answerCount === 0) {
        alert('Нет ответов для формирования отчёта.')
        return
      }
      await surveyApi.downloadReport(surveyId)
    } catch (err) {
      console.error(err)
      alert('Не удалось сформировать отчёт')
    } finally {
      setExportingReport(false)
    }
  }

  const handleExportCsv = async () => {
    if (surveyId === null) return
    setExportingCsv(true)
    try {
      await surveyApi.downloadCsv(surveyId)
    } catch (err) {
      console.error(err)
      alert('Не удалось сформировать CSV')
    } finally {
      setExportingCsv(false)
    }
  }

  const handleSendInvites = async (reviewerId?: number) => {
    if (surveyId === null) return
    setSendingInvites(true)
    try {
      const result = await surveyApi.sendInvites(surveyId, reviewerId)
      setInviteResult(buildInviteResultModal(result))
    } catch (err) {
      console.error(err)
      setInviteResult({
        title: 'Не удалось отправить',
        variant: 'danger',
        message: err instanceof Error ? err.message : 'Не удалось отправить приглашения',
      })
    } finally {
      setSendingInvites(false)
    }
  }

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
    <>
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
        onStartSurvey={handleStartSurvey}
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
              surveyId={surveyId}
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
              onAddParticipant={handleAddMatrixParticipant}
              onRemoveParticipant={handleRemoveMatrixParticipant}
              onSave={handleSaveMatrix}
              onExpand={() => setMatrixExpanded(true)}
            />

            {matrixExpanded && (
              <Modal
                title="Матрица оценки"
                description={survey?.name}
                size="full"
                onClose={() => setMatrixExpanded(false)}
                closeOnBackdrop={false}
              >
                <MatrixTable
                  key={`expanded-${surveyId}`}
                  surveyId={surveyId}
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
                  onAddParticipant={handleAddMatrixParticipant}
                  onRemoveParticipant={handleRemoveMatrixParticipant}
                  onSave={handleSaveMatrix}
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
    </>
  )
}
