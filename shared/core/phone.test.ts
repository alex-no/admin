import { describe, expect, it } from 'vitest'
import { formatPhoneUA, normalizePhoneE164 } from './phone'

describe('formatPhoneUA', () => {
  it('formats a 9-digit local number', () => {
    expect(formatPhoneUA('441234567')).toBe('+38 (044) 123-45-67')
  })

  it('formats a 10-digit number with leading 0', () => {
    expect(formatPhoneUA('0441234567')).toBe('+38 (044) 123-45-67')
  })

  it('formats a full 12-digit E.164 number regardless of separators', () => {
    expect(formatPhoneUA('+38 (044) 123-45-67')).toBe('+38 (044) 123-45-67')
    expect(formatPhoneUA('380441234567')).toBe('+38 (044) 123-45-67')
  })

  it('returns unrecognized input trimmed, unformatted', () => {
    expect(formatPhoneUA('123')).toBe('123')
    expect(formatPhoneUA('  not a phone  ')).toBe('not a phone')
  })

  it('returns empty string for empty input', () => {
    expect(formatPhoneUA('')).toBe('')
    expect(formatPhoneUA(null)).toBe('')
    expect(formatPhoneUA(undefined)).toBe('')
  })
})

describe('normalizePhoneE164', () => {
  it('normalizes a 9-digit local number', () => {
    expect(normalizePhoneE164('441234567')).toBe('+380441234567')
  })

  it('normalizes a 10-digit number with leading 0', () => {
    expect(normalizePhoneE164('0441234567')).toBe('+380441234567')
  })

  it('normalizes an already-formatted number', () => {
    expect(normalizePhoneE164('+38 (044) 123-45-67')).toBe('+380441234567')
  })

  it('does not lose unrecognized digits (in-progress editing)', () => {
    expect(normalizePhoneE164('123')).toBe('+123')
  })

  it('returns empty string for empty/non-digit input', () => {
    expect(normalizePhoneE164('')).toBe('')
    expect(normalizePhoneE164(null)).toBe('')
    expect(normalizePhoneE164('abc')).toBe('')
  })
})
