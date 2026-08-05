/**
 * Перевірка права за списком дозволів користувача.
 * Підтримує два спецвипадки: "*" — усі права, "module.*" — усі права модуля.
 *
 * Раніше алгоритм був продубльований у Vue (`useAuth.js` → `can()`) і React
 * (`AuthContext.tsx` → `can()`) — байдуже ідентичний код у двох місцях.
 */
export function hasPermission(permissions: string[] | undefined | null, permission: string): boolean {
  for (const p of permissions ?? []) {
    if (p === '*' || p === permission) return true
    if (p.endsWith('.*') && permission.startsWith(p.slice(0, -2) + '.')) return true
  }
  return false
}
