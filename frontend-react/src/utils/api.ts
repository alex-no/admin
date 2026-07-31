function authHeaders(): HeadersInit {
  const token = localStorage.getItem('admin_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/**
 * Історично сторінки передають шлях без префікса ('/admin/sto'), а спільні
 * конфіги сторінок — повний ('/api/admin/sto'), бо їх читає ще й Vue-версія, де
 * fetch викликається напряму. Приймаємо обидві форми, щоб `/api` не задвоївся.
 * Контракт конфігів — shared/page-configs/README.md.
 */
function url(path: string): string {
  return path.startsWith('/api/') ? path : `/api${path}`
}

/**
 * Бекенд віддає осмислені повідомлення ({status:'error', message:'...'}) —
 * дістаємо саме їх, а не безлике "HTTP 400", інакше користувач не дізнається,
 * що саме не так (напр. "Підтримуються лише JPG, PNG, WebP").
 */
/** Помилка запиту з тілом відповіді — щоб виклик міг дістати не лише текст. */
export interface ApiError extends Error {
  status: number
  /** Помилки по полях: { поле: 'текст' } — валідація створення/оновлення */
  errors?: Record<string, string>
  /** Поля, на які немає прав (403) */
  fields?: string[]
}

async function parse<T>(res: Response): Promise<T> {
  const json: any = await res.json().catch(() => null)

  if (!res.ok || json?.status === 'error') {
    // Без цього викликач бачить лише message, і показати помилку біля
    // конкретного поля форми нічим — а бекенд її повертає.
    const err = new Error(json?.message ?? `HTTP ${res.status}`) as ApiError
    err.status = res.status
    if (json?.errors) err.errors = json.errors
    if (json?.fields) err.fields = json.fields
    throw err
  }
  return json as T
}

export async function apiGet<T = any>(path: string): Promise<T> {
  const res = await fetch(url(path), { headers: authHeaders() })
  return parse<T>(res)
}

async function withBody<T>(path: string, method: string, data: any): Promise<T> {
  const res = await fetch(url(path), {
    method,
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  })
  return parse<T>(res)
}

export function apiPost<T = any>(path: string, data: any): Promise<T> {
  return withBody<T>(path, 'POST', data)
}

export function apiPatch<T = any>(path: string, data: any): Promise<T> {
  return withBody<T>(path, 'PATCH', data)
}

export function apiPut<T = any>(path: string, data: any): Promise<T> {
  return withBody<T>(path, 'PUT', data)
}

/** `data` потрібен там, де бекенд читає параметри саме з тіла DELETE (напр. error-logs/cleanup). */
export async function apiDelete<T = any>(path: string, data?: any): Promise<T> {
  const res = await fetch(url(path), {
    method: 'DELETE',
    headers: data === undefined
      ? authHeaders()
      : { 'Content-Type': 'application/json', ...authHeaders() },
    body: data === undefined ? undefined : JSON.stringify(data),
  })
  return parse<T>(res)
}

/**
 * multipart/form-data. Content-Type навмисно не ставимо — браузер має
 * підставити його сам разом із boundary.
 */
export async function apiUpload<T = any>(path: string, form: FormData): Promise<T> {
  const res = await fetch(url(path), {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  })
  return parse<T>(res)
}
