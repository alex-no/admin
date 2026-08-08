/** Спільні для списку, картки та статистики підписи рівнів логу */

/** Від найслабшого до найсерйознішого: warning < error < critical < alert < emergency */
export const LEVEL_ORDER = ['warning', 'error', 'critical', 'alert', 'emergency']

export const LEVEL_BADGE: Record<string, string> = {
  warning: 'badge bg-warning-subtle text-warning-emphasis border border-warning-subtle',
  error: 'badge text-bg-warning',
  // critical/alert/emergency: row background is itself colored (pale pink/solid red/black),
  // so the badge goes the other way — light with a colored border — to stay visible on it.
  critical: 'badge text-bg-danger',
  alert: 'badge bg-white text-danger border border-danger',
  emergency: 'badge bg-white text-dark border border-dark',
}

export const LEVEL_COLOR: Record<string, string> = {
  warning: '#fff3cd',
  error: '#ffc107',
  critical: '#f8d7da',
  alert: '#dc3545',
  emergency: '#212529',
}

/** Native <option> background/color styling is unreliable across browsers (Chrome/Windows
 *  ignores it entirely), so severity is shown via a colored dot prefix instead. */
export const LEVEL_OPTION_ICON: Record<string, string> = {
  warning: '🟡',
  error: '🟠',
  critical: '🔴',
  alert: '🟤',
  emergency: '⚫',
}

export function rowClass(level: string): string {
  const map: Record<string, string> = {
    error: 'table-warning',
    critical: 'table-danger',
    alert: 'row-alert',
    emergency: 'table-dark',
  }
  return map[level] ?? ''
}

/** App\Domain\FooException → FooException */
export function shortException(str?: string | null): string {
  if (!str) return '—'
  const parts = str.split('\\')
  return parts[parts.length - 1]
}

/** /var/www/html/src/Foo/Bar.php → Foo/Bar.php */
export function shortFile(str?: string | null): string {
  if (!str) return '—'
  return str.split('/').slice(-2).join('/')
}
