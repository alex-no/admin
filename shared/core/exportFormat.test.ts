import { describe, expect, it } from 'vitest'
import { formatValueForExport } from './exportFormat'

describe('formatValueForExport', () => {
  it('formats boolean using trueLabel/falseLabel, with defaults', () => {
    const col = { key: 'is_active', type: 'boolean', trueLabel: 'Активний', falseLabel: 'Неактивний' }
    expect(formatValueForExport(col, { is_active: true }, () => [])).toBe('Активний')
    expect(formatValueForExport(col, { is_active: false }, () => [])).toBe('Неактивний')
    expect(formatValueForExport({ key: 'x', type: 'boolean' }, { x: true }, () => [])).toBe('Так')
    expect(formatValueForExport({ key: 'x', type: 'boolean' }, { x: false }, () => [])).toBe('Ні')
  })

  it('formats phone-list by joining formatted numbers', () => {
    const col = { key: 'phones', type: 'phone-list' }
    expect(formatValueForExport(col, { phones: ['380441234567', '380671112233'] }, () => [])).toBe(
      '+38 (044) 123-45-67, +38 (067) 111-22-33'
    )
  })

  it('resolves select values to their option label', () => {
    const col = { key: 'sto_type', type: 'select' }
    const options = [{ value: 'service', label: 'Сервіс' }, { value: 'tire', label: 'Шиномонтаж' }]
    expect(formatValueForExport(col, { sto_type: 'tire' }, () => options)).toBe('Шиномонтаж')
  })

  it('falls back to the raw value when a select option is not found', () => {
    const col = { key: 'sto_type', type: 'select' }
    expect(formatValueForExport(col, { sto_type: 'unknown' }, () => [])).toBe('unknown')
  })

  it('returns the raw value for unrecognized/default types', () => {
    expect(formatValueForExport({ key: 'name' }, { name: 'Kyiv' }, () => [])).toBe('Kyiv')
  })

  it('returns empty string instead of null/undefined for the default case', () => {
    expect(formatValueForExport({ key: 'name' }, {}, () => [])).toBe('')
  })
})
