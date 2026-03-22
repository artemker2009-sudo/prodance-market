import webpush from 'web-push'

import { supabaseAdmin } from '../../../lib/supabase-admin'

type StoredPushSubscription = {
  endpoint: string
  expirationTime: number | null
  keys: {
    p256dh: string
    auth: string
  }
}

type NotifyPayload = {
  receiver_id?: string
  title?: string
  body?: string
  url?: string
}

function isStoredSubscription(value: unknown): value is StoredPushSubscription {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<StoredPushSubscription>
  return (
    typeof candidate.endpoint === 'string' &&
    Boolean(candidate.endpoint.trim()) &&
    typeof candidate.keys?.p256dh === 'string' &&
    typeof candidate.keys?.auth === 'string'
  )
}

function resolveStatusCode(error: unknown): number | undefined {
  if (!error || typeof error !== 'object' || !('statusCode' in error)) {
    return undefined
  }

  const statusCode = (error as { statusCode?: number }).statusCode
  return typeof statusCode === 'number' ? statusCode : undefined
}

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as NotifyPayload
    const receiverId = payload?.receiver_id?.trim()
    const title = payload?.title?.trim()
    const body = payload?.body?.trim()
    const url = payload?.url?.trim() || '/'

    if (!receiverId || !title || !body) {
      return Response.json({ success: true })
    }

    const vapidSubject = process.env.VAPID_SUBJECT
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY

    if (!vapidSubject || !vapidPublicKey || !vapidPrivateKey) {
      console.error('Missing VAPID envs for push notify')
      return Response.json({ success: true })
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

    const { data: profile, error: profileError } = await (supabaseAdmin.from('profiles') as any)
      .select('push_subscriptions')
      .eq('id', receiverId)
      .maybeSingle()

    if (profileError) {
      throw profileError
    }

    const subscriptions = Array.isArray(profile?.push_subscriptions)
      ? (profile.push_subscriptions as unknown[])
      : []
    if (!subscriptions.length) {
      return Response.json({ success: true })
    }

    const cleanedSubscriptions: StoredPushSubscription[] = []

    for (const rawSubscription of subscriptions) {
      if (!isStoredSubscription(rawSubscription)) {
        continue
      }

      try {
        await webpush.sendNotification(rawSubscription, JSON.stringify({ title, body, url }))
        cleanedSubscriptions.push(rawSubscription)
      } catch (error) {
        const statusCode = resolveStatusCode(error)
        if (statusCode === 410) {
          continue
        }

        console.error('Push send failed', error)
        cleanedSubscriptions.push(rawSubscription)
      }
    }

    if (cleanedSubscriptions.length !== subscriptions.length) {
      await (supabaseAdmin.from('profiles') as any)
        .update({ push_subscriptions: cleanedSubscriptions })
        .eq('id', receiverId)
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Push notify error', error)
    return Response.json({ success: true })
  }
}
