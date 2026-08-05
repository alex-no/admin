import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { __resetNotificationsForTests, dismiss, getNotifications, notify, subscribeNotifications } from './notifications'

beforeEach(() => {
  __resetNotificationsForTests()
})

describe('notify / getNotifications', () => {
  it('adds a notification and returns its id', () => {
    const id = notify('Saved')
    expect(id).toBeTypeOf('number')
    expect(getNotifications()).toEqual([{ id, message: 'Saved', type: 'info', duration: 4000, action: null }])
  })

  it('defaults type to "info" and duration to 4000', () => {
    notify('x')
    expect(getNotifications()[0]).toMatchObject({ type: 'info', duration: 4000 })
  })

  it('accepts custom type/duration/action', () => {
    const onClick = () => {}
    notify('Deleted', { type: 'error', duration: 0, action: { label: 'Undo', onClick } })
    expect(getNotifications()[0]).toMatchObject({ type: 'error', duration: 0, action: { label: 'Undo', onClick } })
  })

  it('assigns increasing ids across calls', () => {
    const id1 = notify('a')
    const id2 = notify('b')
    expect(id2).toBeGreaterThan(id1)
  })
})

describe('dismiss', () => {
  it('removes the notification with the given id', () => {
    const id = notify('x')
    dismiss(id)
    expect(getNotifications()).toEqual([])
  })

  it('is a no-op for an unknown id', () => {
    notify('x')
    dismiss(999999)
    expect(getNotifications().length).toBe(1)
  })
})

describe('subscribeNotifications', () => {
  it('calls the listener on notify and dismiss', () => {
    const listener = vi.fn()
    subscribeNotifications(listener)
    const id = notify('x')
    dismiss(id)
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('unsubscribe stops further notifications', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeNotifications(listener)
    unsubscribe()
    notify('x')
    expect(listener).not.toHaveBeenCalled()
  })
})

describe('auto-dismiss via duration', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('dismisses itself after `duration` ms', () => {
    const id = notify('x', { duration: 1000 })
    expect(getNotifications().length).toBe(1)
    vi.advanceTimersByTime(1000)
    expect(getNotifications().find((n) => n.id === id)).toBeUndefined()
  })

  it('duration: 0 never auto-dismisses', () => {
    notify('x', { duration: 0 })
    vi.advanceTimersByTime(60_000)
    expect(getNotifications().length).toBe(1)
  })
})
