import { useEffect } from 'react'
import {
  deleteWithUndo,
  deleteManyWithUndo,
  updateWithUndo,
  flushPendingMutations,
  hasPendingMutation,
  UNDO_DELETE_DELAY,
} from '@core/undoableMutation'

export { UNDO_DELETE_DELAY }

/**
 * Спільна логіка "optimistic mutation з undo" для delete/update — той самий підхід,
 * що раніше був у useUndoableDelete, розширений на однопольні збереження
 * (react-admin: mutationMode="undoable"). Сама логіка — в ядрі
 * (@core/undoableMutation), спільна з Vue; тут лише unmount-хук flushPending.
 *
 * ⚠️ Свідомо **не** для збереження модалки: там потрібна серверна валідація і
 * version-check, які в undoable-режимі приходять надто пізно.
 */
export function useUndoableMutation() {
  // Автоматичний flush при unmount компонента, що викликав useUndoableMutation
  useEffect(() => {
    return () => {
      flushPendingMutations()
    }
  }, [])

  return {
    deleteWithUndo,
    deleteManyWithUndo,
    updateWithUndo,
    flushPending: flushPendingMutations,
    hasPending: hasPendingMutation,
  }
}
