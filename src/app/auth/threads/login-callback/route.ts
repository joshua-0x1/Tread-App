import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

function getAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  }
  return createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function exchangeCodeForTokens(code: string, redirectUri: string, appId: string, appSecret: string) {
  // Step 1: Short-lived token
  const tokenRes = await fetch('https://graph.threads.net/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code,
    }),
  })
  const tokenData = await tokenRes.json()
  if (tokenData.error || tokenData.error_message) {
    throw new Error(tokenData.error_message || tokenData.error || 'Short-lived token exchange failed')
  }

  const shortLivedToken = tokenData.access_token

  // Step 2: Long-lived token
  const longLivedRes = await fetch(
    `https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${appSecret}&access_token=${shortLivedToken}`
  )
  const longLivedData = await longLivedRes.json()
  if (longLivedData.error) {
    throw new Error(longLivedData.error.message || 'Long-lived token exchange failed')
  }

  const longLivedToken = longLivedData.access_token
  const expiresInSeconds = longLivedData.expires_in || 5184000

  // Step 3: Fetch full Threads profile
  const meRes = await fetch(
    `https://graph.threads.net/v1.0/me?fields=id,username,name,threads_profile_picture_url&access_token=${longLivedToken}`
  )
  const meData = await meRes.json()
  const threadsUserId = String(meData.id)

  return {
    threadsUserId,
    longLivedToken,
    expiresInSeconds,
    username: meData.username || '',
    displayName: meData.name || meData.username || 'Threads User',
    profilePictureUrl: meData.threads_profile_picture_url || '',
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const headersList = await headers()
  const host = headersList.get('x-forwarded-host') || headersList.get('host') || 'localhost:3000'
  const protocol = headersList.get('x-forwarded-proto') || 'https'
  const origin = `${protocol}://${host}`
  const code = searchParams.get('code')
  const errorMsg = searchParams.get('error')

  if (errorMsg) {
    return NextResponse.redirect(`${origin}/auth?error=threads_oauth_failed&details=${encodeURIComponent(errorMsg)}`)
  }
  if (!code) {
    return NextResponse.redirect(`${origin}/auth?error=threads_no_code`)
  }

  const appId = process.env.NEXT_PUBLIC_THREAD_APP_ID
  const appSecret = process.env.THREAD_APP_SECRET

  if (!appId || !appSecret) {
    return NextResponse.redirect(`${origin}/auth?error=threads_env_missing`)
  }

  const redirectUri = `${origin}/auth/threads/login-callback`

  try {
    const { threadsUserId, longLivedToken, expiresInSeconds, username, displayName, profilePictureUrl } =
      await exchangeCodeForTokens(code, redirectUri, appId, appSecret)

    const adminClient = getAdminClient()

    // Sign-in via Threads is only permitted for accounts that already linked their
    // Threads account from Account Settings (src/app/auth/threads/callback/route.ts).
    // We never create a new Supabase user here — Threads cannot be used to sign up.
    const { data: existingMapping } = await adminClient
      .from('social_accounts')
      .select('user_id')
      .eq('platform', 'threads')
      .eq('account_id', threadsUserId)
      .maybeSingle()

    if (!existingMapping) {
      return NextResponse.redirect(
        `${origin}/auth?error=threads_not_linked&details=${encodeURIComponent(
          'No account is linked to this Threads profile yet. Sign up with email, then link your Threads account from Account Settings.'
        )}`
      )
    }

    const { data: mappedUser, error: getUserError } = await adminClient.auth.admin.getUserById(
      existingMapping.user_id
    )
    if (getUserError || !mappedUser?.user?.email) {
      console.error('Failed to resolve linked Threads user:', getUserError)
      return NextResponse.redirect(`${origin}/auth?error=threads_unauthenticated`)
    }

    // Mint a one-time magic-link token for the already-linked user and redeem it
    // immediately to establish their session — no password involved.
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: mappedUser.user.email,
    })
    if (linkError || !linkData?.properties?.hashed_token) {
      console.error('Failed to generate Threads sign-in link:', linkError)
      return NextResponse.redirect(`${origin}/auth?error=threads_login_retry_failed`)
    }

    const supabase = await createClient()
    const { data: authData, error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: 'magiclink',
    })

    if (verifyError || !authData.user) {
      console.error('Failed to verify Threads sign-in link:', verifyError)
      return NextResponse.redirect(`${origin}/auth?error=threads_login_retry_failed`)
    }

    // Refresh their display name and avatar from Threads
    await supabase.auth.updateUser({
      data: {
        display_name: displayName,
        avatar_url: profilePictureUrl,
      },
    })

    const authenticatedUser = authData.user

    // Use a fresh Supabase client instance to ensure the authorization headers carry the active session cookie
    const dbClient = await createClient()

    // Upsert social_accounts record (enforced unique by user_id+platform constraint)
    const { error: upsertError } = await dbClient
      .from('social_accounts')
      .upsert(
        {
          user_id: authenticatedUser.id,
          platform: 'threads',
          account_id: threadsUserId,
          access_token: longLivedToken,
          username,
          display_name: displayName,
          avatar_url: profilePictureUrl,
          expires_at: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
        },
        { onConflict: 'user_id,platform' }
      )

    if (upsertError) {
      console.error('Failed to upsert social account:', upsertError)
      return NextResponse.redirect(`${origin}/auth?error=threads_db_save_failed`)
    }

    return NextResponse.redirect(`${origin}/`)
  } catch (err: any) {
    console.error('Threads login callback exception:', err)
    return NextResponse.redirect(
      `${origin}/auth?error=threads_login_callback_exception&details=${encodeURIComponent(err.message)}`
    )
  }
}
