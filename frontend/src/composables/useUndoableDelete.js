import { useNotify } from './useNotify'

// Скільки часу є на "Скасувати" після delete, перш ніж запит реально піде на сервер.
export const UNDO_DELETE_DELAY = 5000

/**
 * Спільна логіка "optimistic delete з undo" для одиночного і масового видалення —
 * той самий підхід, що спершу з'явився в list-framework/DataListPage.vue, винесений
 * сюди, щоб решта сторінок (модалки, catalog/geography CRUD) не копіювали його руками.
 */
export function useUndoableDelete() {
  const { notify } = useNotify()

  /**
   * @param {Object} opts
   * @param {Function} opts.remove - синхронно прибрати запис з локального стану
   * @param {Function} opts.restore - синхронно повернути запис назад (Скасувати / rollback)
   * @param {Function} opts.commit - async, реальний DELETE-запит; кидає помилку при невдачі
   * @param {Function} [opts.onCommitError] - викликається замість restore(), якщо commit провалився
   *   (напр. load() для перезавантаження з сервера замість вгадування позиції назад)
   * @param {string} opts.message - текст тоста, напр. `Запис #5 видалено`
   */
  function deleteWithUndo({ remove, restore, commit, onCommitError, message }) {
    remove()

    let cancelled = false
    const timerId = setTimeout(async () => {
      if (cancelled) return
      try {
        await commit()
      } catch (e) {
        notify(e.message, { type: 'error' })
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

  /**
   * Те саме, але однією групою — один тост і одне "Скасувати" на всю пачку.
   * @param {Object} opts
   * @param {Array} opts.items - записи, що видаляються (довільна форма — прокидається в commitOne/restore)
   * @param {Function} opts.remove - синхронно прибрати всі items з локального стану
   * @param {Function} opts.restore - синхронно повернути всі items назад, отримує (items)
   * @param {Function} opts.commitOne - async, реальний DELETE для одного item; кидає помилку при невдачі
   * @param {Function} [opts.onAnyCommitError] - викликається, якщо хоч один commitOne провалився
   * @param {string} opts.message - текст тоста, напр. `Видалено 3 запис(ів)`
   */
  function deleteManyWithUndo({ items, remove, restore, commitOne, onAnyCommitError, message }) {
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

  return { deleteWithUndo, deleteManyWithUndo }
}
