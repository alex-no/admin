import { notify, dismiss } from './useNotify'
import { useEffect } from 'react'

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

interface DeleteWithUndoOptions {
  /** синхронно прибрати запис з локального стану */
  remove: () => void
  /** синхронно повернути запис назад (Скасувати / rollback) */
  restore: () => void
  /** async, реальний DELETE-запит; кидає помилку при невдачі */
  commit: () => Promise<void>
  /** синхронний варіант commit з keepalive (для beforeunload) */
  commitSync?: () => void
  /** викликається замість restore(), якщо commit провалився */
  onCommitError?: () => void | Promise<void>
  /** текст тоста, напр. `Запис #5 видалено` */
  message: string
  /** унікальний ключ мутації (дефолт: випадковий) */
  key?: string
}

interface DeleteManyWithUndoOptions<T> {
  /** записи, що видаляються */
  items: T[]
  /** синхронно прибрати всі items з локального стану */
  remove: () => void
  /** синхронно повернути всі items назад, отримує (items) */
  restore: (items: T[]) => void
  /** async, реальний DELETE для одного item; кидає помилку при невдачі */
  commitOne: (item: T) => Promise<void>
  /** синхронний варіант commitOne з keepalive */
  commitOneSync?: (item: T) => void
  /** викликається, якщо хоч один commitOne провалився */
  onAnyCommitError?: () => void | Promise<void>
  /** текст тоста, напр. `Видалено 3 запис(ів)` */
  message: string
  /** унікальний ключ мутації (дефолт: випадковий) */
  key?: string
}

interface UpdateWithUndoOptions {
  /** унікальний ключ мутації, напр. `${id}:${field}`.
   *   Повторна мутація з тим самим ключем замінює попередню відкладену, а не додає другу. */
  key: string
  /** синхронно застосувати нове значення в UI */
  apply: () => void
  /** синхронно повернути старе значення */
  revert: () => void
  /** async, реальний PATCH; кидає помилку при невдачі */
  commit: () => Promise<void>
  /** синхронний варіант commit з keepalive (для beforeunload) */
  commitSync?: () => void
  /** замість revert() при провалі commit */
  onCommitError?: () => void | Promise<void>
  /** текст тоста, напр. `«Львів» → «Львів-1»` */
  message: string
}

async function run(key: string) {
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

function scheduleUndo({
  key,
  apply,
  revert,
  commit,
  commitSync,
  onCommitError,
  message,
}: ScheduleUndoOptions) {
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

  pending.set(key, {
    timerId,
    toastId,
    commit,
    commitSync,
    revert,
    onCommitError,
  })
}

/**
 * Спільна логіка "optimistic mutation з undo" для delete/update — той самий підхід,
 * що раніше був у useUndoableDelete, розширений на однопольні збереження
 * (react-admin: mutationMode="undoable").
 *
 * ⚠️ Свідомо **не** для збереження модалки: там потрібна серверна валідація і
 * version-check, які в undoable-режимі приходять надто пізно.
 */
export function useUndoableMutation() {
  /**
   * Оптимістичне видалення одного запису з можливістю відкату.
   */
  function deleteWithUndo({
    remove,
    restore,
    commit,
    commitSync,
    onCommitError,
    message,
    key,
  }: DeleteWithUndoOptions) {
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

  /**
   * Оптимістичне видалення групи записів — один тост і одне "Скасувати" на всю пачку.
   */
  function deleteManyWithUndo<T>({
    items,
    remove,
    restore,
    commitOne,
    commitOneSync,
    onAnyCommitError,
    message,
    key,
  }: DeleteManyWithUndoOptions<T>) {
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

  /**
   * Оптимістична зміна одного поля з можливістю відкату (react-admin: mutationMode="undoable").
   */
  function updateWithUndo({
    key,
    apply,
    revert,
    commit,
    commitSync,
    onCommitError,
    message,
  }: UpdateWithUndoOptions) {
    scheduleUndo({
      key,
      apply,
      revert,
      commit,
      commitSync,
      onCommitError,
      message,
    })
  }

  /** Виконати всі відкладені мутації негайно (unmount сторінки, зміна маршруту). */
  async function flushPending() {
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
  function hasPending(key?: string) {
    return key ? pending.has(key) : pending.size > 0
  }

  // Автоматичний flush при unmount компонента, що викликав useUndoableMutation
  useEffect(() => {
    return () => {
      flushPending()
    }
  }, [])

  return {
    deleteWithUndo,
    deleteManyWithUndo,
    updateWithUndo,
    flushPending,
    hasPending,
  }
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
