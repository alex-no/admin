import { computed, ref } from 'vue'
import { computeRecordPosition, findIndexById, hasNextRecord, hasPrevRecord } from '@core/recordNav'

/**
 * Навігація «попередній / наступний запис» у модалці (react-admin:
 * PrevNextButtons). Ходить по items поточної сторінки, а на межі — підгружає
 * сусідню сторінку через load() і відкриває крайній запис із неї.
 *
 * @param {Object} opts
 * @param {import('vue').Ref<Array>} opts.items     - рядки поточної сторінки
 * @param {import('vue').Ref<number>} opts.page
 * @param {import('vue').Ref<number>} opts.perPage
 * @param {import('vue').Ref<number>} opts.total    - всього записів з урахуванням фільтрів
 * @param {import('vue').Ref<number|null>} opts.currentId
 * @param {Function} opts.load       - async (page) => void, уже є на кожній сторінці
 * @param {Function} opts.openRecord - (row) => void, відкрити модалку на цьому рядку
 * @param {Function} [opts.canLeave] - () => boolean|Promise<boolean>, guard незбережених змін
 */
export function useRecordNav({ items, page, perPage, total, currentId, load, openRecord, canLeave }) {
  const busy = ref(false) // блокує паралельні load() при швидкому клацанні

  const indexOnPage = computed(() => findIndexById(items.value, currentId.value))
  const position = computed(() => computeRecordPosition(indexOnPage.value, page.value, perPage.value))

  const hasPrev = computed(() => hasPrevRecord(position.value))
  const hasNext = computed(() => hasNextRecord(position.value, total.value))

  async function step(delta) {
    if (busy.value) return
    if (canLeave && !(await canLeave())) return

    const i = indexOnPage.value
    if (i === -1) return

    const target = i + delta
    if (target >= 0 && target < items.value.length) {
      openRecord(items.value[target])
      return
    }

    // Межа сторінки — підгружаємо сусідню
    busy.value = true
    try {
      await load(page.value + delta)
      const row = delta > 0 ? items.value[0] : items.value[items.value.length - 1]
      if (row) openRecord(row)
    } finally {
      busy.value = false
    }
  }

  return {
    position, totalCount: total, busy,
    hasPrev, hasNext,
    goPrev: () => hasPrev.value && step(-1),
    goNext: () => hasNext.value && step(1),
  }
}
