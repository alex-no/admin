interface BarChartProps {
  data?: any[]
  labelKey: string
  valueKey: string
  color?: string
  width?: number
}

const PADDING = 100
const BAR_HEIGHT = 30

export default function BarChart({
  data = [],
  labelKey,
  valueKey,
  color = '#0d6efd',
  width = 400,
}: BarChartProps) {
  if (!data.length) {
    return <div className="text-center text-muted py-3">Немає даних</div>
  }

  const height = data.length * BAR_HEIGHT + PADDING
  const maxValue = Math.max(...data.map(item => item[valueKey] || 0), 1)
  const maxBarWidth = width - PADDING - 80

  const items = data.map(item => ({
    label: item[labelKey] || 'Unknown',
    value: item[valueKey] || 0,
    barWidth: ((item[valueKey] || 0) / maxValue) * maxBarWidth,
  }))

  return (
    <div style={{ width: '100%' }}>
      <svg width={width} height={height}>
        {items.map((item, idx) => (
          <g key={idx}>
            <rect
              x={PADDING}
              y={PADDING + idx * BAR_HEIGHT}
              width={item.barWidth}
              height={BAR_HEIGHT - 5}
              fill={color}
            />
            <text
              x={PADDING - 5}
              y={PADDING + idx * BAR_HEIGHT + BAR_HEIGHT / 2 + 4}
              textAnchor="end"
              fontSize="12"
              fill="#666"
            >
              {item.label}
            </text>
            <text
              x={PADDING + item.barWidth + 5}
              y={PADDING + idx * BAR_HEIGHT + BAR_HEIGHT / 2 + 4}
              fontSize="12"
              fill="#333"
              fontWeight="bold"
            >
              {item.value}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
