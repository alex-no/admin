/**
 * Converts between decimal degrees and DMS (degrees/minutes/seconds).
 * Mirrors App\Module\Geography\Application\Service\CoordinateConverter (PHP).
 *
 * Output format: 50°27′30.5″N
 *
 * Accepted DMS input:
 *   50°27'30.5"N   50° 27' 30.5" N   50d27m30.5sN
 *   50 27 30.5 N   N50°27'30"   -50°27'30"
 *   Comma as decimal separator: 30,5
 */

/**
 * Convert decimal degrees → DMS string.
 * @param {number}       decimal
 * @param {'lat'|'lon'}  type
 * @returns {string}  e.g. "50°27′30.5″N"
 */
export function decimalToDms(decimal, type = 'lat') {
  const abs = Math.abs(decimal)
  let deg = Math.floor(abs)
  const minFrac = (abs - deg) * 60
  let min = Math.floor(minFrac)
  let sec = Math.round((minFrac - min) * 60 * 10000) / 10000

  if (sec >= 60) { sec = 0; min++ }
  if (min >= 60) { min = 0; deg++ }

  // Strip trailing zeros: "30.5000" → "30.5", "30.0000" → "30"
  const secStr = sec.toFixed(4).replace(/\.?0+$/, '')

  const dir = type === 'lon'
    ? (decimal >= 0 ? 'E' : 'W')
    : (decimal >= 0 ? 'N' : 'S')

  return `${deg}°${min}′${secStr}″${dir}`
}

// Matches: [prefix-dir] [sign] degrees sep minutes sep seconds [sec-sep] [suffix-dir]
// Degree sep:  °, d, or space
// Minute sep:  ′, ', m, or space
// Second sep:  ″, ", s  (optional)
const DMS_RE = /^\s*([NSEWnsew])?\s*(-)?(\d{1,3})[°d\s]\s*(\d{1,2})[′'m\s]\s*(\d{1,2}(?:[.,]\d+)?)[″"s]?\s*([NSEWnsew])?\s*$/u

/**
 * Parse a DMS string or plain decimal → decimal degrees.
 * @param {string|number|null} input
 * @returns {number|null}  null if unparseable
 */
export function dmsToDecimal(input) {
  if (input === null || input === undefined) return null
  const s = String(input).trim()
  if (!s) return null

  // Plain decimal (comma allowed as separator)
  if (/^-?\d+([.,]\d+)?$/.test(s)) {
    return parseFloat(s.replace(',', '.'))
  }

  const m = s.match(DMS_RE)
  if (!m) return null

  const prefixDir = (m[1] ?? '').toUpperCase()
  const negative  = m[2] === '-'
  const deg       = parseFloat(m[3])
  const min       = parseFloat(m[4])
  const sec       = parseFloat((m[5] ?? '0').replace(',', '.'))
  const suffixDir = (m[6] ?? '').toUpperCase()

  if (min >= 60 || sec >= 60) return null

  let decimal = deg + min / 60 + sec / 3600
  const dir   = prefixDir || suffixDir

  if (negative || dir === 'S' || dir === 'W') decimal = -decimal

  return Math.round(decimal * 1_000_000) / 1_000_000
}

/**
 * Compute the "other" format as a display hint.
 *
 * - decimal input  → hint shows DMS
 * - DMS input      → hint shows decimal
 * - invalid input  → { text: 'Невірний формат', error: true }
 * - empty input    → null
 *
 * @param {string|number|null} value
 * @param {'lat'|'lon'}        type
 * @returns {{ text: string, error: boolean }|null}
 */
export function coordHint(value, type = 'lat') {
  if (value === null || value === undefined) return null
  const s = String(value).trim()
  if (!s) return null

  if (/^-?\d+([.,]\d+)?$/.test(s)) {
    return { text: decimalToDms(parseFloat(s.replace(',', '.')), type), error: false }
  }

  const d = dmsToDecimal(s)
  if (d !== null) {
    return { text: String(d), error: false }
  }

  return { text: 'Невірний формат', error: true }
}
