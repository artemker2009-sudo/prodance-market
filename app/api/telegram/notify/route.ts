import { supabaseAdmin } from '../../../lib/supabase-admin'

type NotifyPayload = {
  receiver_id?: string
  sender_name?: string
  item_title?: string
  message_text?: string
}

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as NotifyPayload
    const receiverId = payload?.receiver_id?.trim()
    const senderName = payload?.sender_name?.trim()
    const itemTitle = payload?.item_title?.trim()
    const messageText = payload?.message_text?.trim()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    const botToken = process.env.TELEGRAM_BOT_TOKEN

    if (!receiverId || !senderName || !itemTitle || !messageText || !siteUrl || !botToken) {
      return Response.json({ success: true })
    }

    const { data: profile } = await (supabaseAdmin.from('profiles') as any)
      .select('telegram_chat_id')
      .eq('id', receiverId)
      .maybeSingle()

    const chatId = profile?.telegram_chat_id

    if (chatId) {
      const tgResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `🔔 Новое сообщение от ${senderName} по товару "${itemTitle}"\n\n💬 "${messageText}"\n\nПерейти в чат: ${siteUrl}/messages`,
        }),
      })

      let tgData: { ok?: boolean; error_code?: number } = {}
      try {
        tgData = (await tgResponse.json()) as { ok?: boolean; error_code?: number }
      } catch (parseError) {
        console.error('Telegram notify parse error', parseError)
      }

      if (!tgData.ok && tgData.error_code === 403) {
        const { error: unlinkError } = await (supabaseAdmin.from('profiles') as any)
          .update({
            telegram_chat_id: null,
            notification_setup_completed: false,
          })
          .eq('telegram_chat_id', chatId)

        if (unlinkError) {
          console.error('Telegram notify unlink error', unlinkError)
        }
      }
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Telegram notify error', error)
    return Response.json({ success: true })
  }
}
