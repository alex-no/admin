<template>
  <nav v-if="totalPages > 1">
    <ul class="pagination pagination-sm mb-0">
      <!-- First page -->
      <li class="page-item" :class="{ disabled: currentPage === 1 }">
        <button class="page-link" @click="goTo(1)" :disabled="currentPage === 1" title="Перша сторінка">
          ‹‹
        </button>
      </li>

      <!-- Previous page -->
      <li class="page-item" :class="{ disabled: currentPage === 1 }">
        <button class="page-link" @click="goTo(currentPage - 1)" :disabled="currentPage === 1" title="Попередня">
          ‹
        </button>
      </li>

      <!-- Page numbers with ellipsis -->
      <template v-for="item in pageItems" :key="item.page || item.ellipsis">
        <li v-if="item.ellipsis" class="page-item disabled">
          <span class="page-link">…</span>
        </li>
        <li v-else class="page-item" :class="{ active: item.page === currentPage }">
          <button class="page-link" @click="goTo(item.page)">{{ item.page }}</button>
        </li>
      </template>

      <!-- Next page -->
      <li class="page-item" :class="{ disabled: currentPage === totalPages }">
        <button class="page-link" @click="goTo(currentPage + 1)" :disabled="currentPage === totalPages" title="Наступна">
          ›
        </button>
      </li>

      <!-- Last page -->
      <li class="page-item" :class="{ disabled: currentPage === totalPages }">
        <button class="page-link" @click="goTo(totalPages)" :disabled="currentPage === totalPages" title="Остання сторінка">
          ››
        </button>
      </li>
    </ul>
  </nav>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  currentPage: {
    type: Number,
    required: true
  },
  totalPages: {
    type: Number,
    required: true
  }
})

const emit = defineEmits(['change'])

function goTo(page) {
  if (page >= 1 && page <= props.totalPages && page !== props.currentPage) {
    emit('change', page)
  }
}

/**
 * Вычисляет массив элементов пейджера с многоточиями
 *
 * Правила:
 * - Всегда показываем первые 2 страницы (1, 2)
 * - Всегда показываем последние 2 страницы (N-1, N)
 * - Вокруг текущей показываем по 2 с каждой стороны (current-2...current+2)
 * - Многоточия ставим там, где есть разрыв
 *
 * Примеры для total=20:
 * - current=2:  1 [2] 3 4 … 19 20
 * - current=5:  1 2 3 4 [5] 6 7 … 19 20
 * - current=6:  1 2 … 4 5 [6] 7 8 … 19 20
 * - current=18: 1 2 … 16 17 [18] 19 20
 * - current=19: 1 2 … 17 18 [19] 20
 */
const pageItems = computed(() => {
  const current = props.currentPage
  const total = props.totalPages
  const items = []

  // Если страниц мало, показываем все
  if (total <= 8) {
    for (let i = 1; i <= total; i++) {
      items.push({ page: i })
    }
    return items
  }

  // Определяем диапазон вокруг текущей страницы
  const rangeStart = Math.max(1, current - 2)
  const rangeEnd = Math.min(total, current + 2)

  // Добавляем первые 2 страницы
  items.push({ page: 1 })
  if (total > 1) {
    items.push({ page: 2 })
  }

  // Проверяем, нужно ли многоточие слева
  // Разрыв есть, если между "2" и "rangeStart" есть пропущенные страницы
  if (rangeStart > 3) {
    items.push({ ellipsis: 'left' })
  }

  // Добавляем страницы вокруг текущей (исключая уже добавленные 1,2 и будущие N-1,N)
  for (let i = Math.max(3, rangeStart); i <= Math.min(total - 2, rangeEnd); i++) {
    items.push({ page: i })
  }

  // Проверяем, нужно ли многоточие справа
  // Разрыв есть, если между "rangeEnd" и "total-1" есть пропущенные страницы
  if (rangeEnd < total - 2) {
    items.push({ ellipsis: 'right' })
  }

  // Добавляем последние 2 страницы
  if (total > 2) {
    items.push({ page: total - 1 })
  }
  items.push({ page: total })

  return items
})
</script>

<style scoped>
.page-link {
  cursor: pointer;
  user-select: none;
}

.page-item.disabled .page-link {
  cursor: not-allowed;
}
</style>
