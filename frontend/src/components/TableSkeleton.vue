<!-- Copyright (c) 2026 Oleksandr Nosov. MIT License. -->
<template>
  <tbody>
    <tr v-for="r in rows" :key="r">
      <td v-if="hasCheckbox" style="width:36px">
        <span class="sk" style="width:1rem"></span>
      </td>
      <td
        v-for="(col, i) in columns"
        :key="i"
        :style="col.width ? `width:${col.width}px` : ''"
        :class="col.align === 'end' ? 'text-end' : ''"
      >
        <span class="sk" :style="{ width: col.skeletonWidth ?? '80%' }"></span>
      </td>
    </tr>
  </tbody>
</template>

<script setup>
defineProps({
  rows: { type: Number, default: 10 },
  columns: { type: Array, required: true },
  hasCheckbox: { type: Boolean, default: false },
})
</script>

<style scoped>
.sk {
  display: inline-block;
  height: 0.85rem;
  border-radius: 0.2rem;
  background: #e9ecef;
  animation: sk-pulse 1.2s ease-in-out infinite;
}
@keyframes sk-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.45;
  }
}
@media (prefers-reduced-motion: reduce) {
  .sk {
    animation: none;
  }
}
</style>
