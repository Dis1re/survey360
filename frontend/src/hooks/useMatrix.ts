import { useCallback, useState } from 'react'
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
  handleAddMatrixParticipant: (userIds: number[], role: 'target' | 'respondent') => Promise<void>
  handleRemoveMatrixParticipant: (userId: number, role: 'target' | 'respondent') => Promise<void>
  handleSaveMatrix: (next: Record<string, Record<string, boolean>>) => Promise<void>
  setTargets: React.Dispatch<React.SetStateAction<Participant[]>>
  setRespondents: React.Dispatch<React.SetStateAction<Participant[]>>
}

export function useMatrix(surveyId: number | null, surveyEditable: boolean): UseMatrixReturn {
  const [targets, setTargets] = useState<Participant[]>([])
  const [respondents, setRespondents] = useState<Participant[]>([])
  const [assignments, setAssignments] = useState<Record<string, Record<string, boolean>>>({})
  const [completedAssignments, setCompletedAssignments] = useState<Record<string, Record<string, boolean>>>({})
  const [savingMatrix, setSavingMatrix] = useState(false)
  const [addingMatrixParticipant, setAddingMatrixParticipant] = useState(false)
  const [responseView, setResponseView] = useState<ResponseView | null>(null)

  const loadMatrix = useCallback(async (id: number) => {
    const matrix = await surveyApi.getMatrix(id)
    setTargets(usersToParticipants(matrix.targets))
    setRespondents(usersToParticipants(matrix.respondents))
    setAssignments(assignmentsToMatrix(matrix.assignments))
    setCompletedAssignments(assignmentsToCompletionMatrix(matrix.assignments))
  }, [])

  const handleAddMatrixParticipant = useCallback(async (userIds: number[], role: 'target' | 'respondent') => {
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
  }, [surveyId, surveyEditable, loadMatrix])

  const handleRemoveMatrixParticipant = useCallback(async (userId: number, role: 'target' | 'respondent') => {
    if (surveyId === null || !surveyEditable) return
    try {
      await surveyApi.removeParticipant(surveyId, userId, role)
      await loadMatrix(surveyId)
    } catch (err) {
      console.error(err)
    }
  }, [surveyId, surveyEditable, loadMatrix])

  const handleSaveMatrix = useCallback(async (next: Record<string, Record<string, boolean>>) => {
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
  }, [surveyId, surveyEditable, respondents, targets, loadMatrix])

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
    handleAddMatrixParticipant,
    handleRemoveMatrixParticipant,
    handleSaveMatrix,
    setTargets,
    setRespondents,
  }
}
