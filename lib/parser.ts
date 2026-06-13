import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export type ParseResult = {
  action: 'done' | 'start' | 'comment' | 'unknown'
  task_id: string | null
  comment_text: string | null
  confidence: number
}

export async function parseMessage(
  message: string,
  tasks: { id: string; title: string }[]
): Promise<ParseResult> {
  const system =
    'You convert a WhatsApp message into a task action. ' +
    'Respond ONLY with minified JSON, no prose, no markdown fences. ' +
    'Schema: {"action":"done|start|comment|unknown","task_id":"<id or null>",' +
    '"comment_text":"<string or null>","confidence":0.0-1.0}. ' +
    'task_id MUST be chosen from the provided list. ' +
    'If you cannot confidently match a task, set confidence below 0.75. ' +
    'Messages may be in English, Hindi, or Marathi (including Roman script).'

  const user = `Open tasks:\n${JSON.stringify(tasks)}\nMessage: ${JSON.stringify(message)}`

  try {
    const resp = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 200,
      system,
      messages: [{ role: 'user', content: user }],
    })
    const text = resp.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { text: string }).text)
      .join('')
      .replace(/```json|```/g, '')
      .trim()
    return JSON.parse(text) as ParseResult
  } catch (e) {
    console.error('parse error:', e)
    return { action: 'unknown', task_id: null, comment_text: null, confidence: 0 }
  }
}
