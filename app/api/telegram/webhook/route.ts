import { supabaseAdmin } from '../../../lib/supabase-admin'

type TelegramWebhookPayload = {
  message?: {
    text?: string
    chat?: {
      id?: number | string
    }
  }
}

function extractStartUserId(text: string): string | null {
  if (!text.startsWith('/start ')) {
    return null
  }

  const userId = text.slice('/start '.length).trim()
  return userId || null
}

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as TelegramWebhookPayload
    const text = payload?.message?.text
    const chatId = payload?.message?.chat?.id
    const botToken = process.env.TELEGRAM_BOT_TOKEN

    if (!text || chatId === undefined || chatId === null || !botToken) {
      return Response.json({ ok: true })
    }

    const userId = extractStartUserId(text)
    if (!userId) {
      return Response.json({ ok: true })
    }

    await (supabaseAdmin.from('profiles') as any)
      .update({
        telegram_chat_id: chatId.toString(),
        notification_setup_completed: true,
      })
      .eq('id', userId)

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: '✅ Уведомления успешно подключены! Теперь вы не пропустите сообщения от покупателей.',
      }),
    })

    return Response.json({ ok: true })
  } catch (error) {
    console.error('Telegram webhook error', error)
    return Response.json({ ok: true })
  }
}
