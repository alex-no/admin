import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { __resetNotificationsForTests } from './notifications'
import { deleteManyWithUndo, deleteWithUndo } from './undoableDelete'

beforeEach(() => {
  __resetNotificationsForTests()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('deleteWithUndo', () => {
  it('applies remove() immediately', () => {
    const remove = vi.fn()
    deleteWithUndo({ remove, restore: vi.fn(), commit: vi.fn(), message: 'x' })
    expect(remove).toHaveBeenCalledTimes(1)
  })

  it('commits after the undo delay if not cancelled', async () => {
    const commit = vi.fn().mockResolvedValue(undefined)
    deleteWithUndo({ remove: vi.fn(), restore: vi.fn(), commit, message: 'x' })
    expect(commit).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(5000)
    expect(commit).toHaveBeenCalledTimes(1)
  })

  it('restores instead of committing when commit fails and no onCommitError given', async () => {
    const restore = vi.fn()
    const commit = vi.fn().mockRejectedValue(new Error('boom'))
    deleteWithUndo({ remove: vi.fn(), restore, commit, message: 'x' })
    await vi.advanceTimersByTimeAsync(5000)
    expect(restore).toHaveBeenCalledTimes(1)
  })

  it('calls onCommitError instead of restore when commit fails and it is given', async () => {
    const restore = vi.fn()
    const onCommitError = vi.fn()
    const commit = vi.fn().mockRejectedValue(new Error('boom'))
    deleteWithUndo({ remove: vi.fn(), restore, commit, onCommitError, message: 'x' })
    await vi.advanceTimersByTimeAsync(5000)
    expect(onCommitError).toHaveBeenCalledTimes(1)
    expect(restore).not.toHaveBeenCalled()
  })
})

describe('deleteManyWithUndo', () => {
  it('applies remove() immediately and commits each item after the delay', async () => {
    const remove = vi.fn()
    const commitOne = vi.fn().mockResolvedValue(undefined)
    const items = [{ id: 1 }, { id: 2 }]
    deleteManyWithUndo({ items, remove, restore: vi.fn(), commitOne, message: 'x' })
    expect(remove).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(5000)
    expect(commitOne).toHaveBeenCalledTimes(2)
  })

  it('calls onAnyCommitError if at least one commitOne fails', async () => {
    const onAnyCommitError = vi.fn()
    const commitOne = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(undefined)
    deleteManyWithUndo({
      items: [{ id: 1 }, { id: 2 }],
      remove: vi.fn(),
      restore: vi.fn(),
      commitOne,
      onAnyCommitError,
      message: 'x',
    })
    await vi.advanceTimersByTimeAsync(5000)
    expect(onAnyCommitError).toHaveBeenCalledTimes(1)
  })
})
