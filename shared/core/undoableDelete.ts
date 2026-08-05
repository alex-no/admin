import { notify } from './notifications'
import { UNDO_DELETE_DELAY } from './undoableMutation'

export interface DeleteWithUndoOptions {
  /** синхронно прибрати запис з локального стану */
  remove: () => void
  /** синхронно повернути запис назад (Скасувати / rollback) */
  restore: () => void
  /** async, реальний DELETE-запит; кидає помилку при невдачі */
  commit: () => Promise<void>
  /** викликається замість restore(), якщо commit провалився */
  onCommitError?: () => void | Promise<void>
  /** текст тоста, напр. `Запис #5 видалено` */
  message: string
}

/**
 * Optimistic delete з undo: запис зникає одразу, справжній запит іде через
 * UNDO_DELETE_DELAY — весь цей час у тості висить кнопка "Скасувати".
 *
 * Простіша версія без дедуплікації/flush (див. undoableMutation.ts) — для
 * одиничного delete, який ніхто не встигне повторити тим самим ключем.
 */
export function deleteWithUndo({ remove, restore, commit, onCommitError, message }: DeleteWithUndoOptions): void {
  remove()

  let cancelled = false
  const timerId = setTimeout(async () => {
    if (cancelled) return
    try {
      await commit()
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Помилка видалення', { type: 'error' })
      if (onCommitError) await onCommitError()
      else restore()
    }
  }, UNDO_DELETE_DELAY)

  notify(message, {
    type: 'info',
    duration: UNDO_DELETE_DELAY,
    action: {
      label: 'Скасувати',
      onClick: () => {
        cancelled = true
        clearTimeout(timerId)
        restore()
      },
    },
  })
}

export interface DeleteManyWithUndoOptions<T> {
  /** записи, що видаляються (довільна форма — прокидається в commitOne/restore) */
  items: T[]
  remove: () => void
  restore: (items: T[]) => void
  /** async, реальний DELETE для одного item; кидає помилку при невдачі */
  commitOne: (item: T) => Promise<void>
  onAnyCommitError?: () => void | Promise<void>
  message: string
}

/** Те саме, але однією групою — один тост і одне "Скасувати" на всю пачку. */
export function deleteManyWithUndo<T>({
  items,
  remove,
  restore,
  commitOne,
  onAnyCommitError,
  message,
}: DeleteManyWithUndoOptions<T>): void {
  remove()

  let cancelled = false
  const timerId = setTimeout(async () => {
    if (cancelled) return
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
  }, UNDO_DELETE_DELAY)

  notify(message, {
    type: 'info',
    duration: UNDO_DELETE_DELAY,
    action: {
      label: 'Скасувати',
      onClick: () => {
        cancelled = true
        clearTimeout(timerId)
        restore(items)
      },
    },
  })
}
