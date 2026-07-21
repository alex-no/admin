<template>
  <div class="bar-chart">
    <svg :width="width" :height="height" v-if="items.length">
      <g v-for="(item, idx) in items" :key="idx">
        <rect
          :x="padding"
          :y="padding + idx * barHeight"
          :width="item.barWidth"
          :height="barHeight - 5"
          :fill="color"
        />
        <text
          :x="padding - 5"
          :y="padding + idx * barHeight + barHeight / 2 + 4"
          text-anchor="end"
          font-size="12"
          fill="#666"
        >
          {{ item.label }}
        </text>
        <text
          :x="padding + item.barWidth + 5"
          :y="padding + idx * barHeight + barHeight / 2 + 4"
          font-size="12"
          fill="#333"
          font-weight="bold"
        >
          {{ item.value }}
        </text>
      </g>
    </svg>
    <div v-else class="text-center text-muted py-3">Немає даних</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  data: { type: Array, default: () => [] },
  labelKey: { type: String, required: true },
  valueKey: { type: String, required: true },
  title: { type: String, default: '' },
  color: { type: String, default: '#0d6efd' },
  width: { type: Number, default: 400 },
})

const padding = 100
const barHeight = 30

const height = computed(() => {
  return (props.data?.length || 1) * barHeight + padding
})

const maxValue = computed(() => {
  return Math.max(...(props.data?.map(item => item[props.valueKey]) || [1]))
})

const items = computed(() => {
  if (!props.data || !props.data.length) return []

  const maxBarWidth = props.width - padding - 80

  return props.data.map(item => ({
    label: item[props.labelKey] || 'Unknown',
    value: item[props.valueKey] || 0,
    barWidth: ((item[props.valueKey] || 0) / maxValue.value) * maxBarWidth,
  }))
})
</script>

<style scoped>
.bar-chart {
  width: 100%;
}
</style>
