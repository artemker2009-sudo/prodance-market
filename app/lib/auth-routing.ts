const authRoutePaths = new Set(['/login', '/register'])
const protectedRoutePrefixes = ['/create', '/messages', '/profile', '/market/create']

export function isAuthPage(pathname: string) {
  return authRoutePaths.has(pathname)
}

export function isProtectedPath(pathname: string) {
  return protectedRoutePrefixes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
}

export function getSafeRedirectPath(redirectTo: string | null | undefined, fallback = '/') {
  if (!redirectTo || !redirectTo.startsWith('/') || redirectTo.startsWith('//')) {
    return fallback
  }

  try {
    const url = new URL(redirectTo, 'http://localhost')

    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}

export function buildLoginRedirectHref(
  pathname: string,
  options?: {
    reason?: string
  }
) {
  const searchParams = new URLSearchParams({
    redirectTo: pathname,
  })

  if (options?.reason) {
    searchParams.set('reason', options.reason)
  }

  return `/login?${searchParams.toString()}`
}
