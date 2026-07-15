import { useCallback, useEffect, useRef, useState } from 'react'
import { surveyApi } from '../api'
import { matrixToEntries } from '../components/MatrixTable'
import { assignmentsToCompletionMatrix, assignmentsToMatrix, usersToParticipants } from '../mappers'
import type { Participant, ResponseView } from '../types'

export interface UseMatrixReturn {
  targets: Participant[]
  respondents: Participant[]
  assignments: Record<string, Record<string, boolean>>
  completedAssignments: Record<string, Record<string, boolean>>
  savingMatrix: boolean
  addingMatrixParticipant: boolean
  responseView: ResponseView | null
  setResponseView: (v: ResponseView | null) => void
  loadMatrix: (id: number) => Promise<void>
  clearMatrix: () => void
  handleAddMatrixParticipant: (userIds: number[], role: 'target' | 'respondent', surveyEditable: boolean) => Promise<void>
  handleRemoveMatrixParticipant: (userId: number, role: 'target' | 'respondent', surveyEditable: boolean) => Promise<void>
  handleSaveMatrix: (next: Record<string, Record<string, boolean>>, surveyEditable: boolean) => Promise<void>
}

export function useMatrix(surveyId: number | null): UseMatrixReturn {
  const [targets, setTargets] = useState<Participant[]>([])
  const [respondents, setRespondents] = useState<Participant[]>([])
  const [assignments, setAssignments] = useState<Record<string, Record<string, boolean>>>({})
  const [completedAssignments, setCompletedAssignments] = useState<Record<string, Record<string, boolean>>>({})
  const [savingMatrix, setSavingMatrix] = useState(false)
  const [addingMatrixParticipant, setAddingMatrixParticipant] = useState(false)
  const [responseView, setResponseView] = useState<ResponseView | null>(null)
  const loadMatrixRequestRef = useRef(0)

  useEffect(() => {
    loadMatrixRequestRef.current += 1
    setTargets([])
    setRespondents([])
    setAssignments({})
    setCompletedAssignments({})
    setResponseView(null)
  }, [surveyId])

  const clearMatrix = useCallback(() => {
    setTargets([])
    setRespondents([])
    setAssignments({})
    setCompletedAssignments({})
  }, [])

  const loadMatrix = useCallback(async (id: number) => {
    const requestId = ++loadMatrixRequestRef.current
    const matrix = await surveyApi.getMatrix(id)
    if (requestId !== loadMatrixRequestRef.current) return
    setTargets(usersToParticipants(matrix.targets))
    setRespondents(usersToParticipants(matrix.respondents))
    setAssignments(assignmentsToMatrix(matrix.assignments))
    setCompletedAssignments(assignmentsToCompletionMatrix(matrix.assignments))
  }, [])

  const handleAddMatrixParticipant = useCallback(async (userIds: number[], role: 'target' | 'respondent', surveyEditable: boolean) => {
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
  }, [surveyId, loadMatrix])

  const handleRemoveMatrixParticipant = useCallback(async (userId: number, role: 'target' | 'respondent', surveyEditable: boolean) => {
    if (surveyId === null || !surveyEditable) return
    try {
      await surveyApi.removeParticipant(surveyId, userId, role)
      await loadMatrix(surveyId)
    } catch (err) {
      console.error(err)
      throw err
    }
  }, [surveyId, loadMatrix])

  const handleSaveMatrix = useCallback(async (next: Record<string, Record<string, boolean>>, surveyEditable: boolean) => {
    if (surveyId === null || !surveyEditable) return
    if (respondents.length === 0 || targets.length === 0) return
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
  }, [surveyId, respondents, targets, loadMatrix])

  return {
    targets,
    respondents,
    assignments,
    completedAssignments,
    savingMatrix,
    addingMatrixParticipant,
    responseView,
    setResponseView,
    loadMatrix,
    clearMatrix,
    handleAddMatrixParticipant,
    handleRemoveMatrixParticipant,
    handleSaveMatrix,
  }
}
