<!-- Copyright (c) 2026 Oleksandr Nosov. MIT License. -->
<template>
  <div ref="rootEl" class="position-relative d-inline-block">
    <button
      type="button"
      class="btn btn-sm btn-outline-secondary"
      :title="hasHidden ? 'Колонки таблиці (частина прихована)' : 'Колонки таблиці'"
      @click="open = !open"
    >
      <i class="bi bi-layout-three-columns"></i>
      <span v-if="hiddenCount" class="badge bg-secondary ms-1 py-0" style="font-size:.65em">
        {{ hiddenCount }}
      </span>
    </button>

    <!-- Дропдаун рукописний, як решта в адмінці: Bootstrap JS ним не керує -->
    <div
      v-if="open"
      class="dropdown-menu show p-2"
      style="top:100%;left:auto;right:0;min-width:210px;max-height:320px;overflow-y:auto;z-index:1050"
    >
      <div v-for="col in hideableColumns" :key="col.key" class="form-check mb-1">
        <input
          :id="`colsel-${uid}-${col.key}`"
          class="form-check-input"
          type="checkbox"
          :checked="isVisible(col.key)"
          @change="emit('toggle', col.key)"
        />
        <label class="form-check-label small" :for="`colsel-${uid}-${col.key}`">
          {{ translateLabel(col.label) }}
        </label>
      </div>

      <div v-if="!hideableColumns.length" class="text-muted small px-1">
        Немає колонок, які можна приховати
      </div>

      <template v-if="hideableColumns.length">
        <hr class="my-2" />
        <button
          type="button"
          class="btn btn-sm btn-link p-0 small text-decoration-none"
          :disabled="!hasHidden"
          @click="emit('reset')"
        >
          {{ labels.reset }}
        </button>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n({ useScope: 'global' })
const labels = computed(() => ({
  reset: t('table.resetColumns'),
}))

// Дзеркало DataListPage.vue → translateLabel: лейбл перекладається, лише якщо
// схожий на i18n-ключ (містить крапку) — конфіги колонок не завжди його дають.
function translateLabel(label) {
  if (!label) return ''
  if (label.includes('.')) {
    const translated = t(label)
    return translated !== label ? translated : label
  }
  return label
}

const props = defineProps({
  // Повний конфіг колонок таблиці; показуємо лише hideable !== false
  columns:   { type: Array,    required: true },
  isVisible: { type: Function, required: true },
  hasHidden: { type: Boolean,  default: false },
})

const emit = defineEmits(['toggle', 'reset'])

// Унікальний префікс для id чекбоксів: на сторінці може бути кілька таблиць
let seq = 0
const uid = ++seq

const open = ref(false)
const rootEl = ref(null)

const hideableColumns = computed(() => props.columns.filter((c) => c.hideable !== false))
const hiddenCount = computed(() => hideableColumns.value.filter((c) => !props.isVisible(c.key)).length)

// Окремої утиліти click-outside у проєкті немає — слухаємо document тут.
function onDocumentMouseDown(e) {
  if (!open.value) return
  if (rootEl.value && !rootEl.value.contains(e.target)) open.value = false
}

function onKeydown(e) {
  if (e.key === 'Escape') open.value = false
}

onMounted(() => {
  document.addEventListener('mousedown', onDocumentMouseDown)
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', onDocumentMouseDown)
  document.removeEventListener('keydown', onKeydown)
})
</script>
