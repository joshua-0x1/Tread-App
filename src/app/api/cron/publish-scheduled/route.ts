import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { publishThreadsContent } from '@/app/actions/threads'
import { sendScheduledPostEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

interface ClaimedPost {
  id: string
  user_id: string
  generated_content: string
  topic_tag: string | null
  success_email_sent_at: string | null
  failure_email_sent_at: string | null
}

function getAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY
  if (!secretKey) {
    throw new Error('SUPABASE_SECRET_KEY is not configured')
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[Cron: publish-scheduled] CRON_SECRET is not configured')
    return Response.json({ error: 'Not configured' }, { status: 500 })
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getAdminClient()

  const { data: claimed, error: claimError } = await supabase.rpc('claim_due_scheduled_posts', { batch_size: 20 })

  if (claimError) {
    console.error('[Cron: publish-scheduled] Failed to claim due posts:', claimError)
    return Response.json({ error: claimError.message }, { status: 500 })
  }

  const posts = (claimed || []) as ClaimedPost[]
  const results: { id: string; status: string }[] = []

  for (const post of posts) {
    const result = await processPost(supabase, post)
    results.push(result)
  }

  return Response.json({ processed: results.length, results })
}

async function processPost(supabase: ReturnType<typeof getAdminClient>, post: ClaimedPost) {
  try {
    const { data: account } = await supabase
      .from('social_accounts')
      .select('account_id, access_token')
      .eq('user_id', post.user_id)
      .eq('platform', 'threads')
      .maybeSingle()

    if (!account || !account.access_token) {
      await markFailed(supabase, post, 'Threads account is no longer linked.')
      return { id: post.id, status: 'failed' }
    }

    const publishResult = await publishThreadsContent(account.access_token, account.account_id, post.generated_content, post.topic_tag || undefined)

    if ('error' in publishResult) {
      await markFailed(supabase, post, publishResult.error || 'Unknown publish error')
      return { id: post.id, status: 'failed' }
    }

    await supabase
      .from('posts')
      .update({
        status: 'published',
        platform_post_id: publishResult.platformPostId,
        platform_post_url: publishResult.permalinkUrl || null,
        published_at: new Date().toISOString(),
        failure_reason: null,
      })
      .eq('id', post.id)

    await notify(supabase, post, { success: true, content: post.generated_content })

    return { id: post.id, status: 'published' }
  } catch (err: any) {
    console.error('[Cron: publish-scheduled] Unexpected error processing post', post.id, err)
    await markFailed(supabase, post, err.message || 'Unexpected error')
    return { id: post.id, status: 'failed' }
  }
}

async function markFailed(supabase: ReturnType<typeof getAdminClient>, post: ClaimedPost, reason: string) {
  await supabase
    .from('posts')
    .update({ status: 'failed', failure_reason: reason })
    .eq('id', post.id)

  await notify(supabase, post, { success: false, content: post.generated_content, failureReason: reason })
}

async function notify(
  supabase: ReturnType<typeof getAdminClient>,
  post: ClaimedPost,
  params: { success: boolean; content: string; failureReason?: string }
) {
  const emailColumn: keyof Pick<ClaimedPost, 'success_email_sent_at' | 'failure_email_sent_at'> = params.success
    ? 'success_email_sent_at'
    : 'failure_email_sent_at'

  // Guard against duplicate emails if this post is somehow reprocessed
  if (post[emailColumn]) return

  const { data: userData } = await supabase.auth.admin.getUserById(post.user_id)
  const userEmail = userData?.user?.email
  if (!userEmail) return

  const emailResult = await sendScheduledPostEmail(userEmail, params)
  if (!('error' in emailResult)) {
    await supabase
      .from('posts')
      .update({ [emailColumn]: new Date().toISOString() })
      .eq('id', post.id)
  }
}
