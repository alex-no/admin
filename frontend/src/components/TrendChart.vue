<template>
  <div class="trend-chart">
    <svg :width="width" :height="height" style="display: block;">
      <!-- Grid lines -->
      <g class="grid">
        <line
          v-for="i in 5"
          :key="'h' + i"
          :x1="padding"
          :y1="padding + (chartHeight / 4) * (i - 1)"
          :x2="width - padding"
          :y2="padding + (chartHeight / 4) * (i - 1)"
          stroke="#e0e0e0"
          stroke-width="1"
        />
      </g>

      <!-- Y-axis labels -->
      <g class="y-labels">
        <text
          v-for="i in 5"
          :key="'y' + i"
          :x="padding - 10"
          :y="padding + (chartHeight / 4) * (i - 1) + 5"
          text-anchor="end"
          font-size="12"
          fill="#666"
        >
          {{ Math.round(maxValue - (maxValue / 4) * (i - 1)) }}
        </text>
      </g>

      <!-- Lines -->
      <g v-for="(dataset, idx) in datasets" :key="idx" class="dataset">
        <polyline
          :points="getPoints(dataset.data)"
          fill="none"
          :stroke="dataset.color"
          stroke-width="2"
        />
        <circle
          v-for="(val, i) in dataset.data"
          :key="i"
          :cx="padding + (chartWidth / (labels.length - 1)) * i"
          :cy="padding + chartHeight - (val / maxValue) * chartHeight"
          r="4"
          :fill="dataset.color"
        />
      </g>

      <!-- X-axis labels -->
      <g class="x-labels">
        <text
          v-for="(label, i) in labels"
          :key="'x' + i"
          :x="padding + (chartWidth / (labels.length - 1)) * i"
          :y="height - padding + 20"
          text-anchor="middle"
          font-size="11"
          fill="#666"
        >
          {{ formatDate(label) }}
        </text>
      </g>
    </svg>

    <!-- Legend -->
    <div class="legend mt-2 d-flex gap-3 justify-content-center flex-wrap">
      <div v-for="(dataset, idx) in datasets" :key="idx" class="d-flex align-items-center gap-1">
        <div :style="{ width: '16px', height: '16px', backgroundColor: dataset.color, borderRadius: '2px' }"></div>
        <span class="small">{{ dataset.label }} ({{ sum(dataset.data) }})</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  labels: { type: Array, required: true },
  datasets: { type: Array, required: true },
})

const width = 900
const height = 350
const padding = 50

const chartWidth = computed(() => width - padding * 2)
const chartHeight = computed(() => height - padding * 2 - 20)

const maxValue = computed(() => {
  let max = 0
  props.datasets.forEach(ds => {
    ds.data.forEach(val => {
      if (val > max) max = val
    })
  })
  return max > 0 ? max : 10
})

function getPoints(data) {
  return data.map((val, i) => {
    const x = padding + (chartWidth.value / (props.labels.length - 1)) * i
    const y = padding + chartHeight.value - (val / maxValue.value) * chartHeight.value
    return `${x},${y}`
  }).join(' ')
}

function formatDate(dt) {
  if (!dt) return ''
  const parts = dt.split('-')
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}`
  }
  return dt
}

function sum(arr) {
  return arr.reduce((s, v) => s + v, 0)
}
</script>

<style scoped>
.trend-chart {
  width: 100%;
}
</style>
