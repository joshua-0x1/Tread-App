'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { publishThreadsContent, fetchThreadsInsights } from './threads'

export interface PostRecord {
  id: string
  topic: string
  topicTag: string | null
  coreMessage: string
  referencePosts: string
  generatedContent: string
  platformPostId: string | null
  platformPostUrl: string | null
  status: string
  scheduledAt: string | null
  publishedAt: string | null
  failureReason: string | null
  analyticsSynced: boolean
  structureCloned: boolean
  markedForRestart: boolean
  aiInsight: string | null
  syncError: string | null
  metrics?: {
    likes: number
    replies: number
    views: number
    reposts: number
  }
}

interface PostRow {
  id: string
  topic: string | null
  topic_tag: string | null
  core_message: string | null
  reference_posts: string | null
  generated_content: string | null
  platform_post_id: string | null
  platform_post_url: string | null
  status: string
  scheduled_at: string | null
  published_at: string | null
  failure_reason: string | null
  analytics_synced: boolean | null
  structure_cloned: boolean | null
  marked_for_restart: boolean | null
  ai_insight: string | null
  sync_error: string | null
}

function mapRow(row: PostRow): PostRecord {
  return {
    id: row.id,
    topic: row.topic || '',
    topicTag: row.topic_tag,
    coreMessage: row.core_message || '',
    referencePosts: row.reference_posts || '',
    generatedContent: row.generated_content || '',
    platformPostId: row.platform_post_id,
    platformPostUrl: row.platform_post_url,
    status: row.status,
    scheduledAt: row.scheduled_at,
    publishedAt: row.published_at,
    failureReason: row.failure_reason,
    analyticsSynced: !!row.analytics_synced,
    structureCloned: !!row.structure_cloned,
    markedForRestart: !!row.marked_for_restart,
    aiInsight: row.ai_insight,
    syncError: row.sync_error,
  }
}

async function getAuthedClientAndAccount() {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return null
  }

  return { supabase, user }
}

// --- Immediate publish (from the main Generation Workspace) ---

export async function recordPublishedPost(data: {
  topic: string
  topicTag?: string
  coreMessage: string
  referencePosts?: string
  generatedContent: string
  platformPostId?: string
  platformPostUrl?: string
}) {
  const auth = await getAuthedClientAndAccount()
  if (!auth) return { error: 'Not authenticated' }
  const { supabase, user } = auth

  const { data: account } = await supabase
    .from('social_accounts')
    .select('id')
    .eq('user_id', user.id)
    .eq('platform', 'threads')
    .maybeSingle()

  const { error } = await supabase.from('posts').insert({
    user_id: user.id,
    account_id: account?.id || null,
    platform: 'threads',
    topic: data.topic,
    topic_tag: data.topicTag || null,
    core_message: data.coreMessage,
    reference_posts: data.referencePosts || null,
    generated_content: data.generatedContent,
    platform_post_id: data.platformPostId || null,
    platform_post_url: data.platformPostUrl || null,
    status: 'published',
    published_at: new Date().toISOString(),
  })

  if (error) {
    console.error('[Posts Actions] Failed to record published post:', error)
    return { error: error.message }
  }

  revalidatePath('/analytics')
  return { success: true }
}

// --- Analytics loop (published posts) ---

export async function listPublishedPosts(): Promise<{ posts: PostRecord[] } | { error: string }> {
  const auth = await getAuthedClientAndAccount()
  if (!auth) return { error: 'Not authenticated' }
  const { supabase, user } = auth

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  if (error) {
    console.error('[Posts Actions] Failed to list published posts:', error)
    return { error: error.message }
  }

  const posts = data.map(mapRow)
  if (posts.length === 0) return { posts }

  const { data: analytics } = await supabase
    .from('post_analytics')
    .select('*')
    .in('post_id', posts.map((p) => p.id))

  const metricsByPostId = new Map(
    (analytics || []).map((a) => [
      a.post_id,
      { likes: a.likes_count, replies: a.replies_count, views: a.views_count, reposts: a.reposts_count },
    ])
  )

  return { posts: posts.map((p) => ({ ...p, metrics: metricsByPostId.get(p.id) })) }
}

// Posts with >= this many likes are treated as high-engagement structures worth cloning
// into the writing guidelines; below it, they're queued for a fresh-reference restart.
const HIGH_ENGAGEMENT_LIKES_THRESHOLD = 50

