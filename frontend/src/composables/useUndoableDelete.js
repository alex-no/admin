// Copyright (c) 2026 Oleksandr Nosov. MIT License.
import { deleteWithUndo, deleteManyWithUndo } from '@core/undoableDelete'
import { UNDO_DELETE_DELAY } from '@core/undoableMutation'

export { UNDO_DELETE_DELAY }

/**
 * Спільна логіка "optimistic delete з undo" для одиночного і масового видалення —
 * той самий підхід, що спершу з'явився в list-framework/DataListPage.vue, винесений
 * сюди, щоб решта сторінок (модалки, catalog/geography CRUD) не копіювали його руками.
 * Сама логіка — в ядрі (@core/undoableDelete), спільна з React.
 */
export function useUndoableDelete() {
  return { deleteWithUndo, deleteManyWithUndo }
}
