<template>
  <i v-if="sortKey === col && sortDir === 'ASC'"  class="bi bi-chevron-up ms-1"></i>
  <i v-else-if="sortKey === col && sortDir === 'DESC'" class="bi bi-chevron-down ms-1"></i>
  <i v-else class="bi bi-chevron-expand ms-1 opacity-25"></i>
</template>

<script setup>
defineProps({
  col: { type: String, required: true },
  sortKey: { type: String, required: true },
  sortDir: { type: String, required: true },
})
</script>
