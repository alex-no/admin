import { deleteWithUndo, deleteManyWithUndo } from '@core/undoableDelete'
import { UNDO_DELETE_DELAY } from '@core/undoableMutation'

export { UNDO_DELETE_DELAY }
export { deleteWithUndo, deleteManyWithUndo }

/**
 * Optimistic delete з undo: запис зникає одразу, справжній запит іде через
 * UNDO_DELETE_DELAY. Сама логіка — в ядрі (@core/undoableDelete), спільна з Vue.
 */
export function useUndoableDelete() {
  return { deleteWithUndo, deleteManyWithUndo }
}
