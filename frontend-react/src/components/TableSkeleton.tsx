interface Column {
  width?: number
  align?: 'left' | 'right'
  skeletonWidth?: string
}

interface TableSkeletonProps {
  rows?: number
  columns: Column[]
  hasCheckbox?: boolean
}

export default function TableSkeleton({
  rows = 10,
  columns,
  hasCheckbox = false,
}: TableSkeletonProps) {
  return (
    <tbody>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r}>
          {hasCheckbox && (
            <td style={{ width: '36px' }}>
              <span className="sk" style={{ width: '1rem' }} />
            </td>
          )}
          {columns.map((col, i) => (
            <td
              key={i}
              style={col.width ? { width: `${col.width}px` } : undefined}
              className={col.align === 'right' ? 'text-end' : ''}
            >
              <span className="sk" style={{ width: col.skeletonWidth ?? '80%' }} />
            </td>
          ))}
        </tr>
      ))}
      <style>{`
        .sk {
          display: inline-block;
          height: 0.85rem;
          border-radius: 0.2rem;
          background: #e9ecef;
          animation: sk-pulse 1.2s ease-in-out infinite;
        }
        @keyframes sk-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        @media (prefers-reduced-motion: reduce) {
          .sk { animation: none; }
        }
      `}</style>
    </tbody>
  )
}
