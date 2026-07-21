<template>
  <div class="hourly-chart">
    <svg :width="width" :height="height" v-if="bars.length">
      <!-- Y-axis labels -->
      <g v-for="i in 5" :key="'y' + i">
        <text
          :x="padding - 10"
          :y="padding + (chartHeight / 4) * (i - 1) + 5"
          text-anchor="end"
          font-size="11"
          fill="#666"
        >
          {{ Math.round(maxValue - (maxValue / 4) * (i - 1)) }}
        </text>
      </g>

      <!-- Bars -->
      <g v-for="(bar, idx) in bars" :key="idx">
        <rect
          :x="bar.x"
          :y="bar.y"
          :width="barWidth"
          :height="bar.height"
          fill="#0d6efd"
        />
        <text
          :x="bar.x + barWidth / 2"
          :y="height - padding + 15"
          text-anchor="middle"
          font-size="10"
          fill="#666"
        >
          {{ bar.hour }}
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
  width: { type: Number, default: 600 },
  height: { type: Number, default: 200 },
})

const padding = 40
const chartWidth = computed(() => props.width - padding * 2)
const chartHeight = computed(() => props.height - padding * 2)
const barWidth = computed(() => Math.max(10, chartWidth.value / 24 - 2))

const maxValue = computed(() => {
  return Math.max(...(props.data?.map(item => item.count) || [1]))
})

const bars = computed(() => {
  if (!props.data || !props.data.length) return []

  // Create 24-hour array
  const hourData = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    count: 0,
  }))

  // Fill with actual data
  props.data.forEach(item => {
    const hour = parseInt(item.hour)
    if (hour >= 0 && hour < 24) {
      hourData[hour].count = item.count
    }
  })

  return hourData.map((item, idx) => {
    const barHeight = (item.count / maxValue.value) * chartHeight.value
    return {
      hour: item.hour,
      count: item.count,
      x: padding + idx * (chartWidth.value / 24),
      y: padding + chartHeight.value - barHeight,
      height: barHeight,
    }
  })
})
</script>

<style scoped>
.hourly-chart {
  width: 100%;
}
</style>
