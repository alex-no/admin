import { describe, expect, it } from 'vitest'
import { rowsToCsv } from './csv'

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
