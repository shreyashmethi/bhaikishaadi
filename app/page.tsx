'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUserId, clearCurrentUser } from '@/lib/auth'
import TaskCard from '@/components/TaskCard'
import ProgressBar from '@/components/ProgressBar'

type Task = {
  id: string
  category: string
  title: string
  status: string
  assigned_to: string | null
  due_date: string | null
  priority: string
}

type User = { id: string; name: string }

const CATEGORY_EMOJI: Record<string, string> = {
  Venue: '🏛', Catering: '🍲', Decor: '🎀', Cards: '💌', Attire: '👗',
  Photography: '📸', Rituals: '🪔', Sangeet: '💃', Logistics: '🚗', Gifts: '🎁',
}

type Filter = 'all' | 'todo' | 'high'

export default function Dashboard() {
  const supabase = createClient()
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  async function load() {
    const [{ data: t }, { data: u }] = await Promise.all([
      supabase.from('tasks').select('*').order('category'),
      supabase.from('users').select('id, name'),
    ])
    setTasks(t ?? [])
    setUsers(u ?? [])
    setLoading(false)
  }

  useEffect(() => {
    const uid = getCurrentUserId()
    if (!uid) { router.replace('/login'); return }
    load()
    const channel = supabase
      .channel('tasks-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, load)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const uid = getCurrentUserId()
    if (uid && users.length > 0) {
      setCurrentUser(users.find((u) => u.id === uid) ?? null)
    }
  }, [users])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  async function markDone(id: string) {
    const task = tasks.find((t) => t.id === id)
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'done' } : t)))
    await supabase.from('tasks').update({ status: 'done' }).eq('id', id)
    showToast(`✅ "${task?.title}" marked done`)
  }

  function toggleCollapse(cat: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  function logout() {
    clearCurrentUser()
    router.replace('/login')
  }

  function shareDigest() {
    const pending = tasks.filter((t) => t.status !== 'done')
    const high = pending.filter((t) => t.priority === 'high')
    const lines = [
      `💍 Shaadi Tracker — ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
      `✅ ${done}/${tasks.length} tasks done`,
      '',
      ...(high.length > 0
        ? ['🔴 Still pending (high priority):', ...high.map((t) => `• ${t.title}`), '']
        : []),
      `📊 ${tasks.length - done} tasks remaining`,
      `🔗 Open tracker: ${window.location.origin}`,
    ]
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`, '_blank')
  }

  if (loading) return <DashboardSkeleton />

  const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]))

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'todo') return t.status !== 'done'
    if (filter === 'high') return t.priority === 'high' && t.status !== 'done'
    return true
  })

  const byCategory = filteredTasks.reduce<Record<string, Task[]>>((acc, t) => {
    ;(acc[t.category] ??= []).push(t)
    return acc
  }, {})

  const done = tasks.filter((t) => t.status === 'done').length
  const highPending = tasks.filter((t) => t.priority === 'high' && t.status !== 'done').length
  const pendingCount = tasks.filter((t) => t.status !== 'done').length

  return (
    <>
      {/* Sticky app bar */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(246, 247, 245, 0.85)',
          backdropFilter: 'saturate(180%) blur(12px)',
          WebkitBackdropFilter: 'saturate(180%) blur(12px)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <div
          style={{
            maxWidth: 600,
            margin: '0 auto',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.3 }}>
              💍 Shaadi Tracker
            </div>
            {currentUser && (
              <div style={{ fontSize: 12.5, color: 'var(--ink-500)', marginTop: 1 }}>
                Hi, {currentUser.name} 👋
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <Link href="/admin" className="btn-ghost btn" style={{ boxShadow: 'none' }}>
              Admin
            </Link>
            <button onClick={logout} className="btn btn-ghost" style={{ boxShadow: 'none' }}>
              Switch
            </button>
          </div>
        </div>
      </header>

      <main className="shell" style={{ paddingTop: 16 }}>
        {/* Hero progress card */}
        <div
          className="fade-up"
          style={{
            borderRadius: 'var(--r-xl)',
            padding: '18px 18px 20px',
            background: 'linear-gradient(135deg, #ffffff 0%, var(--green-50) 100%)',
            border: '1px solid var(--green-100)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <ProgressBar done={done} total={tasks.length} />
          <button
            onClick={shareDigest}
            className="btn btn-whatsapp btn-block"
            style={{ marginTop: 16 }}
          >
            📤 Share progress on WhatsApp
          </button>
        </div>

        {/* My Tasks quick link */}
        <Link
          href="/my-tasks"
          className="card"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            marginTop: 14,
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 600 }}>👤 My Tasks</span>
          <span style={{ color: 'var(--ink-400)', fontSize: 18 }}>›</span>
        </Link>

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: 8, marginTop: 20, marginBottom: 4, flexWrap: 'wrap' }}>
          {(['all', 'todo', 'high'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`seg${filter === f ? ' seg-active' : ''}`}
            >
              {f === 'all'
                ? 'All'
                : f === 'todo'
                ? `Pending${pendingCount ? ` · ${pendingCount}` : ''}`
                : `🔴 High${highPending ? ` · ${highPending}` : ''}`}
            </button>
          ))}
        </div>

        {/* Task list by category */}
        {Object.entries(byCategory).map(([cat, list]) => {
          const catDone = list.filter((t) => t.status === 'done').length
          const isCollapsed = collapsed.has(cat)
          const pct = list.length ? Math.round((catDone / list.length) * 100) : 0
          return (
            <section key={cat} style={{ marginTop: 22 }}>
              <button
                onClick={() => toggleCollapse(cat)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  padding: '2px 0 10px',
                }}
              >
                <span style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>{CATEGORY_EMOJI[cat] ?? '📋'}</span>
                  {cat}
                  <span className="chip chip-neutral">{catDone}/{list.length}</span>
                </span>
                <span
                  style={{
                    fontSize: 18,
                    color: 'var(--ink-400)',
                    transition: 'transform 0.2s ease',
                    transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                  }}
                >
                  ▾
                </span>
              </button>

              {!isCollapsed && (
                <>
                  <div className="track" style={{ height: 5, marginBottom: 12 }}>
                    <div
                      className={`track-fill${pct === 100 ? ' full' : ''}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {list.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      assignedName={t.assigned_to ? userMap[t.assigned_to] : undefined}
                      onDone={markDone}
                    />
                  ))}
                </>
              )}
            </section>
          )
        })}

        {Object.keys(byCategory).length === 0 && (
          <div style={{ textAlign: 'center', marginTop: 64, padding: 24 }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>
              {filter === 'high' ? '🎉' : '📋'}
            </div>
            <p style={{ fontSize: 16, color: 'var(--ink-500)' }}>
              {filter === 'high' ? 'No high-priority tasks pending!' : 'No tasks found.'}
            </p>
          </div>
        )}
      </main>

      {toast && <div className="toast">{toast}</div>}
    </>
  )
}

function DashboardSkeleton() {
  return (
    <main className="shell" style={{ paddingTop: 24 }}>
      <div className="skel" style={{ height: 110, marginBottom: 14 }} />
      <div className="skel" style={{ height: 52, marginBottom: 20 }} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
        <div className="skel" style={{ height: 38, width: 70, borderRadius: 999 }} />
        <div className="skel" style={{ height: 38, width: 90, borderRadius: 999 }} />
        <div className="skel" style={{ height: 38, width: 80, borderRadius: 999 }} />
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="skel" style={{ height: 72, marginBottom: 10 }} />
      ))}
    </main>
  )
}
