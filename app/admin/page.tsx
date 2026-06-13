'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUserId } from '@/lib/auth'

type User = { id: string; name: string; role: string; phone: string }
type Task = {
  id: string; category: string; title: string; status: string
  priority: string; assigned_to: string | null; due_date: string | null
}
type BotLog = {
  id: string; from_phone: string; raw_text: string
  parsed_json: Record<string, unknown> | null; result: string; created_at: string
}

const CATEGORIES = [
  'Venue', 'Catering', 'Decor', 'Cards', 'Attire',
  'Photography', 'Rituals', 'Sangeet', 'Logistics', 'Gifts',
]

type Tab = 'tasks' | 'add' | 'users' | 'bot'

function avatarColor(name: string): [string, string] {
  const colors: [string, string][] = [
    ['#dcfce7', '#15803d'], ['#fef9c3', '#a16207'], ['#ffe4e6', '#9f1239'],
    ['#dbeafe', '#1e40af'], ['#f3e8ff', '#6b21a8'], ['#ffedd5', '#9a3412'],
  ]
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return colors[h % colors.length]
}

export default function Admin() {
  const supabase = createClient()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [botLogs, setBotLogs] = useState<BotLog[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('tasks')

  const [newTask, setNewTask] = useState({
    category: 'Venue', title: '', description: '', priority: 'normal',
    assigned_to: '', due_date: '',
  })
  const [adding, setAdding] = useState(false)

  async function load() {
    const [{ data: u }, { data: t }, { data: l }] = await Promise.all([
      supabase.from('users').select('*').order('name'),
      supabase.from('tasks').select('*').order('category'),
      supabase.from('inbound_messages').select('*').order('created_at', { ascending: false }).limit(50),
    ])
    setUsers(u ?? [])
    setTasks(t ?? [])
    setBotLogs((l as BotLog[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    if (!getCurrentUserId()) { router.replace('/login'); return }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  async function addTask() {
    if (!newTask.title.trim()) return
    setAdding(true)
    await supabase.from('tasks').insert({
      category: newTask.category,
      title: newTask.title.trim(),
      description: newTask.description.trim() || null,
      priority: newTask.priority,
      assigned_to: newTask.assigned_to || null,
      due_date: newTask.due_date || null,
      created_by: getCurrentUserId(),
    })
    setNewTask({ category: 'Venue', title: '', description: '', priority: 'normal', assigned_to: '', due_date: '' })
    setAdding(false)
    showToast('Task added ✅')
    load()
    setTab('tasks')
  }

  async function assignTask(taskId: string, userId: string) {
    await supabase.from('tasks').update({ assigned_to: userId || null }).eq('id', taskId)
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, assigned_to: userId || null } : t))
    showToast('Assigned ✓')
  }

  async function setPriority(taskId: string, p: string) {
    await supabase.from('tasks').update({ priority: p }).eq('id', taskId)
    setTasks((prev) => prev.map((x) => x.id === taskId ? { ...x, priority: p } : x))
  }

  async function setDueDate(taskId: string, date: string) {
    await supabase.from('tasks').update({ due_date: date || null }).eq('id', taskId)
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, due_date: date || null } : t))
  }

  async function deleteTask(taskId: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    await supabase.from('tasks').delete().eq('id', taskId)
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
    showToast('Task deleted')
  }

  async function generateLinks() {
    const { data } = await supabase.from('users').select('name, login_token')
    if (!data) return
    const origin = window.location.origin
    const text = data.map((u) => `${u.name}: ${origin}/login?t=${u.login_token}`).join('\n')
    await navigator.clipboard.writeText(text)
    showToast('Login links copied!')
  }

  const ctrl: React.CSSProperties = {
    fontSize: 13, padding: '7px 10px', borderRadius: 'var(--r-sm)',
    border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink-900)',
    appearance: 'none',
  }

  if (loading) {
    return (
      <main className="shell">
        <div className="skel" style={{ height: 28, width: 100, marginBottom: 20 }} />
        <div className="skel" style={{ height: 72, marginBottom: 20 }} />
        {[0, 1, 2].map((i) => <div key={i} className="skel" style={{ height: 80, marginBottom: 10 }} />)}
      </main>
    )
  }

  const stats = [
    { label: 'Total', val: tasks.length, color: 'var(--info)' },
    { label: 'Done', val: tasks.filter((t) => t.status === 'done').length, color: 'var(--green-700)' },
    { label: 'High', val: tasks.filter((t) => t.priority === 'high' && t.status !== 'done').length, color: 'var(--rose-700)' },
    { label: 'Unassigned', val: tasks.filter((t) => !t.assigned_to && t.status !== 'done').length, color: 'var(--warn)' },
  ]

  const TABS: { key: Tab; label: string }[] = [
    { key: 'tasks', label: 'Tasks' },
    { key: 'add', label: '+ Add' },
    { key: 'users', label: 'Members' },
    { key: 'bot', label: `Bot${botLogs.length ? ` (${botLogs.length})` : ''}` },
  ]

  return (
    <main className="shell">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 18 }}>
        <Link
          href="/"
          aria-label="Back"
          style={{
            fontSize: 20, textDecoration: 'none', color: 'var(--ink-700)',
            width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '50%',
          }}
        >
          ←
        </Link>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>Admin</h1>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {stats.map((s) => (
          <div key={s.label} className="card" style={{ flex: 1, padding: '14px 6px', textAlign: 'center' }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {s.val}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 5, fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex', gap: 4, padding: 4, marginBottom: 20,
          background: '#eceeec', borderRadius: 'var(--r-md)',
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, padding: '9px 0', fontSize: 13, fontWeight: 700,
              border: 'none', borderRadius: 'var(--r-sm)',
              background: tab === t.key ? 'var(--surface)' : 'transparent',
              color: tab === t.key ? 'var(--green-800)' : 'var(--ink-500)',
              boxShadow: tab === t.key ? 'var(--shadow-xs)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ---- Tasks ---- */}
      {tab === 'tasks' && (
        <div>
          {tasks.map((t) => (
            <div
              key={t.id}
              className="card"
              style={{
                padding: '12px 14px', marginBottom: 10,
                background: t.status === 'done' ? 'var(--green-50)' : 'var(--surface)',
                borderColor: t.status === 'done' ? 'var(--green-100)' : 'var(--line)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
                <span className="chip chip-neutral" style={{ marginTop: 2 }}>{t.category}</span>
                <span
                  style={{
                    flex: 1, fontSize: 15, fontWeight: 600, lineHeight: 1.35,
                    textDecoration: t.status === 'done' ? 'line-through' : 'none',
                    color: t.status === 'done' ? 'var(--ink-500)' : 'var(--ink-900)',
                  }}
                >
                  {t.title}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <select value={t.assigned_to ?? ''} onChange={(e) => assignTask(t.id, e.target.value)} style={ctrl}>
                  <option value="">Unassigned</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>

                <select
                  value={t.priority}
                  onChange={(e) => setPriority(t.id, e.target.value)}
                  className={`chip chip-${t.priority === 'normal' ? 'normal' : t.priority}`}
                  style={{
                    fontSize: 12, padding: '6px 10px', borderRadius: 'var(--r-sm)',
                    border: 'none', fontWeight: 700, textTransform: 'none', letterSpacing: 0,
                    appearance: 'none',
                  }}
                >
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>

                <input type="date" value={t.due_date ?? ''} onChange={(e) => setDueDate(t.id, e.target.value)} style={ctrl} />

                <button
                  onClick={() => deleteTask(t.id, t.title)}
                  style={{
                    marginLeft: 'auto', fontSize: 13, fontWeight: 600, color: 'var(--danger)',
                    background: 'var(--danger-soft)', border: '1px solid #fecaca',
                    borderRadius: 'var(--r-sm)', padding: '6px 12px',
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---- Add ---- */}
      {tab === 'add' && (
        <div className="card" style={{ padding: 18 }}>
          <div style={{ marginBottom: 14 }}>
            <label className="label">Category</label>
            <select value={newTask.category} onChange={(e) => setNewTask({ ...newTask, category: e.target.value })} className="field">
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="label">Task title *</label>
            <input
              type="text"
              placeholder="e.g. Confirm venue booking"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              className="field"
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="label">Notes (optional)</label>
            <textarea
              placeholder="Any details about this task…"
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              rows={2}
              className="field"
            />
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <label className="label">Priority</label>
              <select value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })} className="field">
                <option value="high">🔴 High</option>
                <option value="normal">🔵 Normal</option>
                <option value="low">⚪ Low</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Due date</label>
              <input type="date" value={newTask.due_date} onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })} className="field" />
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label className="label">Assign to (optional)</label>
            <select value={newTask.assigned_to} onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })} className="field">
              <option value="">— Unassigned —</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>

          <button onClick={addTask} disabled={adding || !newTask.title.trim()} className="btn btn-primary btn-block btn-lg">
            {adding ? 'Adding…' : 'Add Task'}
          </button>
        </div>
      )}

      {/* ---- Members ---- */}
      {tab === 'users' && (
        <div>
          <button onClick={generateLinks} className="btn btn-outline btn-block" style={{ marginBottom: 18 }}>
            📋 Copy all login links
          </button>
          {users.map((u) => {
            const open = tasks.filter((t) => t.assigned_to === u.id && t.status !== 'done').length
            const done = tasks.filter((t) => t.assigned_to === u.id && t.status === 'done').length
            const [bg, fg] = avatarColor(u.name)
            return (
              <div
                key={u.id}
                className="card"
                style={{ padding: '14px 16px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}
              >
                <span
                  style={{
                    width: 44, height: 44, borderRadius: '50%', background: bg, color: fg,
                    fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexShrink: 0,
                  }}
                >
                  {u.name.slice(0, 2).toUpperCase()}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink-900)' }}>{u.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--ink-500)', marginTop: 2 }}>
                    {u.phone} · <span style={{ textTransform: 'capitalize' }}>{u.role}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: open > 0 ? 'var(--warn)' : 'var(--green-700)' }}>
                    {open} open
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-400)', marginTop: 2 }}>{done} done</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ---- Bot Log ---- */}
      {tab === 'bot' && (
        <div>
          {botLogs.length === 0 ? (
            <div style={{ textAlign: 'center', marginTop: 40 }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>🤖</div>
              <p style={{ color: 'var(--ink-500)', fontSize: 15 }}>No messages received yet.</p>
              <p style={{ color: 'var(--ink-400)', fontSize: 13, marginTop: 6 }}>
                Test with ngrok + Meta sandbox.
              </p>
            </div>
          ) : (
            botLogs.map((l) => {
              const colors: Record<string, string> = {
                parsed: 'chip-done',
                'done-by-number': 'chip-normal',
              }
              const cls = colors[l.result] ?? 'chip-low'
              return (
                <div key={l.id} className="card" style={{ padding: '12px 14px', marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
                    <span style={{ fontWeight: 700, color: 'var(--ink-900)', fontSize: 14 }}>{l.from_phone}</span>
                    <span style={{ color: 'var(--ink-400)', fontSize: 12, flexShrink: 0 }}>
                      {new Date(l.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ marginBottom: 8, color: 'var(--ink-900)', fontSize: 14 }}>
                    <span style={{ color: 'var(--ink-500)' }}>“</span>{l.raw_text}<span style={{ color: 'var(--ink-500)' }}>”</span>
                  </div>
                  <span className={`chip ${cls}`} style={{ textTransform: 'none', letterSpacing: 0 }}>{l.result}</span>
                  {l.parsed_json && (
                    <details style={{ marginTop: 10 }}>
                      <summary style={{ cursor: 'pointer', color: 'var(--ink-700)', fontSize: 13, fontWeight: 600 }}>
                        Parsed JSON
                      </summary>
                      <pre
                        style={{
                          fontSize: 12, background: 'var(--surface-2)', color: 'var(--ink-900)',
                          padding: 10, borderRadius: 'var(--r-sm)', marginTop: 8, overflow: 'auto',
                          border: '1px solid var(--line)',
                        }}
                      >
                        {JSON.stringify(l.parsed_json, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </main>
  )
}
