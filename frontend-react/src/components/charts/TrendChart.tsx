export interface TrendDataset {
  label: string
  data: number[]
  color: string
}

interface TrendChartProps {
  labels: string[]
  datasets: TrendDataset[]
}

const WIDTH = 900
const HEIGHT = 350
const PADDING = 50

function formatDate(dt: string): string {
  if (!dt) return ''
  const parts = dt.split('-')
  return parts.length === 3 ? `${parts[2]}.${parts[1]}` : dt
}

export default function TrendChart({ labels, datasets }: TrendChartProps) {
  const chartWidth = WIDTH - PADDING * 2
  const chartHeight = HEIGHT - PADDING * 2 - 20

  const maxValue = Math.max(
    ...datasets.flatMap(ds => ds.data),
    0
  ) || 10

  // Одна точка на графіку — ділити на (labels.length - 1) не можна
  const stepX = labels.length > 1 ? chartWidth / (labels.length - 1) : 0

  const pointX = (i: number) => PADDING + stepX * i
  const pointY = (val: number) => PADDING + chartHeight - (val / maxValue) * chartHeight

  return (
    <div style={{ width: '100%' }}>
      <svg width={WIDTH} height={HEIGHT} style={{ display: 'block' }}>
        {/* Сітка */}
        {[1, 2, 3, 4, 5].map(i => (
          <line
            key={`h${i}`}
            x1={PADDING}
            y1={PADDING + (chartHeight / 4) * (i - 1)}
            x2={WIDTH - PADDING}
            y2={PADDING + (chartHeight / 4) * (i - 1)}
            stroke="#e0e0e0"
            strokeWidth={1}
          />
        ))}

        {/* Підписи осі Y */}
        {[1, 2, 3, 4, 5].map(i => (
          <text
            key={`y${i}`}
            x={PADDING - 10}
            y={PADDING + (chartHeight / 4) * (i - 1) + 5}
            textAnchor="end"
            fontSize="12"
            fill="#666"
          >
            {Math.round(maxValue - (maxValue / 4) * (i - 1))}
          </text>
        ))}

        {/* Лінії */}
        {datasets.map((dataset, idx) => (
          <g key={idx}>
            <polyline
              points={dataset.data.map((val, i) => `${pointX(i)},${pointY(val)}`).join(' ')}
              fill="none"
              stroke={dataset.color}
              strokeWidth={2}
            />
            {dataset.data.map((val, i) => (
              <circle key={i} cx={pointX(i)} cy={pointY(val)} r={4} fill={dataset.color} />
            ))}
          </g>
        ))}

        {/* Підписи осі X */}
        {labels.map((label, i) => (
          <text
            key={`x${i}`}
            x={pointX(i)}
            y={HEIGHT - PADDING + 20}
            textAnchor="middle"
            fontSize="11"
            fill="#666"
          >
            {formatDate(label)}
          </text>
        ))}
      </svg>

      <div className="mt-2 d-flex gap-3 justify-content-center flex-wrap">
        {datasets.map((dataset, idx) => (
          <div key={idx} className="d-flex align-items-center gap-1">
            <div style={{ width: '16px', height: '16px', backgroundColor: dataset.color, borderRadius: '2px' }} />
            <span className="small">
              {dataset.label} ({dataset.data.reduce((s, v) => s + v, 0)})
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
