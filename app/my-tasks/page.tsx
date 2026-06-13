'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUserId } from '@/lib/auth'
import { buzz } from '@/lib/haptics'
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: 13,
        fontWeight: 700,
        color: 'var(--ink-500)',
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
      }}
    >
      {children}
    </h2>
  )
}

export default function MyTasks() {
  const supabase = createClient()
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

  async function load() {
    const uid = getCurrentUserId()
    if (!uid) return
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('assigned_to', uid)
      .order('status')
    setTasks(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    if (!getCurrentUserId()) { router.replace('/login'); return }
    load()
    const uid = getCurrentUserId()!
    const channel = supabase
      .channel('my-tasks-realtime')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'tasks',
        filter: `assigned_to=eq.${uid}`,
      }, load)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function markDone(id: string) {
    const task = tasks.find((t) => t.id === id)
    buzz()
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'done' } : t)))
    await supabase.from('tasks').update({ status: 'done' }).eq('id', id)
    setToast(`✅ "${task?.title}" marked done`)
    setTimeout(() => setToast(null), 2500)
  }

  const done = tasks.filter((t) => t.status === 'done').length
  const pending = tasks.filter((t) => t.status !== 'done')
  const completed = tasks.filter((t) => t.status === 'done')

  return (
    <main className="shell">
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
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>My Tasks</h1>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
          {[0, 1, 2].map((i) => <div key={i} className="skel" style={{ height: 72 }} />)}
        </div>
      ) : tasks.length === 0 ? (
        <div style={{ textAlign: 'center', marginTop: 72 }}>
          <div style={{ fontSize: 56, marginBottom: 14 }}>🎉</div>
          <p style={{ fontSize: 17, fontWeight: 600, color: 'var(--ink-700)' }}>Nothing assigned yet</p>
          <p style={{ fontSize: 14, color: 'var(--ink-400)', marginTop: 6 }}>
            Ask the admin to assign you some tasks.
          </p>
        </div>
      ) : (
        <>
          <div
            className="card"
            style={{
              padding: '16px 18px',
              background: 'linear-gradient(135deg, #ffffff 0%, var(--green-50) 100%)',
              border: '1px solid var(--green-100)',
            }}
          >
            <ProgressBar done={done} total={tasks.length} />
          </div>

          {pending.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <SectionLabel>To do ({pending.length})</SectionLabel>
              {pending.map((t) => <TaskCard key={t.id} task={t} onDone={markDone} />)}
            </div>
          )}

          {completed.length > 0 && (
            <div style={{ marginTop: 28 }}>
              <SectionLabel>Completed ({completed.length})</SectionLabel>
              {completed.map((t) => <TaskCard key={t.id} task={t} onDone={markDone} />)}
            </div>
          )}
        </>
      )}

      {toast && <div className="toast">{toast}</div>}
    </main>
  )
}
