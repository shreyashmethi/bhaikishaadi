'use client'
import Link from 'next/link'

type Props = {
  task: {
    id: string
    title: string
    status: string
    due_date: string | null
    priority: string
    assigned_to: string | null
  }
  assignedName?: string
  onDone: (id: string) => void
}

function formatDue(d: string): { label: string; overdue: boolean; soon: boolean } {
  const due = new Date(d + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Math.round((due.getTime() - today.getTime()) / 86400000)
  const nice = due.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  if (days < 0) return { label: `${nice} · overdue`, overdue: true, soon: false }
  if (days === 0) return { label: 'Due today', overdue: false, soon: true }
  if (days === 1) return { label: 'Due tomorrow', overdue: false, soon: true }
  if (days <= 7) return { label: `${nice} · ${days}d`, overdue: false, soon: true }
  return { label: nice, overdue: false, soon: false }
}

export default function TaskCard({ task, assignedName, onDone }: Props) {
  const isDone = task.status === 'done'
  const isDoing = task.status === 'doing'
  const due = task.due_date && !isDone ? formatDue(task.due_date) : null

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        alignItems: 'stretch',
        gap: 0,
        marginBottom: 10,
        overflow: 'hidden',
        background: isDone ? 'var(--green-50)' : 'var(--surface)',
        borderColor: isDone ? 'var(--green-100)' : isDoing ? '#fde9c8' : 'var(--line)',
        opacity: isDone ? 0.92 : 1,
      }}
    >
      {/* Status accent rail */}
      <div
        style={{
          width: 4,
          flexShrink: 0,
          background: isDone
            ? 'var(--green-500)'
            : isDoing
            ? 'var(--gold-500)'
            : task.priority === 'high'
            ? 'var(--rose-600)'
            : 'transparent',
        }}
      />

      {/* Tap-to-open body */}
      <Link
        href={`/tasks/${task.id}`}
        style={{
          flex: 1,
          textDecoration: 'none',
          color: 'inherit',
          minWidth: 0,
          padding: '14px 6px 14px 14px',
        }}
      >
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            textDecoration: isDone ? 'line-through' : 'none',
            color: isDone ? 'var(--ink-500)' : 'var(--ink-900)',
            marginBottom: 7,
            lineHeight: 1.35,
          }}
        >
          {task.title}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {!isDone && task.priority === 'high' && (
            <span className="chip chip-high">High</span>
          )}
          {isDoing && (
            <span style={{ fontSize: 12, color: 'var(--warn)', fontWeight: 700 }}>
              ● In progress
            </span>
          )}
          {assignedName && (
            <span style={{ fontSize: 12.5, color: 'var(--ink-500)', fontWeight: 500 }}>
              👤 {assignedName}
            </span>
          )}
          {due && (
            <span
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: due.overdue ? 'var(--danger)' : due.soon ? 'var(--warn)' : 'var(--ink-500)',
              }}
            >
              📅 {due.label}
            </span>
          )}
        </div>
      </Link>

      {/* Done action — large tap target */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px 0 4px', flexShrink: 0 }}>
        {!isDone ? (
          <button
            onClick={(e) => {
              e.preventDefault()
              onDone(task.id)
            }}
            aria-label={`Mark "${task.title}" done`}
            style={{
              minWidth: 52,
              minHeight: 52,
              borderRadius: '50%',
              border: '2px solid var(--green-600)',
              background: 'var(--surface)',
              color: 'var(--green-700)',
              fontSize: 22,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.background = 'var(--green-600)'
              e.currentTarget.style.color = '#fff'
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.background = 'var(--surface)'
              e.currentTarget.style.color = 'var(--green-700)'
            }}
          >
            ✓
          </button>
        ) : (
          <div
            style={{
              minWidth: 52,
              minHeight: 52,
              borderRadius: '50%',
              background: 'var(--green-600)',
              color: '#fff',
              fontSize: 22,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✓
          </div>
        )}
      </div>
    </div>
  )
}
