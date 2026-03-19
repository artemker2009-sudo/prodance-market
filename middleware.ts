import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { getSafeRedirectPath, isAuthPage, isProtectedPath } from './app/lib/auth-routing'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
}

if (!supabaseAnonKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set')
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  let response = NextResponse.next({
    request,
  })
  let responseCookies: Array<{
    name: string
    value: string
    options?: Parameters<typeof response.cookies.set>[2]
  }> = []

  const applyResponseCookies = (target: NextResponse) => {
    responseCookies.forEach(({ name, value, options }) => {
      target.cookies.set(name, value, options)
    })
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))

        response = NextResponse.next({
          request,
        })
        responseCookies = cookiesToSet

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && isProtectedPath(pathname)) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set(
      'redirectTo',
      getSafeRedirectPath(`${request.nextUrl.pathname}${request.nextUrl.search}`)
    )

    const redirectResponse = NextResponse.redirect(loginUrl)
    applyResponseCookies(redirectResponse)
    return redirectResponse
  }

  if (user && isAuthPage(pathname)) {
    const redirectResponse = NextResponse.redirect(new URL('/', request.url))
    applyResponseCookies(redirectResponse)
    return redirectResponse
  }

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
