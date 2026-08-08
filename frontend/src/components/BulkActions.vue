<template>
  <div class="d-flex align-items-center gap-2 flex-wrap p-2 mb-3 bg-light border rounded">
    <span class="fw-semibold small">{{ t('bulk.selected', { count }) }}</span>

    <button
      v-if="actions.includes('activate')"
      class="btn btn-sm btn-outline-success"
      :disabled="busy"
      @click="run('activate')"
    >
      <i class="bi bi-check-circle me-1"></i>{{ t('bulk.activate') }}
    </button>

    <button
      v-if="actions.includes('deactivate')"
      class="btn btn-sm btn-outline-secondary"
      :disabled="busy"
      @click="run('deactivate')"
    >
      <i class="bi bi-slash-circle me-1"></i>{{ t('bulk.deactivate') }}
    </button>

    <button
      v-if="actions.includes('delete')"
      class="btn btn-sm btn-outline-danger"
      :disabled="busy"
      @click="run('delete')"
    >
      <i class="bi bi-trash me-1"></i>{{ t('common.delete') }}
    </button>

    <span v-if="busy" class="spinner-border spinner-border-sm text-secondary"></span>

    <button class="btn btn-sm btn-link text-muted ms-auto" :disabled="busy" @click="$emit('clear')">
      {{ t('bulk.clearSelection') }}
    </button>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n({ useScope: 'global' })

defineProps({
  count: { type: Number, required: true },
  actions: { type: Array, default: () => [] },
  busy: { type: Boolean, default: false },
})

const emit = defineEmits(['action', 'clear'])

function run(action) {
  emit('action', action)
}
</script>
