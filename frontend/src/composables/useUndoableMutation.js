import { useNotify } from './useNotify'
import { onUnmounted } from 'vue'

// Скільки часу є на "Скасувати", перш ніж запит реально піде на сервер.
export const UNDO_DELETE_DELAY = 5000

// Реєстр відкладених мутацій: key → { timerId, commit, commitSync, revert, toastId }.
// Потрібен для трьох речей:
// 1. Дедуплікація повторних змін того самого поля (друга зміня скасовує першу)
// 2. Flush при unmount сторінки (виконати відкладені мутації негайно)
// 3. Flush при закритті вкладки (keepalive-запит "навздогін")
const pending = new Map()

/**
 * Спільна логіка "optimistic mutation з undo" для delete/update — той самий підхід,
 * що раніше був у useUndoableDelete, розширений на однопольні збереження
 * (react-admin: mutationMode="undoable").
 *
 * ⚠️ Свідомо **не** для збереження модалки: там потрібна серверна валідація і
 * version-check, які в undoable-режимі приходять надто пізно —
 * див. tasks/react-admin-parity/10-undoable-save.md.
 */
export function useUndoableMutation() {
  const { notify, dismiss } = useNotify()

  // Спільна механіка таймера + тост + скасування, щоб не дублювати в delete/update
  function scheduleUndo({ key, apply, revert, commit, commitSync, onCommitError, message }) {
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

  async function run(key) {
    const entry = pending.get(key)
    if (!entry) return
    pending.delete(key)
    dismiss(entry.toastId)

    try {
      await entry.commit()
    } catch (e) {
      notify(e.message, { type: 'error' })
      if (entry.onCommitError) await entry.onCommitError()
      else entry.revert()
    }
  }

  /**
   * Оптимістичне видалення одного запису з можливістю відкату.
   * @param {Object} opts
   * @param {Function} opts.remove - синхронно прибрати запис з локального стану
   * @param {Function} opts.restore - синхронно повернути запис назад (Скасувати / rollback)
   * @param {Function} opts.commit - async, реальний DELETE-запит; кидає помилку при невдачі
   * @param {Function} opts.commitSync - синхронний варіант commit з keepalive (для beforeunload)
   * @param {Function} [opts.onCommitError] - викликається замість restore(), якщо commit провалився
   * @param {string} opts.message - текст тоста, напр. `Запис #5 видалено`
   * @param {string} [opts.key] - унікальний ключ мутації (дефолт: випадковий)
   */
  function deleteWithUndo({ remove, restore, commit, commitSync, onCommitError, message, key }) {
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
   * @param {Object} opts
   * @param {Array} opts.items - записи, що видаляються
   * @param {Function} opts.remove - синхронно прибрати всі items з локального стану
   * @param {Function} opts.restore - синхронно повернути всі items назад, отримує (items)
   * @param {Function} opts.commitOne - async, реальний DELETE для одного item; кидає помилку при невдачі
   * @param {Function} opts.commitOneSync - синхронний варіант commitOne з keepalive
   * @param {Function} [opts.onAnyCommitError] - викликається, якщо хоч один commitOne провалився
   * @param {string} opts.message - текст тоста, напр. `Видалено 3 запис(ів)`
   * @param {string} [opts.key] - унікальний ключ мутації (дефолт: випадковий)
   */
  function deleteManyWithUndo({ items, remove, restore, commitOne, commitOneSync, onAnyCommitError, message, key }) {
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
   * @param {Object} opts
   * @param {string} opts.key - унікальний ключ мутації, напр. `${id}:${field}`.
   *   Повторна мутація з тим самим ключем замінює попередню відкладену, а не додає другу.
   * @param {Function} opts.apply - синхронно застосувати нове значення в UI
   * @param {Function} opts.revert - синхронно повернути старе значення
   * @param {Function} opts.commit - async, реальний PATCH; кидає помилку при невдачі
   * @param {Function} opts.commitSync - синхронний варіант commit з keepalive (для beforeunload)
   * @param {Function} [opts.onCommitError] - замість revert() при провалі commit
   * @param {string} opts.message - текст тоста, напр. `«Львів» → «Львів-1»`
   */
  function updateWithUndo({ key, apply, revert, commit, commitSync, onCommitError, message }) {
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
  function hasPending(key) {
    return key ? pending.has(key) : pending.size > 0
  }

  // Автоматичний flush при unmount компонента, що викликав useUndoableMutation
  onUnmounted(() => {
    flushPending()
  })

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
window.addEventListener('beforeunload', () => {
  for (const entry of pending.values()) {
    clearTimeout(entry.timerId)
    entry.commitSync?.()
  }
  pending.clear()
})
