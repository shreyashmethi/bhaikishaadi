'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { setCurrentUserId } from '@/lib/auth'

type U = { id: string; name: string }

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')
}

const AVATAR_COLORS = [
  ['#dcfce7', '#15803d'],
  ['#fef9c3', '#a16207'],
  ['#ffe4e6', '#9f1239'],
  ['#dbeafe', '#1e40af'],
  ['#f3e8ff', '#6b21a8'],
  ['#ffedd5', '#9a3412'],
]

function LoginInner() {
  const supabase = createClient()
  const router = useRouter()
  const token = useSearchParams().get('t')
  const [users, setUsers] = useState<U[]>([])
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const [picked, setPicked] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      if (token) {
        const { data } = await supabase
          .from('users')
          .select('id')
          .eq('login_token', token)
          .maybeSingle()
        if (data) {
          setCurrentUserId(data.id)
          router.replace('/')
          return
        }
        setMsg('That link is invalid. Pick your name below instead.')
      }
      const { data } = await supabase.from('users').select('id,name').order('name')
      setUsers(data ?? [])
      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function pick(id: string) {
    setPicked(id)
    setCurrentUserId(id)
    setTimeout(() => router.replace('/'), 180)
  }

  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(160deg, var(--green-50) 0%, #f6f7f5 45%, var(--rose-50) 100%)',
      }}
    >
      <div
        style={{
          maxWidth: 440,
          width: '100%',
          margin: '0 auto',
          padding: '48px 24px 40px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 36 }} className="fade-up">
          <div style={{ fontSize: 56, marginBottom: 8 }}>💍</div>
          <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.5, color: 'var(--ink-900)' }}>
            Shaadi Tracker
          </h1>
          <p style={{ fontSize: 15, color: 'var(--ink-500)', marginTop: 6 }}>
            Our family wedding, organised together
          </p>
        </div>

        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink-700)', marginBottom: 14 }}>
          Who are you?
        </h2>

        {msg && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--r-md)',
              background: 'var(--rose-50)',
              border: '1px solid var(--rose-100)',
              color: 'var(--rose-700)',
              fontSize: 14,
              marginBottom: 14,
            }}
          >
            {msg}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skel" style={{ height: 66 }} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {users.map((u, i) => {
              const [bg, fg] = AVATAR_COLORS[i % AVATAR_COLORS.length]
              const active = picked === u.id
              return (
                <button
                  key={u.id}
                  onClick={() => pick(u.id)}
                  className="card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '14px 16px',
                    textAlign: 'left',
                    border: active ? '2px solid var(--primary)' : '1px solid var(--line)',
                    background: active ? 'var(--green-50)' : 'var(--surface)',
                    transition: 'all 0.12s ease',
                  }}
                >
                  <span
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: bg,
                      color: fg,
                      fontWeight: 800,
                      fontSize: 16,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {initials(u.name)}
                  </span>
                  <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink-900)' }}>
                    {u.name}
                  </span>
                  <span style={{ marginLeft: 'auto', color: 'var(--ink-400)', fontSize: 20 }}>›</span>
                </button>
              )
            })}
          </div>
        )}

        <p style={{ marginTop: 'auto', paddingTop: 32, textAlign: 'center', fontSize: 12.5, color: 'var(--ink-400)' }}>
          No password needed. Tap your name to continue.
        </p>
      </div>
    </main>
  )
}

export default function Login() {
  return (
    <Suspense fallback={<p style={{ padding: 24 }}>Loading…</p>}>
      <LoginInner />
    </Suspense>
  )
}
