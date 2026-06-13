const V     = process.env.WHATSAPP_API_VERSION ?? 'v22.0'
const PID   = process.env.WHATSAPP_PHONE_NUMBER_ID!
const TOKEN = process.env.WHATSAPP_ACCESS_TOKEN!

export async function sendText(to: string, body: string): Promise<void> {
  const res = await fetch(`https://graph.facebook.com/${V}/${PID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { body },
    }),
  })
  if (!res.ok) console.error('WhatsApp send failed:', res.status, await res.text())
}
