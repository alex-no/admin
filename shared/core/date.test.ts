import { describe, expect, it } from 'vitest'
import { formatDate, formatDateShort } from './date'

describe('formatDate', () => {
  it('formats an ISO string as "дд.мм.рррр гг:хх"', () => {
    expect(formatDate('2026-03-05T14:30:00')).toBe('05.03.2026 14:30')
  })

  it('includes seconds when withSeconds is true', () => {
    expect(formatDate('2026-03-05T14:30:09', true)).toBe('05.03.2026 14:30:09')
  })

  it('accepts a Date object directly', () => {
    expect(formatDate(new Date(2026, 0, 1, 9, 5))).toBe('01.01.2026 09:05')
  })

  it('returns "—" for falsy input', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate(undefined)).toBe('—')
    expect(formatDate('')).toBe('—')
  })

  it('returns "—" for an unparseable date string', () => {
    expect(formatDate('not a date')).toBe('—')
  })
})

describe('formatDateShort', () => {
  it('formats only the date part', () => {
    expect(formatDateShort('2026-03-05T14:30:00')).toBe('05.03.2026')
  })

  it('returns "—" for falsy/invalid input', () => {
    expect(formatDateShort(null)).toBe('—')
    expect(formatDateShort('garbage')).toBe('—')
  })
})
