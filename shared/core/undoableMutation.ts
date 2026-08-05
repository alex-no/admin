import { notify, dismiss } from './notifications'

// Скільки часу є на "Скасувати", перш ніж запит реально піде на сервер.
export const UNDO_DELETE_DELAY = 5000

interface PendingEntry {
  timerId: ReturnType<typeof setTimeout>
  toastId: number
  commit: () => Promise<void>
  commitSync?: () => void
  revert: () => void
  onCommitError?: () => void | Promise<void>
}

// Реєстр відкладених мутацій: key → { timerId, commit, commitSync, revert, toastId }.
// Потрібен для трьох речей:
// 1. Дедуплікація повторних змін того самого поля (друга зміня скасовує першу)
// 2. Flush при unmount сторінки (виконати відкладені мутації негайно)
// 3. Flush при закритті вкладки (keepalive-запит "навздогін")
const pending = new Map<string, PendingEntry>()

interface ScheduleUndoOptions {
  key: string
  apply: () => void
  revert: () => void
  commit: () => Promise<void>
  commitSync?: () => void
  onCommitError?: () => void | Promise<void>
  message: string
}

async function run(key: string): Promise<void> {
  const entry = pending.get(key)
  if (!entry) return
  pending.delete(key)
  dismiss(entry.toastId)

  try {
    await entry.commit()
  } catch (e) {
    notify(e instanceof Error ? e.message : 'Помилка', { type: 'error' })
    if (entry.onCommitError) await entry.onCommitError()
    else entry.revert()
  }
}

function scheduleUndo({ key, apply, revert, commit, commitSync, onCommitError, message }: ScheduleUndoOptions): void {
  // Друга зміна того самого поля скасовує першу відкладену — інакше полетять
  // два запити, і порядок їх застосування на сервері не гарантований
  const prev = pending.get(key)
  if (prev) {
    clearTimeout(prev.timerId)
    dismiss(prev.toastId)
    pending.delete(key)
  }

  apply()

  let cancelled = false
  const timerId = setTimeout(async () => {
    if (cancelled) return
    await run(key)
  }, UNDO_DELETE_DELAY)

  const toastId = notify(message, {
    type: 'info',
    duration: UNDO_DELETE_DELAY,
    action: {
      label: 'Скасувати',
      onClick: () => {
        cancelled = true
        clearTimeout(timerId)
        pending.delete(key)
        revert()
      },
    },
  })

  pending.set(key, { timerId, toastId, commit, commitSync, revert, onCommitError })
}

export interface DeleteWithUndoOptions {
  remove: () => void
  restore: () => void
  commit: () => Promise<void>
  commitSync?: () => void
  onCommitError?: () => void | Promise<void>
  message: string
  key?: string
}

/** Оптимістичне видалення одного запису з можливістю відкату. */
export function deleteWithUndo({ remove, restore, commit, commitSync, onCommitError, message, key }: DeleteWithUndoOptions): void {
  scheduleUndo({
    key: key || `delete:${Math.random()}`,
    apply: remove,
    revert: restore,
    commit,
    commitSync,
    onCommitError,
    message,
  })
}

export interface DeleteManyWithUndoOptions<T> {
  items: T[]
  remove: () => void
  restore: (items: T[]) => void
  commitOne: (item: T) => Promise<void>
  commitOneSync?: (item: T) => void
  onAnyCommitError?: () => void | Promise<void>
  message: string
  key?: string
}

/** Оптимістичне видалення групи записів — один тост і одне "Скасувати" на всю пачку. */
export function deleteManyWithUndo<T>({
  items,
  remove,
  restore,
  commitOne,
  commitOneSync,
  onAnyCommitError,
  message,
  key,
}: DeleteManyWithUndoOptions<T>): void {
  scheduleUndo({
    key: key || `deleteMany:${Math.random()}`,
    apply: remove,
    revert: () => restore(items),
    commit: async () => {
      let anyFailed = false
      for (const item of items) {
        try {
          await commitOne(item)
        } catch {
          anyFailed = true
        }
      }
      if (anyFailed) {
        notify('Не вдалося видалити деякі записи', { type: 'error' })
        if (onAnyCommitError) await onAnyCommitError()
      }
    },
    commitSync: commitOneSync
      ? () => {
          for (const item of items) {
            commitOneSync(item)
          }
        }
      : undefined,
    onCommitError: undefined, // вже обробили всередині commit
    message,
  })
}

export interface UpdateWithUndoOptions {
  /** унікальний ключ мутації, напр. `${id}:${field}`.
   *  Повторна мутація з тим самим ключем замінює попередню відкладену, а не додає другу. */
  key: string
  apply: () => void
  revert: () => void
  commit: () => Promise<void>
  commitSync?: () => void
  onCommitError?: () => void | Promise<void>
  message: string
}

/** Оптимістична зміна одного поля з можливістю відкату (react-admin: mutationMode="undoable"). */
export function updateWithUndo({ key, apply, revert, commit, commitSync, onCommitError, message }: UpdateWithUndoOptions): void {
  scheduleUndo({ key, apply, revert, commit, commitSync, onCommitError, message })
}

/** Виконати всі відкладені мутації негайно (unmount сторінки, зміна маршруту). */
export async function flushPendingMutations(): Promise<void> {
  const keys = [...pending.keys()]
  for (const k of keys) {
    const entry = pending.get(k)
    if (entry) {
      clearTimeout(entry.timerId)
      dismiss(entry.toastId)
    }
    await run(k)
  }
}

/** Перевірити, чи є відкладені мутації для даного ключа (або взагалі). */
export function hasPendingMutation(key?: string): boolean {
  return key ? pending.has(key) : pending.size > 0
}

/** Лише для тестів: скидає реєстр відкладених мутацій між прогонами. */
export function __resetPendingMutationsForTests(): void {
  for (const entry of pending.values()) clearTimeout(entry.timerId)
  pending.clear()
}

// beforeunload: async-запит не встигне. Виконуємо синхронні варіанти commit'ів
// (keepalive), які браузер дозволяє відправити "навздогін".
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    for (const entry of pending.values()) {
      clearTimeout(entry.timerId)
      entry.commitSync?.()
    }
    pending.clear()
  })
}
