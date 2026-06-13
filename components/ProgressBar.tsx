export default function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0
  const complete = pct === 100 && total > 0

  return (
    <div style={{ marginTop: 14 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 14, color: 'var(--ink-700)', fontWeight: 500 }}>
          {complete ? '🎉 All done!' : `${done} of ${total} done`}
        </span>
        <span
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: complete ? 'var(--green-700)' : 'var(--ink-900)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {pct}%
        </span>
      </div>
      <div className="track">
        <div className={`track-fill${complete ? ' full' : ''}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