export async function syncAnalyticsMetrics(postIds: string[]) {
  const auth = await getAuthedClientAndAccount()
  if (!auth) return { error: 'Not authenticated' }
  const { supabase, user } = auth

  const { data: account } = await supabase
    .from('social_accounts')
    .select('access_token')
    .eq('user_id', user.id)
    .eq('platform', 'threads')
    .maybeSingle()

  if (!account?.access_token) {
    return { error: 'Threads account is not linked. Please go to the Account tab to connect your account first.' }
  }

  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .select('id, platform_post_id')
    .in('id', postIds)
    .eq('user_id', user.id)

  if (postsError || !posts) {
    return { error: postsError?.message || 'Failed to load posts for sync.' }
  }

  for (const post of posts) {
    if (!post.platform_post_id) {
      await supabase
        .from('posts')
        .update({ analytics_synced: true, ai_insight: 'インサイト取得不可：この投稿にはThreadsのメディアIDが紐づいていません。' })
        .eq('id', post.id)
        .eq('user_id', user.id)
      continue
    }

    const insights = await fetchThreadsInsights(account.access_token, post.platform_post_id)

    if ('error' in insights) {
      console.error('[Posts Actions] Failed to fetch Threads insights:', insights.error)
      await supabase
        .from('posts')
        .update({ sync_error: insights.error })
        .eq('id', post.id)
        .eq('user_id', user.id)
      continue
    }

    const { likes, replies, views, reposts } = insights.metrics
    const isHighEngagement = likes >= HIGH_ENGAGEMENT_LIKES_THRESHOLD
    const aiInsight = isHighEngagement
      ? '優れたエンゲージメント指標です。構成を執筆ガイドラインに反映しました。'
      : 'エンゲージメントが目標水準に届いていません。構成の見直し対象としてマークしました（次回、新しい参考投稿を収集します）。'

    const { error: postError } = await supabase
      .from('posts')
      .update({
        analytics_synced: true,
        structure_cloned: isHighEngagement,
        marked_for_restart: !isHighEngagement,
        ai_insight: aiInsight,
        sync_error: null,
      })
      .eq('id', post.id)
      .eq('user_id', user.id)

    if (postError) {
      console.error('[Posts Actions] Failed to sync post analytics flags:', postError)
      continue
    }

    const { error: analyticsError } = await supabase.from('post_analytics').insert({
      post_id: post.id,
      likes_count: likes,
      replies_count: replies,
      views_count: views,
      reposts_count: reposts,
    })

    if (analyticsError) {
      console.error('[Posts Actions] Failed to insert post analytics row:', analyticsError)
    }
  }

  revalidatePath('/analytics')
  return { success: true }
}

// --- Saved Posts (drafts not yet published) ---

export async function saveDraftPost(data: {
  topic: string
  topicTag?: string
  coreMessage: string
  referencePosts?: string
  generatedContent: string
}) {
  const auth = await getAuthedClientAndAccount()
  if (!auth) return { error: 'Not authenticated' }
  const { supabase, user } = auth

  const { data: account } = await supabase
    .from('social_accounts')
    .select('id')
    .eq('user_id', user.id)
    .eq('platform', 'threads')
    .maybeSingle()

  const { error } = await supabase.from('posts').insert({
    user_id: user.id,
    account_id: account?.id || null,
    platform: 'threads',
    topic: data.topic,
    topic_tag: data.topicTag || null,
    core_message: data.coreMessage,
    reference_posts: data.referencePosts || null,
    generated_content: data.generatedContent,
    status: 'saved',
  })

  if (error) {
    console.error('[Posts Actions] Failed to save draft post:', error)
    return { error: error.message }
  }

  revalidatePath('/saved')
  return { success: true }
}

export async function listSavedPosts(): Promise<{ posts: PostRecord[] } | { error: string }> {
  const auth = await getAuthedClientAndAccount()
  if (!auth) return { error: 'Not authenticated' }
  const { supabase, user } = auth

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('user_id', user.id)
    .in('status', ['saved', 'scheduled', 'failed'])
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[Posts Actions] Failed to list saved posts:', error)
    return { error: error.message }
  }

  return { posts: data.map(mapRow) }
}

