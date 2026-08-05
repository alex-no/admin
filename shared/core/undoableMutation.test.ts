import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { __resetNotificationsForTests, getNotifications } from './notifications'
import {
  __resetPendingMutationsForTests,
  deleteManyWithUndo,
  deleteWithUndo,
  flushPendingMutations,
  hasPendingMutation,
  updateWithUndo,
} from './undoableMutation'

beforeEach(() => {
  __resetNotificationsForTests()
  __resetPendingMutationsForTests()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('updateWithUndo', () => {
  it('applies immediately and commits after the delay', async () => {
    const apply = vi.fn()
    const commit = vi.fn().mockResolvedValue(undefined)
    updateWithUndo({ key: 'row:field', apply, revert: vi.fn(), commit, message: 'x' })
    expect(apply).toHaveBeenCalledTimes(1)
    expect(commit).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(5000)
    expect(commit).toHaveBeenCalledTimes(1)
  })

  it('a second mutation on the same key cancels the first pending one (dedup)', async () => {
    const commit1 = vi.fn().mockResolvedValue(undefined)
    const commit2 = vi.fn().mockResolvedValue(undefined)
    updateWithUndo({ key: 'row:field', apply: vi.fn(), revert: vi.fn(), commit: commit1, message: 'first' })
    updateWithUndo({ key: 'row:field', apply: vi.fn(), revert: vi.fn(), commit: commit2, message: 'second' })

    await vi.advanceTimersByTimeAsync(5000)
    expect(commit1).not.toHaveBeenCalled()
    expect(commit2).toHaveBeenCalledTimes(1)
  })

  it('reverts on commit failure when no onCommitError given', async () => {
    const revert = vi.fn()
    const commit = vi.fn().mockRejectedValue(new Error('boom'))
    updateWithUndo({ key: 'k', apply: vi.fn(), revert, commit, message: 'x' })
    await vi.advanceTimersByTimeAsync(5000)
    expect(revert).toHaveBeenCalledTimes(1)
  })

  it('hasPendingMutation reflects an in-flight mutation until it commits', async () => {
    updateWithUndo({ key: 'row:field', apply: vi.fn(), revert: vi.fn(), commit: vi.fn().mockResolvedValue(undefined), message: 'x' })
    expect(hasPendingMutation('row:field')).toBe(true)
    expect(hasPendingMutation()).toBe(true)
    await vi.advanceTimersByTimeAsync(5000)
    expect(hasPendingMutation('row:field')).toBe(false)
  })
})

describe('deleteWithUndo / deleteManyWithUndo (pending-map variant)', () => {
  it('deleteWithUndo applies remove immediately and commits after the delay', async () => {
    const remove = vi.fn()
    const commit = vi.fn().mockResolvedValue(undefined)
    deleteWithUndo({ remove, restore: vi.fn(), commit, message: 'x' })
    expect(remove).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(5000)
    expect(commit).toHaveBeenCalledTimes(1)
  })

  it('deleteManyWithUndo notifies once and commits every item', async () => {
    const commitOne = vi.fn().mockResolvedValue(undefined)
    deleteManyWithUndo({
      items: [{ id: 1 }, { id: 2 }, { id: 3 }],
      remove: vi.fn(),
      restore: vi.fn(),
      commitOne,
      message: 'Deleted 3',
    })
    expect(getNotifications().length).toBe(1)
    await vi.advanceTimersByTimeAsync(5000)
    expect(commitOne).toHaveBeenCalledTimes(3)
  })
})

describe('flushPendingMutations', () => {
  it('commits all pending mutations immediately, without waiting for the delay', async () => {
    const commit = vi.fn().mockResolvedValue(undefined)
    updateWithUndo({ key: 'a', apply: vi.fn(), revert: vi.fn(), commit, message: 'x' })
    expect(commit).not.toHaveBeenCalled()
    await flushPendingMutations()
    expect(commit).toHaveBeenCalledTimes(1)
    expect(hasPendingMutation()).toBe(false)
  })
})
