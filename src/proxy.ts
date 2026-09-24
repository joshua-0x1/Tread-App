import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// getUser() calls out to the Supabase Auth server on every request. A single
// transient network error would otherwise be indistinguishable from "not
// logged in" and bounce a valid session back to /auth, so retry once before
// giving up.
async function getUserWithRetry(supabase: SupabaseClient) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { data, error } = await supabase.auth.getUser()
      if (!error) return data.user
    } catch {
      // network/transport failure — fall through to retry
    }
  }
  return null
}

async function getProfileWithRetry(supabase: SupabaseClient, userId: string) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('is_approved, role')
        .eq('user_id', userId)
        .maybeSingle()
      if (!error) return data
    } catch {
      // network/transport failure — fall through to retry
    }
  }
  return null
}

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  // Intercept Supabase password recovery codes that land on any page other than
  // /auth/callback (this happens when Supabase's redirect_to is set to the site root).
  const code = searchParams.get('code')
  const type = searchParams.get('type')
  if (code && type === 'recovery' && pathname !== '/auth/callback') {
    const callbackUrl = request.nextUrl.clone()
    callbackUrl.pathname = '/auth/callback'
    return NextResponse.redirect(callbackUrl)
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const user = await getUserWithRetry(supabase)

  const isAuthPage = request.nextUrl.pathname.startsWith('/auth')
  const isPendingPage = request.nextUrl.pathname === '/pending'

  // Let static files, favicon, etc. pass through. API routes (e.g. the
  // cron worker) authenticate themselves and have no browser session/cookies.
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname === '/favicon.ico' ||
    request.nextUrl.pathname.startsWith('/api/')
  ) {
    return response
  }

  const isAuthCallback =
    request.nextUrl.pathname === '/auth/callback' ||
    request.nextUrl.pathname === '/auth/update-password' ||
    request.nextUrl.pathname.startsWith('/auth/threads/')

  if (!user && !isAuthPage && !isPendingPage && !isAuthCallback) {
    return NextResponse.redirect(new URL('/auth', request.url))
  }

  if (user) {
    // Query database for user profile details. Fails closed (treated as
    // unapproved) if the query errors on every attempt, rather than crashing
    // the middleware or silently letting an unverified user through.
    const profile = await getProfileWithRetry(supabase, user.id)

    const isApproved = profile?.is_approved || false
    const role = profile?.role || 'user'

    if (!isApproved) {
      if (!isPendingPage && !isAuthPage && !isAuthCallback) {
        return NextResponse.redirect(new URL('/pending', request.url))
      }
    } else {
      if (isPendingPage) {
        return NextResponse.redirect(new URL('/', request.url))
      }
      if (isAuthPage && !isAuthCallback) {
        return NextResponse.redirect(new URL('/', request.url))
      }
      if (request.nextUrl.pathname.startsWith('/admin') && role !== 'admin') {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
