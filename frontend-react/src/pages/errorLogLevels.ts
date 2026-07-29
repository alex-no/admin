/** Спільні для списку, картки та статистики підписи рівнів логу */

export const LEVEL_BADGE: Record<string, string> = {
  error: 'badge bg-danger',
  critical: 'badge bg-danger',
  alert: 'badge bg-warning text-dark',
  emergency: 'badge bg-dark',
  warning: 'badge bg-warning text-dark',
}

export const LEVEL_COLOR: Record<string, string> = {
  error: '#dc3545',
  critical: '#721c24',
  alert: '#ffc107',
  emergency: '#212529',
  warning: '#ff9800',
}

export function rowClass(level: string): string {
  if (level === 'critical' || level === 'emergency') return 'table-danger'
  if (level === 'error') return 'table-warning'
  return ''
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
