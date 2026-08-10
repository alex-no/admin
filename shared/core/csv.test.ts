import { describe, expect, it } from 'vitest'
import { rowsToCsv, parseCsv, coerceImportValue, autoMapImportColumns, buildImportRows } from './csv'

describe('rowsToCsv', () => {
  it('joins headers and rows with CRLF, prefixed with a UTF-8 BOM', () => {
    const csv = rowsToCsv(['id', 'name'], [[1, 'Kyiv'], [2, 'Lviv']])
    expect(csv).toBe('﻿id,name\r\n1,Kyiv\r\n2,Lviv')
  })

  it('quotes fields containing commas, quotes, or newlines', () => {
    const csv = rowsToCsv(['name'], [['Kyiv, "capital"'], ['multi\nline']])
    expect(csv).toContain('"Kyiv, ""capital"""')
    expect(csv).toContain('"multi\nline"')
  })

  it('renders null/undefined as empty fields', () => {
    const csv = rowsToCsv(['a', 'b'], [[null, undefined]])
    expect(csv.endsWith('a,b\r\n,')).toBe(true)
  })

  it('handles an empty row set', () => {
    expect(rowsToCsv(['a', 'b'], [])).toBe('﻿a,b')
  })
})

describe('parseCsv', () => {
  it('parses a plain comma-delimited file into headers + rows', () => {
    const { headers, rows } = parseCsv('id,name\r\n1,Kyiv\r\n2,Lviv')
    expect(headers).toEqual(['id', 'name'])
    expect(rows).toEqual([['1', 'Kyiv'], ['2', 'Lviv']])
  })

  it('strips a UTF-8 BOM at the start of the file', () => {
    const { headers } = parseCsv('﻿id,name\n1,Kyiv')
    expect(headers).toEqual(['id', 'name'])
  })

  it('is the inverse of rowsToCsv for quoted fields', () => {
    const csv = rowsToCsv(['name', 'note'], [['Kyiv, "capital"', 'multi\nline']])
    const { rows } = parseCsv(csv)
    expect(rows).toEqual([['Kyiv, "capital"', 'multi\nline']])
  })

  it('detects ";" as the delimiter when it dominates the header line (Excel uk/ru locale export)', () => {
    const { headers, rows } = parseCsv('id;name\r\n1;Kyiv')
    expect(headers).toEqual(['id', 'name'])
    expect(rows).toEqual([['1', 'Kyiv']])
  })

  it('accepts bare LF line endings, not just CRLF', () => {
    const { headers, rows } = parseCsv('id,name\n1,Kyiv\n2,Lviv')
    expect(headers).toEqual(['id', 'name'])
    expect(rows).toEqual([['1', 'Kyiv'], ['2', 'Lviv']])
  })

  it('drops blank lines instead of turning them into empty rows', () => {
    const { rows } = parseCsv('id,name\r\n1,Kyiv\r\n\r\n2,Lviv\r\n')
    expect(rows).toEqual([['1', 'Kyiv'], ['2', 'Lviv']])
  })

  it('handles a header-only file (no data rows)', () => {
    const { headers, rows } = parseCsv('id,name')
    expect(headers).toEqual(['id', 'name'])
    expect(rows).toEqual([])
  })
})

describe('coerceImportValue', () => {
  it('converts number fields, empty string to null', () => {
    expect(coerceImportValue({ key: 'rating', type: 'number' }, '4.5')).toBe(4.5)
    expect(coerceImportValue({ key: 'rating', type: 'number' }, '  ')).toBeNull()
  })

  it('converts boolean fields from common truthy strings', () => {
    expect(coerceImportValue({ key: 'is_active', type: 'boolean' }, '1')).toBe(true)
    expect(coerceImportValue({ key: 'is_active', type: 'boolean' }, 'yes')).toBe(true)
    expect(coerceImportValue({ key: 'is_active', type: 'boolean' }, '0')).toBe(false)
    expect(coerceImportValue({ key: 'is_active', type: 'boolean' }, '')).toBe(false)
  })

  it('splits phone-list fields on ; or ,', () => {
    expect(coerceImportValue({ key: 'phones', type: 'phone-list' }, '+380441234567; +380441234568'))
      .toEqual(['+380441234567', '+380441234568'])
    expect(coerceImportValue({ key: 'phones', type: 'phone-list' }, '')).toEqual([])
  })

  it('trims text/select fields and leaves them as strings', () => {
    expect(coerceImportValue({ key: 'sto_type', type: 'select' }, ' service ')).toBe('service')
  })
})

describe('autoMapImportColumns', () => {
  const columns = [
    { key: 'name_uk', label: 'table.name' },
    { key: 'sto_type', label: 'table.type' },
    { key: 'address', label: 'table.address' },
  ]

  it('matches headers to column keys case-insensitively', () => {
    const mapping = autoMapImportColumns(['Name_UK', 'sto_type', 'unknown'], columns)
    expect(mapping).toEqual({ 0: 'name_uk', 1: 'sto_type', 2: null })
  })

  it('falls back to a translated label when the key does not match', () => {
    const mapping = autoMapImportColumns(['Назва'], columns, (c) => (c.key === 'name_uk' ? 'Назва' : c.key))
    expect(mapping).toEqual({ 0: 'name_uk' })
  })

  it('does not map the same target column twice', () => {
    const mapping = autoMapImportColumns(['name_uk', 'name_uk'], columns)
    expect(mapping).toEqual({ 0: 'name_uk', 1: null })
  })
})

describe('buildImportRows', () => {
  it('builds one record per row using only mapped columns, with type coercion', () => {
    const columns = [
      { key: 'name_uk', type: 'text' },
      { key: 'rating', type: 'number' },
    ]
    const rows = buildImportRows(
      [['Kyiv STO', '4.5'], ['Lviv STO', '']],
      { 0: 'name_uk', 1: 'rating' },
      columns,
    )
    expect(rows).toEqual([
      { name_uk: 'Kyiv STO', rating: 4.5 },
      { name_uk: 'Lviv STO', rating: null },
    ])
  })

  it('skips unmapped CSV columns', () => {
    const columns = [{ key: 'name_uk', type: 'text' }]
    const rows = buildImportRows([['Kyiv STO', 'ignored']], { 0: 'name_uk', 1: null }, columns)
    expect(rows).toEqual([{ name_uk: 'Kyiv STO' }])
  })
})
