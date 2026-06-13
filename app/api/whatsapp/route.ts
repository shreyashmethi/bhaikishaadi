import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendText } from '@/lib/whatsapp'
import { parseMessage } from '@/lib/parser'

export const runtime = 'nodejs'

// ---- 1) Meta webhook verification (GET) ----
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  if (
    p.get('hub.mode') === 'subscribe' &&
    p.get('hub.verify_token') === process.env.WHATSAPP_VERIFY_TOKEN
  ) {
    return new NextResponse(p.get('hub.challenge'), { status: 200 })
  }
  return new NextResponse('Forbidden', { status: 403 })
}

// ---- 2) Incoming messages (POST) ----
export async function POST(req: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  const msg = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]
  if (!msg || msg.type !== 'text') {
    return NextResponse.json({ ok: true })
  }

  // Deduplicate Meta retries — same msg.id must not be processed twice
  const messageId = msg.id as string | undefined
  if (messageId) {
    const { data: existing } = await supabaseAdmin
      .from('inbound_messages').select('id').eq('message_id', messageId).maybeSingle()
    if (existing) return NextResponse.json({ ok: true })
  }

  const from = msg.from as string
  const text = (msg.text?.body ?? '').trim()
  const phoneE164 = from.startsWith('+') ? from : `+${from}`

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('phone', phoneE164)
    .maybeSingle()

  if (!user) {
    await sendText(from, "Hi! I don't recognize this number. Please ask the admin to add you to the wedding tracker.")
    return NextResponse.json({ ok: true })
  }

  const { data: rows } = await supabaseAdmin
    .from('tasks')
    .select('id,title,status')
    .eq('assigned_to', user.id)
    .neq('status', 'done')
  const openTasks = (rows ?? []).map((t: { id: string; title: string }) => ({ id: t.id, title: t.title }))

  // ---- Disambiguation: did they just reply with a number? ----
  const numMatch = text.match(/^\s*(\d+)\s*$/)
  if (numMatch && user.pending_options) {
    const opts = user.pending_options as { id: string; title: string }[]
    const chosen = opts[parseInt(numMatch[1], 10) - 1]
    await clearPending(user.id)
    if (chosen) {
      await setStatus(chosen.id, 'done')
      await log(phoneE164, text, { resolved: chosen.id }, 'done-by-number', messageId)
      await sendText(from, `Done — marked "${chosen.title}" complete ✅`)
      return NextResponse.json({ ok: true })
    }
  }

  // ---- LLM parse ----
  const parsed = await parseMessage(text, openTasks)
  await log(phoneE164, text, parsed, 'parsed', messageId)

  if (parsed.action === 'unknown' || parsed.confidence < 0.75 || !parsed.task_id) {
    if (openTasks.length === 0) {
      await sendText(from, 'You have no open tasks right now 🎉')
      return NextResponse.json({ ok: true })
    }
    const listing = openTasks.map((t, i) => `${i + 1}. ${t.title}`).join('\n')
    await setPending(user.id, openTasks)
    await sendText(from, `Which task?\n${listing}\n\nReply with the number.`)
    return NextResponse.json({ ok: true })
  }

  const task = openTasks.find((t) => t.id === parsed.task_id)
  if (!task) {
    await sendText(from, "Sorry, I couldn't match that to a task.")
    return NextResponse.json({ ok: true })
  }

  if (parsed.action === 'done') {
    await setStatus(task.id, 'done')
    await sendText(from, `Got it — marked "${task.title}" as done ✅`)
  } else if (parsed.action === 'start') {
    await setStatus(task.id, 'doing')
    await sendText(from, `Marked "${task.title}" as in progress 🔄`)
  } else if (parsed.action === 'comment') {
    await supabaseAdmin
      .from('comments')
      .insert({ task_id: task.id, user_id: user.id, text: parsed.comment_text ?? text })
    await sendText(from, `Added your note to "${task.title}" 📝`)
  }
  await clearPending(user.id)
  return NextResponse.json({ ok: true })
}

// ---- helpers ----
async function setStatus(id: string, status: string) {
  await supabaseAdmin.from('tasks').update({ status }).eq('id', id)
}
async function setPending(userId: string, opts: unknown) {
  await supabaseAdmin.from('users').update({ pending_options: opts }).eq('id', userId)
}
async function clearPending(userId: string) {
  await supabaseAdmin.from('users').update({ pending_options: null }).eq('id', userId)
}
async function log(phone: string, raw: string, parsed: unknown, result: string, messageId?: string) {
  await supabaseAdmin
    .from('inbound_messages')
    .insert({ message_id: messageId ?? null, from_phone: phone, raw_text: raw, parsed_json: parsed, result })
}
