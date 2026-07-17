import { useCallback, useEffect, useState } from 'react'
import { userGroupApi } from '../api'
import type { ApiUser, UserGroup } from '../types'
import { ConfirmModal } from './ConfirmModal'
import { Modal } from './Modal'

interface UserPickerModalProps {
  title: string
  allUsers: ApiUser[]
  existingIds: number[]
  initialSelectedIds?: number[]
  adding?: boolean
  onClose: () => void
  onAdd: (userIds: number[]) => Promise<void>
  onRemove?: (userIds: number[]) => Promise<void>
}

export function UserPickerModal({
  title,
  allUsers,
  existingIds,
  initialSelectedIds: _initialSelectedIds = [],
  adding = false,
  onClose,
  onAdd,
  onRemove,
}: UserPickerModalProps) {
  const [tab, setTab] = useState<'users' | 'groups'>('users')
  const [search, setSearch] = useState('')
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>(_initialSelectedIds)
  const [removingIds, setRemovingIds] = useState<number[]>([])

  const [groups, setGroups] = useState<UserGroup[]>([])
  const [expandedGroupId, setExpandedGroupId] = useState<string | number | null>(null)
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([])

  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [editingGroup, setEditingGroup] = useState<UserGroup | null>(null)
  const [groupName, setGroupName] = useState('')
  const [groupMemberIds, setGroupMemberIds] = useState<number[]>([])
  const [savingGroup, setSavingGroup] = useState(false)
  const [deletingGroupId, setDeletingGroupId] = useState<number | null>(null)
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState<UserGroup | null>(null)
  const [groupSearch, setGroupSearch] = useState('')

  const loadGroups = useCallback(async () => {
    try {
      setGroups(await userGroupApi.list())
    } catch (err) {
      console.error(err)
    }
  }, [])

  useEffect(() => { loadGroups() }, [loadGroups])

  useEffect(() => {
    setRemovingIds((prev) => prev.filter((id) => existingIds.includes(id)))
  }, [existingIds])

  const filteredUsers = allUsers.filter((u) => {
    if (removingIds.includes(u.id)) return false
    const q = search.trim().toLowerCase()
    if (!q) return true
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  })

  const filteredGroups = groups.filter((g) => {
    const q = groupSearch.trim().toLowerCase()
    if (!q) return true
    return g.name.toLowerCase().includes(q)
  })

  const toggleUser = (userId: number) => {
    if (existingIds.includes(userId)) {
      setRemovingIds((prev) => prev.includes(userId) ? prev : [...prev, userId])
      if (onRemove) onRemove([userId]).catch(console.error)
      return
    }
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    )
  }

  const toggleAllUsers = () => {
    const nonExisting = filteredUsers.filter((u) => !existingIds.includes(u.id))
    setSelectedUserIds((prev) =>
      prev.length === nonExisting.length ? [] : nonExisting.map((u) => u.id),
    )
  }

  const toggleGroup = (group: UserGroup) => {
    const existingMemberIds = group.userIds.filter((id) => existingIds.includes(id))
    const nonExistingMemberIds = group.userIds.filter((id) => !existingIds.includes(id))

    const allIn = group.userIds.every((id) => existingIds.includes(id) || selectedUserIds.includes(id))

    if (allIn) {
      setSelectedGroupIds((prev) => prev.filter((id) => id !== group.id))
      if (existingMemberIds.length > 0) {
        setRemovingIds((prev) => [...new Set([...prev, ...existingMemberIds])])
        if (onRemove) onRemove(existingMemberIds).catch(console.error)
      }
      if (nonExistingMemberIds.length > 0) {
        setSelectedUserIds((prev) => {
          const remaining = new Set(prev)
          for (const id of nonExistingMemberIds) {
            const inOtherGroup = groups.some(
              (g) => g.id !== group.id && selectedGroupIds.includes(g.id) && g.userIds.includes(id),
            )
            if (!inOtherGroup) remaining.delete(id)
          }
          return [...remaining]
        })
      }
    } else {
      setSelectedGroupIds((prev) => prev.includes(group.id) ? prev : [...prev, group.id])
      if (nonExistingMemberIds.length > 0) {
        setSelectedUserIds((prev) => [...new Set([...prev, ...nonExistingMemberIds])])
      }
    }
  }

  const toggleGroupMember = (group: UserGroup, memberId: number) => {
    if (existingIds.includes(memberId)) {
      setRemovingIds((prev) => prev.includes(memberId) ? prev : [...prev, memberId])
      if (onRemove) onRemove([memberId]).catch(console.error)
      return
    }
    setSelectedUserIds((prev) => {
      if (prev.includes(memberId)) {
        return prev.filter((id) => id !== memberId)
      }
      if (!selectedGroupIds.includes(group.id)) {
        setSelectedGroupIds((prev2) => [...prev2, group.id])
      }
      return [...prev, memberId]
    })
  }

  const removeGroupFromSelection = (group: UserGroup) => {
    const existingMemberIds = group.userIds.filter((id) => existingIds.includes(id))
    const nonExistingMemberIds = group.userIds.filter((id) => !existingIds.includes(id))

    setSelectedGroupIds((prev) => prev.filter((id) => id !== group.id))
    if (existingMemberIds.length > 0) {
      setRemovingIds((prev) => [...new Set([...prev, ...existingMemberIds])])
      if (onRemove) onRemove(existingMemberIds).catch(console.error)
    }
    if (nonExistingMemberIds.length > 0) {
      setSelectedUserIds((prev) => {
        const remaining = new Set(prev)
        for (const id of nonExistingMemberIds) {
          const inOtherGroup = groups.some(
            (g) => g.id !== group.id && selectedGroupIds.includes(g.id) && g.userIds.includes(id),
          )
          if (!inOtherGroup) remaining.delete(id)
        }
        return [...remaining]
      })
    }
  }

  const openCreateGroup = () => {
    setEditingGroup(null)
    setIsCreatingGroup(true)
    setGroupName('')
    setGroupMemberIds([])
    setGroupSearch('')
  }

  const openEditGroup = (group: UserGroup) => {
    setEditingGroup(group)
    setIsCreatingGroup(true)
    setGroupName(group.name)
    setGroupMemberIds(group.userIds)
    setGroupSearch('')
  }

  const cancelGroupForm = () => {
    setEditingGroup(null)
    setIsCreatingGroup(false)
    setGroupName('')
    setGroupMemberIds([])
  }

  const saveGroup = async () => {
    if (!groupName.trim() || groupMemberIds.length === 0) return
    setSavingGroup(true)
    try {
      if (editingGroup) {
        await userGroupApi.update(editingGroup.id, { name: groupName.trim(), userIds: groupMemberIds })
      } else {
        await userGroupApi.create({ name: groupName.trim(), userIds: groupMemberIds })
      }
      cancelGroupForm()
      await loadGroups()
    } finally {
      setSavingGroup(false)
    }
  }

  const confirmDeleteGroupAction = async () => {
    if (!confirmDeleteGroup) return
    setDeletingGroupId(confirmDeleteGroup.id)
    try {
      await userGroupApi.delete(confirmDeleteGroup.id)
      if (editingGroup?.id === confirmDeleteGroup.id) cancelGroupForm()
      setSelectedGroupIds((prev) => prev.filter((gid) => gid !== confirmDeleteGroup.id))
      await loadGroups()
    } finally {
      setDeletingGroupId(null)
      setConfirmDeleteGroup(null)
    }
  }

  const getGroupSelectionState = (group: UserGroup) => {
    const allIn = group.userIds.every((id) => existingIds.includes(id) || selectedUserIds.includes(id))
    if (allIn) return 'all' as const
    const someIn = group.userIds.some((id) => existingIds.includes(id) || selectedUserIds.includes(id))
    if (someIn) return 'some' as const
    return 'none' as const
  }

  const selectedGroups = groups.filter((g) => {
    if (!selectedGroupIds.includes(g.id)) return false
    return g.userIds.some((id) => (selectedUserIds.includes(id) || existingIds.includes(id)) && !removingIds.includes(id))
  })

  const selectedIndividuals = allUsers.filter((u) => {
    if (removingIds.includes(u.id)) return false
    if (!selectedUserIds.includes(u.id) && !existingIds.includes(u.id)) return false
    return !selectedGroupIds.some((gid) => groups.find((g) => g.id === gid)?.userIds.includes(u.id))
  })

  return (
    <Modal title={title} size="xl" onClose={onClose} preventClose={adding}>
      <div className="flex flex-col md:flex-row gap-4 min-h-0 md:min-h-[400px]">
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex gap-1 mb-3 border-b border-gray-100 dark:border-[#303a48]">
            <button
              type="button"
              onClick={() => setTab('users')}
              className={`px-3 py-1.5 text-sm font-medium border-b-2 transition cursor-pointer ${
                tab === 'users'
                  ? 'text-[#FF8600] border-[#FF8600]'
                  : 'text-gray-400 border-transparent hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              Участники
            </button>
            <button
              type="button"
              onClick={() => setTab('groups')}
              className={`px-3 py-1.5 text-sm font-medium border-b-2 transition cursor-pointer ${
                tab === 'groups'
                  ? 'text-[#FF8600] border-[#FF8600]'
                  : 'text-gray-400 border-transparent hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              Группы
            </button>
          </div>

          {tab === 'users' && (
            <>
              {filteredUsers.length > 0 && (
                <div className="flex justify-end mb-2">
                  <button
                    type="button"
                    onClick={toggleAllUsers}
                    className="text-xs font-medium text-[#FF8600] hover:text-[#FF6B00] cursor-pointer"
                  >
                    {selectedUserIds.length === filteredUsers.filter((u) => !existingIds.includes(u.id)).length && filteredUsers.filter((u) => !existingIds.includes(u.id)).length > 0
                      ? 'Снять все' : 'Выбрать все'}
                  </button>
                </div>
              )}
              <input
                type="text"
                placeholder="Поиск по имени или email…"
                className="w-full border border-gray-200 dark:border-[#3a4250] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#FF8600] dark:focus:border-[#FF8600] shadow-sm mb-3"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
              {filteredUsers.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-300 py-4">
                  {allUsers.length === 0 ? 'Нет пользователей в системе' : 'Ничего не найдено'}
                </p>
              ) : (
                <div className="overflow-y-auto space-y-1 max-h-[50vh]">
                  {filteredUsers.map((user) => {
                    const isExisting = existingIds.includes(user.id)
                    const checked = isExisting || selectedUserIds.includes(user.id)
                    return (
                      <label
                        key={user.id}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-100 dark:border-[#303a48] hover:bg-gray-50 dark:hover:bg-[#262d3a] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleUser(user.id)}
                          className="w-4 h-4 text-[#FF8600] rounded focus:ring-[#FF8600]"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user.name}</div>
                          <div className="text-xs text-gray-400 dark:text-gray-400 truncate">{user.email}</div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {tab === 'groups' && (
            <>
              {!isCreatingGroup && (
                <button
                  type="button"
                  onClick={openCreateGroup}
                  className="w-full mb-3 py-2 text-sm font-medium text-[#FF8600] border border-dashed border-[#FF8600] hover:bg-[#FF8600]/5 rounded-xl transition cursor-pointer"
                >
                  + Новая группа
                </button>
              )}

              {isCreatingGroup && (
                <div className="border border-gray-200 dark:border-[#3a4250] rounded-xl p-3 mb-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {editingGroup ? 'Редактировать группу' : 'Новая группа'}
                    </h4>
                    <button
                      type="button"
                      onClick={cancelGroupForm}
                      className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      Отмена
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Название группы"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full border border-gray-200 dark:border-[#3a4250] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#FF8600] dark:focus:border-[#FF8600]"
                    autoFocus
                  />
                  <input
                    type="text"
                    placeholder="Поиск участников…"
                    value={groupSearch}
                    onChange={(e) => setGroupSearch(e.target.value)}
                    className="w-full border border-gray-200 dark:border-[#3a4250] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#FF8600] dark:focus:border-[#FF8600]"
                  />
                  <div className="overflow-y-auto space-y-1 max-h-[25vh]">
                    {allUsers
                      .filter((u) => {
                        const q = groupSearch.trim().toLowerCase()
                        if (!q) return true
                        return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
                      })
                      .map((user) => {
                        const checked = groupMemberIds.includes(user.id)
                        return (
                          <label
                            key={user.id}
                            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-[#262d3a] border border-gray-100 dark:border-[#303a48] cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                setGroupMemberIds((prev) =>
                                  checked ? prev.filter((id) => id !== user.id) : [...prev, user.id],
                                )
                              }
                              className="w-4 h-4 text-[#FF8600] rounded focus:ring-[#FF8600]"
                            />
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user.name}</div>
                              <div className="text-xs text-gray-400 dark:text-gray-400 truncate">{user.email}</div>
                            </div>
                          </label>
                        )
                      })}
                  </div>
                  <button
                    type="button"
                    onClick={saveGroup}
                    disabled={savingGroup || !groupName.trim() || groupMemberIds.length === 0}
                    className="w-full py-2 text-sm font-medium text-white bg-[#FF8600] hover:bg-[#FF6B00] disabled:opacity-50 rounded-xl soft-press cursor-pointer"
                  >
                    {savingGroup ? 'Сохранение…' : editingGroup ? 'Обновить' : 'Создать'}
                  </button>
                </div>
              )}

              {filteredGroups.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  {groups.length === 0 ? 'Групп пока нет' : 'Ничего не найдено'}
                </p>
              ) : (
                <div className="overflow-y-auto space-y-1.5 max-h-[50vh]">
                  {filteredGroups.map((group) => {
                    const state = getGroupSelectionState(group)
                    const expanded = expandedGroupId === group.id
                    const memberUsers = group.userIds
                      .map((id) => allUsers.find((u) => u.id === id))
                      .filter((u): u is ApiUser => !!u && !removingIds.includes(u.id))

                    return (
                      <div
                        key={group.id}
                        className={`rounded-xl border transition ${
                          state === 'all'
                            ? 'border-[#FF8600] bg-[#FF8600]/5'
                            : state === 'some'
                              ? 'border-[#FF8600]/40 bg-[#FF8600]/5'
                              : 'border-gray-100 dark:border-[#303a48] hover:bg-gray-50 dark:hover:bg-[#262d3a]'
                        }`}
                      >
                        <div className="flex items-center gap-2 px-3 py-2.5">
                          <button
                            type="button"
                            onClick={() => setExpandedGroupId(expanded ? null : group.id)}
                            className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer shrink-0"
                          >
                            <svg className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                          <input
                            type="checkbox"
                            checked={state === 'all'}
                            ref={(el) => { if (el) el.indeterminate = state === 'some' }}
                            onChange={() => toggleGroup(group)}
                            className="w-4 h-4 text-[#FF8600] rounded focus:ring-[#FF8600]"
                          />
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 flex-1 truncate">{group.name}</span>
                          <span className="text-xs text-gray-400">{group.userIds.length} чел.</span>
                          <button
                            type="button"
                            onClick={() => openEditGroup(group)}
                            className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-[#FF8600] cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteGroup(group)}
                            disabled={deletingGroupId === group.id}
                            className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-600 cursor-pointer disabled:opacity-50"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                        {expanded && memberUsers.length > 0 && (
                          <div className="border-t border-gray-100 dark:border-[#303a48] px-3 py-2 space-y-1">
                            {memberUsers.map((user) => {
                              const isExisting = existingIds.includes(user.id)
                              const checked = isExisting || selectedUserIds.includes(user.id)
                              return (
                                <label
                                  key={user.id}
                                  className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-[#262d3a] cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleGroupMember(group, user.id)}
                                    className="w-3.5 h-3.5 text-[#FF8600] rounded focus:ring-[#FF8600]"
                                  />
                                  <span className="text-sm text-gray-700 dark:text-gray-300">{user.name}</span>
                                  <span className="text-xs text-gray-400">{user.email}</span>
                                </label>
                              )
                            })}
                          </div>
                        )}
                        {expanded && memberUsers.length === 0 && (
                          <div className="border-t border-gray-100 dark:border-[#303a48] px-3 py-2">
                            <p className="text-sm text-gray-400">Нет участников</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>

        <div className="w-full md:w-60 shrink-0 md:border-l md:pl-4 border-t md:border-t-0 pt-4 md:pt-0 border-gray-100 dark:border-[#303a48] flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Выбрано ({selectedUserIds.length + selectedIndividuals.filter((u) => existingIds.includes(u.id)).length})
            </h4>
            {(selectedUserIds.length > 0 || selectedGroups.length > 0 || selectedIndividuals.length > 0) && (
              <button
                type="button"
                onClick={() => {
                  if (existingIds.length > 0) {
                    setRemovingIds((prev) => [...new Set([...prev, ...existingIds])])
                    if (onRemove) onRemove([...existingIds]).catch(console.error)
                  }
                  setSelectedUserIds([])
                  setSelectedGroupIds([])
                }}
                className="text-[10px] text-gray-400 hover:text-red-500 cursor-pointer"
              >
                Очистить всё
              </button>
            )}
          </div>
          <div className="overflow-y-auto flex-1 space-y-1">
            {selectedUserIds.length === 0 && selectedGroups.length === 0 && selectedIndividuals.length === 0 && (
              <p className="text-sm text-gray-400 py-2">Пока никого не выбрали</p>
            )}
            {selectedGroups.map((group) => {
              const memberIds = group.userIds
              const existingMemberIds = memberIds.filter((id) => existingIds.includes(id))
              const selectedMemberIds = memberIds.filter((id) => selectedUserIds.includes(id) && !existingIds.includes(id))
              const totalShown = existingMemberIds.length + selectedMemberIds.length
              const isFull = totalShown === memberIds.length
              const isExpanded = expandedGroupId === group.id

              return (
                <div key={group.id} className="rounded-lg border border-gray-100 dark:border-[#303a48] overflow-hidden">
                  <div className={`flex items-center gap-1.5 px-2 py-2 ${isFull ? 'bg-[#FF8600]/10' : 'bg-[#FF8600]/5'}`}>
                    <button
                      type="button"
                      onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                      className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer shrink-0"
                    >
                      <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 flex-1 truncate">{group.name}</span>
                    <span className="text-xs text-gray-400 shrink-0">{totalShown}/{memberIds.length}</span>
                    <button
                      type="button"
                      onClick={() => removeGroupFromSelection(group)}
                      className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-red-500 cursor-pointer shrink-0"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="px-2 py-1 space-y-0.5 bg-gray-50 dark:bg-[#1e2430]">
                      {memberIds.filter((id) => !removingIds.includes(id)).map((id) => {
                        const user = allUsers.find((u) => u.id === id)
                        if (!user) return null
                        const isExisting = existingIds.includes(id)
                        const isSelected = selectedUserIds.includes(id) || isExisting
                        return (
                          <div key={id} className={`text-sm px-1.5 py-0.5 rounded flex items-center justify-between ${isSelected ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 line-through'}`}>
                            <span className="truncate">{user.name}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
            {selectedIndividuals.map((user) => {
              const isExisting = existingIds.includes(user.id)
              return (
                <div
                  key={user.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-gray-100 dark:border-[#303a48]"
                >
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 flex-1 truncate">{user.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (isExisting && onRemove) {
                        onRemove([user.id]).catch(console.error)
                      } else {
                        toggleUser(user.id)
                      }
                    }}
                    className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-red-500 cursor-pointer shrink-0"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-gray-100 dark:border-[#303a48]">
        <button
          type="button"
          onClick={onClose}
          disabled={adding}
          className="text-sm text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer disabled:opacity-50"
        >
          Отмена
        </button>
        <button
          type="button"
          onClick={() =>
            onAdd(selectedUserIds)
              .then(() => { setSelectedUserIds([]); setSelectedGroupIds([]); setSearch(''); onClose() })
              .catch(console.error)
          }
          disabled={adding || selectedUserIds.length === 0}
          className="px-4 py-2 text-sm font-medium text-white bg-[#FF8600] hover:bg-[#FF6B00] disabled:opacity-50 rounded-xl soft-press shadow-sm cursor-pointer"
        >
          {adding ? 'Добавление…' : `Добавить выбранных (${selectedUserIds.length})`}
        </button>
      </div>

      {confirmDeleteGroup && (
        <ConfirmModal
          title="Удалить группу?"
          variant="danger"
          confirmLabel="Удалить"
          loadingLabel="Удаление…"
          loading={deletingGroupId === confirmDeleteGroup.id}
          onConfirm={confirmDeleteGroupAction}
          onCancel={() => !deletingGroupId && setConfirmDeleteGroup(null)}
          message={
            <>Группа <span className="font-semibold text-gray-900 dark:text-gray-100">«{confirmDeleteGroup.name}»</span> будет удалена. Участники не будут удалены из системы.</>
          }
        />
      )}
    </Modal>
  )
}
