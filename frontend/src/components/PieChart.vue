<template>
  <div class="pie-chart-container">
    <svg :width="size" :height="size" v-if="slices.length">
      <g :transform="`translate(${size/2}, ${size/2})`">
        <path
          v-for="(slice, idx) in slices"
          :key="idx"
          :d="slice.path"
          :fill="slice.color"
          :stroke="'#fff'"
          :stroke-width="2"
        />
      </g>
    </svg>
    <div class="legend mt-2">
      <div v-for="(slice, idx) in slices" :key="idx" class="legend-item">
        <span class="color-box" :style="{ backgroundColor: slice.color }"></span>
        <span class="small">{{ slice.label }}: <strong>{{ slice.value }}</strong></span>
      </div>
    </div>
    <div v-if="!slices.length" class="text-center text-muted py-3">Немає даних</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  data: { type: Array, default: () => [] },
  labelKey: { type: String, required: true },
  valueKey: { type: String, required: true },
  size: { type: Number, default: 250 },
})

const colors = ['#0d6efd', '#198754', '#ffc107', '#dc3545', '#6c757d', '#0dcaf0', '#6f42c1', '#fd7e14']

const slices = computed(() => {
  if (!props.data || !props.data.length) return []

  const total = props.data.reduce((sum, item) => sum + (item[props.valueKey] || 0), 0)
  if (total === 0) return []

  let currentAngle = -Math.PI / 2
  const radius = props.size / 2 - 10

  return props.data.map((item, idx) => {
    const value = item[props.valueKey] || 0
    const angle = (value / total) * 2 * Math.PI
    const startX = Math.cos(currentAngle) * radius
    const startY = Math.sin(currentAngle) * radius
    const endX = Math.cos(currentAngle + angle) * radius
    const endY = Math.sin(currentAngle + angle) * radius
    const largeArc = angle > Math.PI ? 1 : 0

    const path = [
      `M 0 0`,
      `L ${startX} ${startY}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`,
      `Z`,
    ].join(' ')

    currentAngle += angle

    return {
      label: item[props.labelKey] || 'Unknown',
      value,
      color: colors[idx % colors.length],
      path,
    }
  })
})
</script>

<style scoped>
.pie-chart-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.legend {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.color-box {
  width: 16px;
  height: 16px;
  border-radius: 2px;
}
</style>
