import { createBrowserClient } from '@supabase/ssr'
import type { Session } from '@supabase/supabase-js'

import type { Database } from './types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
}

if (!supabaseAnonKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set')
}

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined

export function createSupabaseBrowserClient() {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
  }

  return browserClient
}

export const supabase = createSupabaseBrowserClient()

function sleep(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

type SessionExpectation = 'signed-in' | 'signed-out'

export async function waitForSupabaseSession(
  expectation: SessionExpectation,
  client = supabase
): Promise<Session | null> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const {
      data: { session },
    } = await client.auth.getSession()

    const hasSession = Boolean(session)

    if (
      (expectation === 'signed-in' && hasSession) ||
      (expectation === 'signed-out' && !hasSession)
    ) {
      return session
    }

    await sleep(120 * (attempt + 1))
  }

  return null
}
