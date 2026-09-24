'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  return { redirect: '/' }
}

export async function signup(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string
  const invitationCode = formData.get('invitationCode') as string

  if (!email || !password || !confirmPassword || !invitationCode) {
    return { error: 'All fields are required' }
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match' }
  }

  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters long' }
  }

  const supabase = await createClient()

  // Reserve the invitation code slot atomically before creating the account,
  // so two concurrent signups can't both consume the last remaining use.
  const { data: invitationId, error: invitationError } = await supabase.rpc(
    'reserve_invitation_code',
    { p_code: invitationCode }
  )

  if (invitationError) {
    return { error: invitationError.message }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
    },
  })

  if (error) {
    await supabase.rpc('release_invitation_code', { p_invitation_id: invitationId })
    return { error: error.message }
  }

  if (data?.user) {
    const { error: redemptionError } = await supabase.rpc('finalize_invitation_redemption', {
      p_invitation_id: invitationId,
      p_user_id: data.user.id,
    })
    if (redemptionError) {
      console.error('[Auth Actions] Failed to record invitation redemption:', redemptionError)
    }
  }

  if (data?.session) {
    return { redirect: '/' }
  }

  return { success: 'Check your email for the confirmation link!' }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/auth')
}

export async function loginWithThreads() {
  const appId = process.env.NEXT_PUBLIC_THREAD_APP_ID

  if (!appId) {
    return { error: 'Threads App ID is not configured' }
  }

  const headersList = await headers()
  const host = headersList.get('host') || 'localhost:3000'
  const origin = `https://${host}`
  const callbackUrl = `${origin}/auth/threads/login-callback`
  const redirectUri = encodeURIComponent(callbackUrl)
  const url = `https://threads.net/oauth/authorize?client_id=${appId}&redirect_uri=${redirectUri}&scope=threads_basic,threads_content_publish,threads_manage_insights,threads_keyword_search&response_type=code`

  console.log('[Threads OAuth] Constructed URL:', url)
  console.log('[Threads OAuth] Redirect URI (decoded):', callbackUrl)

  return { redirect: url }
}

export async function requestPasswordReset(formData: FormData) {
  const email = formData.get('email') as string

  if (!email) {
    return { error: 'Email address is required' }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const supabase = await createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?type=recovery`,
  })

  if (error) {
    return { error: error.message }
  }

  // Always return success to avoid email enumeration
  return { success: 'If an account with that email exists, a password reset link has been sent.' }
}

export async function updatePassword(formData: FormData) {
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!password || !confirmPassword) {
    return { error: 'Both password fields are required' }
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match' }
  }

  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters long' }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
