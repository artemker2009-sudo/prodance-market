import { createSupabaseServerClient } from '../../../lib/supabase-server'

type StoredPushSubscription = {
  endpoint: string
  expirationTime: number | null
  keys: {
    p256dh: string
    auth: string
  }
}

type SubscribePayload = {
  subscription?: StoredPushSubscription
} & Partial<StoredPushSubscription>

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

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return Response.json({ success: false }, { status: 401 })
    }

    const payload = (await req.json()) as SubscribePayload
    const rawSubscription = payload?.subscription ?? payload

    if (!isStoredSubscription(rawSubscription)) {
      return Response.json({ success: false }, { status: 400 })
    }

    const subscription: StoredPushSubscription = {
      endpoint: rawSubscription.endpoint.trim(),
      expirationTime: rawSubscription.expirationTime ?? null,
      keys: {
        p256dh: rawSubscription.keys.p256dh,
        auth: rawSubscription.keys.auth,
      },
    }

    const { data: profile, error: selectError } = await (supabase.from('profiles') as any)
      .select('push_subscriptions')
      .eq('id', user.id)
      .maybeSingle()

    if (selectError) {
      throw selectError
    }

    const currentSubscriptions: StoredPushSubscription[] = Array.isArray(profile?.push_subscriptions)
      ? profile.push_subscriptions
      : []
    const alreadyExists = currentSubscriptions.some((entry) => entry?.endpoint === subscription.endpoint)

    if (alreadyExists) {
      return Response.json({ success: true })
    }

    const nextSubscriptions = [...currentSubscriptions, subscription]

    const { error: updateError } = await (supabase.from('profiles') as any)
      .update({ push_subscriptions: nextSubscriptions })
      .eq('id', user.id)

    if (updateError) {
      throw updateError
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Push subscribe error', error)
    return Response.json({ success: false }, { status: 500 })
  }
}
