'use client'
import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUserId } from '@/lib/auth'

type Task = {
  id: string
  category: string
  title: string
  description: string | null
  status: string
  priority: string
  due_date: string | null
  assigned_to: string | null
}

type Comment = {
  id: string
  text: string | null
  created_at: string
  users: { name: string } | null
}

type User = { id: string; name: string }

const STATUS_CYCLE: Record<string, string> = { todo: 'doing', doing: 'done', done: 'todo' }
const STATUS_LABEL: Record<string, string> = { todo: 'To Do', doing: 'In Progress', done: 'Done' }
const STATUS_COLOR: Record<string, string> = {
  todo: 'var(--info)',
  doing: 'var(--warn)',
  done: 'var(--green-700)',
}

function avatarColor(name: string): [string, string] {
  const colors: [string, string][] = [
    ['#dcfce7', '#15803d'], ['#fef9c3', '#a16207'], ['#ffe4e6', '#9f1239'],
    ['#dbeafe', '#1e40af'], ['#f3e8ff', '#6b21a8'], ['#ffedd5', '#9a3412'],
  ]
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return colors[h % colors.length]
}

export default function TaskDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const supabase = createClient()
  const router = useRouter()
  const [task, setTask] = useState<Task | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [newComment, setNewComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingDesc, setEditingDesc] = useState(false)
  const [descDraft, setDescDraft] = useState('')

  async function load() {
    const [{ data: t }, { data: c }, { data: u }] = await Promise.all([
      supabase.from('tasks').select('*').eq('id', id).single(),
      supabase
        .from('comments')
        .select('id, text, created_at, users:user_id(name)')
        .eq('task_id', id)
        .order('created_at'),
      supabase.from('users').select('id, name').order('name'),
    ])
    setTask(t)
    setComments((c as unknown as Comment[]) ?? [])
    setUsers(u ?? [])
    setLoading(false)
  }

  useEffect(() => {
    if (!getCurrentUserId()) { router.replace('/login'); return }
    load()
    const channel = supabase
      .channel(`task-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `task_id=eq.${id}` }, load)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks', filter: `id=eq.${id}` }, load)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  function flash(msg: string) {
    setSaved(msg)
    setTimeout(() => setSaved(null), 2000)
  }

  async function cycleStatus() {
    if (!task) return
    const next = STATUS_CYCLE[task.status]
    setTask({ ...task, status: next })
    await supabase.from('tasks').update({ status: next }).eq('id', id)
    flash('Status updated ✓')
  }

  async function assignTo(userId: string) {
    if (!task) return
    const val = userId === '' ? null : userId
    setTask({ ...task, assigned_to: val })
    await supabase.from('tasks').update({ assigned_to: val }).eq('id', id)
    flash('Assigned ✓')
  }

  async function setDueDate(date: string) {
    if (!task) return
    const val = date || null
    setTask({ ...task, due_date: val })
    await supabase.from('tasks').update({ due_date: val }).eq('id', id)
    flash('Due date saved ✓')
  }

  async function saveDescription() {
    if (!task) return
    const val = descDraft.trim() || null
    setTask({ ...task, description: val })
    await supabase.from('tasks').update({ description: val }).eq('id', id)
    setEditingDesc(false)
    flash('Notes saved ✓')
  }

  async function addComment() {
    const text = newComment.trim()
    if (!text) return
    setSaving(true)
    await supabase.from('comments').insert({
      task_id: id,
      user_id: getCurrentUserId(),
      text,
    })
    setNewComment('')
    setSaving(false)
  }

  if (loading) {
    return (
      <main className="shell">
        <div className="skel" style={{ height: 24, width: 120, marginBottom: 20 }} />
        <div className="skel" style={{ height: 32, marginBottom: 20 }} />
        <div className="skel" style={{ height: 56, marginBottom: 24 }} />
        <div className="skel" style={{ height: 48, marginBottom: 16 }} />
        <div className="skel" style={{ height: 48 }} />
      </main>
    )
  }
  if (!task) return <p style={{ padding: 24 }}>Task not found.</p>

  const assignedUser = users.find((u) => u.id === task.assigned_to)

  return (
    <main className="shell">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
        <button
          onClick={() => router.back()}
          aria-label="Back"
          style={{
            fontSize: 20, background: 'none', border: 'none', color: 'var(--ink-700)',
            width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '50%',
          }}
        >
          ←
        </button>
        <span className="chip chip-neutral">{task.category}</span>
        {saved && (
          <span
            className="fade-up"
            style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--green-700)', fontWeight: 700 }}
          >
            {saved}
          </span>
        )}
      </div>

      {/* Title */}
      <h1 style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.3, marginBottom: 16, letterSpacing: -0.3 }}>
        {task.title}
      </h1>

      {/* Status + priority */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <span
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 'var(--r-pill)',
            background: '#fff', border: `1.5px solid ${STATUS_COLOR[task.status]}`,
            color: STATUS_COLOR[task.status], fontWeight: 700, fontSize: 13,
          }}
        >
          ● {STATUS_LABEL[task.status]}
        </span>
        <span
          className={`chip chip-${task.priority === 'normal' ? 'normal' : task.priority}`}
          style={{ padding: '6px 12px', fontSize: 12 }}
        >
          {task.priority} priority
        </span>
      </div>

      {/* Primary action */}
      {task.status !== 'done' ? (
        <button
          onClick={cycleStatus}
          className="btn btn-primary btn-block btn-lg"
          style={{
            background: task.status === 'todo' ? 'var(--info)' : 'var(--primary)',
            boxShadow: task.status === 'todo'
              ? '0 4px 14px rgba(37, 99, 235, 0.3)'
              : 'var(--shadow-primary)',
            marginBottom: 24,
          }}
        >
          {task.status === 'todo' ? '▶  Start this task' : '✓  Mark as Done'}
        </button>
      ) : (
        <button
          onClick={cycleStatus}
          className="btn btn-outline btn-block btn-lg"
          style={{ color: 'var(--ink-500)', borderColor: 'var(--line-strong)', marginBottom: 24 }}
        >
          ↩  Reopen task
        </button>
      )}

      {/* Details card */}
      <div className="card" style={{ padding: 16, marginBottom: 24 }}>
        <div style={{ marginBottom: 18 }}>
          <label className="label">Assigned to</label>
          <select
            value={task.assigned_to ?? ''}
            onChange={(e) => assignTo(e.target.value)}
            className="field"
          >
            <option value="">— Unassigned —</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          {assignedUser && (
            (() => {
              const [bg, fg] = avatarColor(assignedUser.name)
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                  <span
                    style={{
                      width: 26, height: 26, borderRadius: '50%', background: bg, color: fg,
                      fontWeight: 800, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {assignedUser.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--ink-500)' }}>{assignedUser.name}</span>
                </div>
              )
            })()
          )}
        </div>

        <hr className="divider" style={{ margin: '0 0 18px' }} />

        <div>
          <label className="label">Due date</label>
          <input
            type="date"
            value={task.due_date ?? ''}
            onChange={(e) => setDueDate(e.target.value)}
            className="field"
          />
        </div>
      </div>

      {/* Notes */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-900)' }}>Notes</h2>
          {!editingDesc && (
            <button
              onClick={() => { setDescDraft(task.description ?? ''); setEditingDesc(true) }}
              style={{ fontSize: 13, fontWeight: 600, color: 'var(--info)', background: 'none', border: 'none' }}
            >
              {task.description ? 'Edit' : '+ Add notes'}
            </button>
          )}
        </div>
        {editingDesc ? (
          <>
            <textarea
              value={descDraft}
              onChange={(e) => setDescDraft(e.target.value)}
              rows={3}
              placeholder="Add notes about this task…"
              className="field"
              style={{ marginBottom: 10 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={saveDescription} className="btn btn-primary" style={{ flex: 1 }}>
                Save
              </button>
              <button
                onClick={() => setEditingDesc(false)}
                className="btn btn-outline"
                style={{ color: 'var(--ink-700)', borderColor: 'var(--line-strong)' }}
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <div
            style={{
              padding: '14px',
              borderRadius: 'var(--r-md)',
              background: task.description ? 'var(--surface)' : 'var(--surface-2)',
              border: '1px solid var(--line)',
              fontSize: 15,
              color: task.description ? 'var(--ink-700)' : 'var(--ink-400)',
              lineHeight: 1.6,
              minHeight: 48,
              whiteSpace: 'pre-wrap',
            }}
          >
            {task.description ?? 'No notes yet.'}
          </div>
        )}
      </div>

      {/* Activity */}
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>
          Activity {comments.length > 0 && `(${comments.length})`}
        </h2>

        {comments.length === 0 && (
          <p style={{ color: 'var(--ink-400)', fontSize: 14, marginBottom: 16 }}>No comments yet.</p>
        )}

        {comments.map((c) => {
          const name = c.users?.name ?? 'Someone'
          const [bg, fg] = avatarColor(name)
          return (
            <div key={c.id} style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <span
                style={{
                  width: 32, height: 32, borderRadius: '50%', background: bg, color: fg,
                  fontWeight: 800, fontSize: 12, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', flexShrink: 0, marginTop: 2,
                }}
              >
                {name.slice(0, 2).toUpperCase()}
              </span>
              <div
                className="card"
                style={{ flex: 1, padding: '10px 13px', boxShadow: 'none' }}
              >
                <div style={{ fontSize: 12.5, color: 'var(--ink-500)', marginBottom: 3 }}>
                  <strong style={{ color: 'var(--ink-700)' }}>{name}</strong> ·{' '}
                  {new Date(c.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </div>
                <div style={{ fontSize: 15, color: 'var(--ink-900)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {c.text}
                </div>
              </div>
            </div>
          )
        })}

        <div style={{ marginTop: 16 }}>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a note or update…"
            rows={3}
            className="field"
            style={{ marginBottom: 10 }}
          />
          <button
            onClick={addComment}
            disabled={saving || !newComment.trim()}
            className="btn btn-primary btn-block"
          >
            {saving ? 'Saving…' : 'Add Note'}
          </button>
        </div>
      </div>
    </main>
  )
}
