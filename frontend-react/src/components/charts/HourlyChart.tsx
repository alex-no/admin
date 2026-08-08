import { useTranslation } from 'react-i18next'

function getCSSColor(varName: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || '#000'
}

interface HourlyChartProps {
  data?: Array<{ hour: number | string; count: number }>
  width?: number
  height?: number
}

const PADDING = 40

export default function HourlyChart({ data = [], width = 600, height = 200 }: HourlyChartProps) {
  const { t } = useTranslation()
  if (!data.length) {
    return <div className="text-center text-muted py-3">{t('common.noData')}</div>
  }

  const chartWidth = width - PADDING * 2
  const chartHeight = height - PADDING * 2
  const barWidth = Math.max(10, chartWidth / 24 - 2)
  const maxValue = Math.max(...data.map(item => item.count), 1)

  // Повна доба, навіть якщо в даних є не всі години
  const hourData = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }))
  for (const item of data) {
    const hour = parseInt(String(item.hour), 10)
    if (hour >= 0 && hour < 24) {
      hourData[hour].count = item.count
    }
  }

  const bars = hourData.map((item, idx) => {
    const barH = (item.count / maxValue) * chartHeight
    return {
      hour: item.hour,
      x: PADDING + idx * (chartWidth / 24),
      y: PADDING + chartHeight - barH,
      height: barH,
    }
  })

  return (
    <div style={{ width: '100%' }}>
      <svg width={width} height={height}>
        {[1, 2, 3, 4, 5].map(i => (
          <text
            key={`y${i}`}
            x={PADDING - 10}
            y={PADDING + (chartHeight / 4) * (i - 1) + 5}
            textAnchor="end"
            fontSize="11"
            fill={getCSSColor("--bs-secondary-color")}
          >
            {Math.round(maxValue - (maxValue / 4) * (i - 1))}
          </text>
        ))}

        {bars.map((bar, idx) => (
          <g key={idx}>
            <rect x={bar.x} y={bar.y} width={barWidth} height={bar.height} fill={getCSSColor("--bs-primary")} />
            <text
              x={bar.x + barWidth / 2}
              y={height - PADDING + 15}
              textAnchor="middle"
              fontSize="10"
              fill={getCSSColor("--bs-secondary-color")}
            >
              {bar.hour}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
