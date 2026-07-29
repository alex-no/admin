const COLORS = ['#0d6efd', '#198754', '#ffc107', '#dc3545', '#6c757d', '#0dcaf0', '#6f42c1', '#fd7e14']

interface PieChartProps {
  data?: any[]
  labelKey: string
  valueKey: string
  size?: number
}

export default function PieChart({ data = [], labelKey, valueKey, size = 250 }: PieChartProps) {
  const total = data.reduce((sum, item) => sum + (item[valueKey] || 0), 0)

  let currentAngle = -Math.PI / 2
  const radius = size / 2 - 10

  const slices = total === 0 ? [] : data.map((item, idx) => {
    const value = item[valueKey] || 0
    const angle = (value / total) * 2 * Math.PI
    const startX = Math.cos(currentAngle) * radius
    const startY = Math.sin(currentAngle) * radius
    const endX = Math.cos(currentAngle + angle) * radius
    const endY = Math.sin(currentAngle + angle) * radius
    const largeArc = angle > Math.PI ? 1 : 0

    const path = [
      'M 0 0',
      `L ${startX} ${startY}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`,
      'Z',
    ].join(' ')

    currentAngle += angle

    return {
      label: item[labelKey] || 'Unknown',
      value,
      color: COLORS[idx % COLORS.length],
      path,
    }
  })

  return (
    <div className="d-flex flex-column align-items-center">
      {slices.length > 0 && (
        <svg width={size} height={size}>
          <g transform={`translate(${size / 2}, ${size / 2})`}>
            {slices.map((slice, idx) => (
              <path key={idx} d={slice.path} fill={slice.color} stroke="#fff" strokeWidth={2} />
            ))}
          </g>
        </svg>
      )}

      <div className="mt-2 d-flex flex-column" style={{ gap: '5px' }}>
        {slices.map((slice, idx) => (
          <div key={idx} className="d-flex align-items-center" style={{ gap: '8px' }}>
            <span
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '2px',
                backgroundColor: slice.color,
              }}
            />
            <span className="small">{slice.label}: <strong>{slice.value}</strong></span>
          </div>
        ))}
      </div>

      {slices.length === 0 && <div className="text-center text-muted py-3">Немає даних</div>}
    </div>
  )
}
