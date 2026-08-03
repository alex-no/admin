<template>
  <div class="d-inline-flex align-items-center" style="gap: 0.125rem; margin-right: 2rem">
    <button
      class="btn btn-sm btn-outline-secondary py-0 px-2"
      :disabled="!hasPrev || busy"
      title="Попередній запис"
      @click="$emit('prev')"
    >
      ‹
    </button>
    <span
      class="text-muted small font-monospace"
      style="min-width: 4rem; text-align: center"
    >
      <span
        v-if="busy"
        class="spinner-border spinner-border-sm"
        style="width: 0.7rem; height: 0.7rem"
      ></span>
      <template v-else>{{ position ?? '—' }} / {{ totalCount }}</template>
    </span>
    <button
      class="btn btn-sm btn-outline-secondary py-0 px-2"
      :disabled="!hasNext || busy"
      title="Наступний запис"
      @click="$emit('next')"
    >
      ›
    </button>
  </div>
</template>

<script setup>
defineProps({
  position: Number,
  totalCount: Number,
  hasPrev: Boolean,
  hasNext: Boolean,
  busy: Boolean,
})

defineEmits(['prev', 'next'])
</script>