export async function updateSavedPost(id: string, content: string, topicTag?: string) {
  const auth = await getAuthedClientAndAccount()
  if (!auth) return { error: 'Not authenticated' }
  const { supabase, user } = auth

  const { error } = await supabase
    .from('posts')
    .update({ generated_content: content, topic_tag: topicTag || null, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('[Posts Actions] Failed to update saved post:', error)
    return { error: error.message }
  }

  revalidatePath('/saved')
  return { success: true }
}

export async function deleteSavedPost(id: string) {
  const auth = await getAuthedClientAndAccount()
  if (!auth) return { error: 'Not authenticated' }
  const { supabase, user } = auth

  const { error } = await supabase.from('posts').delete().eq('id', id).eq('user_id', user.id)

  if (error) {
    console.error('[Posts Actions] Failed to delete saved post:', error)
    return { error: error.message }
  }

  revalidatePath('/saved')
  return { success: true }
}

export async function publishSavedPost(id: string) {
  const auth = await getAuthedClientAndAccount()
  if (!auth) return { error: 'Not authenticated' }
  const { supabase, user } = auth

  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('generated_content, topic_tag')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (postError || !post) {
    return { error: 'Post not found' }
  }

  const { data: account, error: accountError } = await supabase
    .from('social_accounts')
    .select('account_id, access_token')
    .eq('user_id', user.id)
    .eq('platform', 'threads')
    .maybeSingle()

  if (accountError || !account || !account.access_token) {
    return { error: 'Threads account is not linked. Please go to the Account tab to connect your account first.' }
  }

  const result = await publishThreadsContent(account.access_token, account.account_id, post.generated_content, post.topic_tag || undefined)

  if ('error' in result) {
    return { error: result.error }
  }

  const { error } = await supabase
    .from('posts')
    .update({
      status: 'published',
      platform_post_id: result.platformPostId,
      platform_post_url: result.permalinkUrl || null,
      published_at: new Date().toISOString(),
      scheduled_at: null,
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('[Posts Actions] Failed to mark saved post as published:', error)
    return { error: error.message }
  }

  revalidatePath('/saved')
  revalidatePath('/analytics')
  return { success: true }
}

export async function scheduleNewPost(
  data: {
    topic: string
    topicTag?: string
    coreMessage: string
    referencePosts?: string
    generatedContent: string
  },
  scheduledAt: string
) {
  const auth = await getAuthedClientAndAccount()
  if (!auth) return { error: 'Not authenticated' }
  const { supabase, user } = auth

  if (new Date(scheduledAt).getTime() <= Date.now()) {
    return { error: 'Scheduled time must be in the future.' }
  }

  const { data: account } = await supabase
    .from('social_accounts')
    .select('id')
    .eq('user_id', user.id)
    .eq('platform', 'threads')
    .maybeSingle()

  const { error } = await supabase.from('posts').insert({
    user_id: user.id,
    account_id: account?.id || null,
    platform: 'threads',
    topic: data.topic,
    topic_tag: data.topicTag || null,
    core_message: data.coreMessage,
    reference_posts: data.referencePosts || null,
    generated_content: data.generatedContent,
    status: 'scheduled',
    scheduled_at: scheduledAt,
  })

  if (error) {
    console.error('[Posts Actions] Failed to schedule new post:', error)
    return { error: error.message }
  }

  revalidatePath('/saved')
  return { success: true }
}

export async function schedulePost(id: string, scheduledAt: string) {
  const auth = await getAuthedClientAndAccount()
  if (!auth) return { error: 'Not authenticated' }
  const { supabase, user } = auth

  if (new Date(scheduledAt).getTime() <= Date.now()) {
    return { error: 'Scheduled time must be in the future.' }
  }

  const { error } = await supabase
    .from('posts')
    .update({ status: 'scheduled', scheduled_at: scheduledAt, failure_reason: null })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('[Posts Actions] Failed to schedule post:', error)
    return { error: error.message }
  }

  revalidatePath('/saved')
  return { success: true }
}

export async function cancelScheduledPost(id: string) {
  const auth = await getAuthedClientAndAccount()
  if (!auth) return { error: 'Not authenticated' }
  const { supabase, user } = auth

  const { error } = await supabase
    .from('posts')
    .update({ status: 'saved', scheduled_at: null })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('[Posts Actions] Failed to cancel scheduled post:', error)
    return { error: error.message }
  }

  revalidatePath('/saved')
  return { success: true }
}
