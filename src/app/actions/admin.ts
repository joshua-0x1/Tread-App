'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

export async function getUsersList() {
  const supabase = await createClient()

  // Verify user is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Not authenticated' }
  }

  // Call get_all_users RPC
  const { data, error } = await supabase.rpc('get_all_users')

  if (error) {
    console.error('[Admin Actions] Failed to fetch users list:', error)
    return { error: error.message }
  }

  return { users: data || [] }
}

export async function updateUserStatus(
  profileId: string,
  isApproved: boolean,
  role: string,
  approvedUntil?: string | null
) {
  const supabase = await createClient()

  // Verify caller is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Not authenticated' }
  }

  // Verify caller is admin
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_approved')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'admin' || !profile.is_approved) {
    return { error: 'Access denied: Admin privileges required' }
  }

  // Update user_profile
  const { error: updateError } = await supabase
    .from('user_profiles')
    .update({ 
      is_approved: isApproved, 
      role, 
      approved_until: isApproved ? (approvedUntil || null) : null 
    })
    .eq('id', profileId)

  if (updateError) {
    console.error('[Admin Actions] Failed to update user profile:', updateError)
    return { error: updateError.message }
  }

  revalidatePath('/admin')
  return { success: true }
}

export async function deleteUser(userId: string) {
  const supabase = await createClient()

  // Verify caller is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Not authenticated' }
  }

  // Verify caller is admin
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_approved')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'admin' || !profile.is_approved) {
    return { error: 'Access denied: Admin privileges required' }
  }

  // Call delete_user_by_admin RPC
  const { error: deleteError } = await supabase.rpc('delete_user_by_admin', {
    target_user_id: userId,
  })

  if (deleteError) {
    console.error('[Admin Actions] Failed to delete user:', deleteError)
    return { error: deleteError.message }
  }

  revalidatePath('/admin')
  return { success: true }
}

export async function resetUserPassword(userId: string, newPassword: string) {
  const supabase = await createClient()

  // Verify caller is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Not authenticated' }
  }

  // Verify caller is admin
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_approved')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'admin' || !profile.is_approved) {
    return { error: 'Access denied: Admin privileges required' }
  }

  // Validate password
  if (!newPassword || newPassword.length < 6) {
    return { error: 'Password must be at least 6 characters' }
  }

  // Require the secret key (service_role) to use Admin Auth API
  const secretKey = process.env.SUPABASE_SECRET_KEY
  if (!secretKey) {
    return { 
      error: 'SUPABASE_SECRET_KEY is not configured. Add your Supabase service_role key to .env.local as SUPABASE_SECRET_KEY to enable admin password resets.' 
    }
  }

  // Build admin client with secret key
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secretKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  const { error: resetError } = await adminClient.auth.admin.updateUserById(userId, {
    password: newPassword,
  })

  if (resetError) {
    console.error('[Admin Actions] Failed to reset user password:', resetError)
    return { error: resetError.message }
  }

  return { success: true }
}

async function requireAdmin() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Not authenticated' } as const
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_approved')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'admin' || !profile.is_approved) {
    return { error: 'Access denied: Admin privileges required' } as const
  }

  return { supabase } as const
}

export async function getInvitationCodes() {
  const check = await requireAdmin()
  if ('error' in check) return { error: check.error }

  const { data, error } = await check.supabase.rpc('get_invitation_codes')

  if (error) {
    console.error('[Admin Actions] Failed to fetch invitation codes:', error)
    return { error: error.message }
  }

  return { codes: data || [] }
}

export async function createInvitationCode(
  code: string,
  maxUses: number,
  expiresAt: string | null,
  note: string | null
) {
  const check = await requireAdmin()
  if ('error' in check) return { error: check.error }

  const { error } = await check.supabase.rpc('create_invitation_code', {
    p_code: code,
    p_max_uses: maxUses,
    p_expires_at: expiresAt,
    p_note: note,
  })

  if (error) {
    console.error('[Admin Actions] Failed to create invitation code:', error)
    return { error: error.message }
  }

  revalidatePath('/admin')
  return { success: true }
}

export async function setInvitationCodeActive(id: string, isActive: boolean) {
  const check = await requireAdmin()
  if ('error' in check) return { error: check.error }

  const { error } = await check.supabase.rpc('set_invitation_code_active', {
    p_id: id,
    p_is_active: isActive,
  })

  if (error) {
    console.error('[Admin Actions] Failed to update invitation code:', error)
    return { error: error.message }
  }

  revalidatePath('/admin')
  return { success: true }
}

export async function deleteInvitationCode(id: string) {
  const check = await requireAdmin()
  if ('error' in check) return { error: check.error }

  const { error } = await check.supabase.rpc('delete_invitation_code', {
    p_id: id,
  })

  if (error) {
    console.error('[Admin Actions] Failed to delete invitation code:', error)
    return { error: error.message }
  }

  revalidatePath('/admin')
  return { success: true }
}

