'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export async function getThreadsAuthUrl() {
  const appId = process.env.NEXT_PUBLIC_THREAD_APP_ID

  if (!appId) {
    return { error: 'NEXT_PUBLIC_THREAD_APP_ID is not configured in env' }
  }

  // Dynamically resolve origin from host header, enforcing HTTPS protocol
  const headersList = await headers()
  const host = headersList.get('host') || 'localhost:3000'
  const origin = `https://${host}`

  const redirectUri = encodeURIComponent(`${origin}/auth/threads/callback`)
  const url = `https://threads.net/oauth/authorize?client_id=${appId}&redirect_uri=${redirectUri}&scope=threads_basic,threads_content_publish,threads_manage_insights,threads_keyword_search&response_type=code`

  return { url }
}

export async function checkThreadsConnection() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { connected: false }
  }

  const { data, error } = await supabase
    .from('social_accounts')
    .select('account_id, username, display_name, avatar_url, expires_at')
    .eq('user_id', user.id)
    .eq('platform', 'threads')
    .maybeSingle()

  if (error || !data) {
    return { connected: false }
  }

  return {
    connected: true,
    username: data.username || `User #${data.account_id}`,
    displayName: data.display_name || data.username || '',
    avatarUrl: data.avatar_url || '',
    expiresAt: data.expires_at ? new Date(data.expires_at).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }) : '',
  }
}

// Pure Threads API call, reusable from both a logged-in-user request and the
// cron worker (which has no session, just an access token looked up via a
// service-role client).
export async function publishThreadsContent(accessToken: string, threadsUserId: string, content: string, topicTag?: string) {
  try {
    // Step 1: Create media creation container using POST request body
    const containerParams = new URLSearchParams({
      media_type: 'TEXT',
      text: content,
      access_token: accessToken,
    })
    if (topicTag && topicTag.trim()) {
      containerParams.set('topic_tag', topicTag.trim())
    }

    const containerRes = await fetch(
      `https://graph.threads.net/v1.0/${threadsUserId}/threads`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: containerParams,
      }
    )

    const containerData = await containerRes.json()

    if (containerData.error) {
      console.error('Threads Media Container Error:', containerData.error)
      return { error: containerData.error.message || 'Failed to create Threads container.' }
    }

    const creationId = containerData.id

    // Step 1.5: Poll the container until Threads finishes processing it.
    // Publishing immediately after creation is a known race condition — the
    // container can still be IN_PROGRESS, and threads_publish then fails with
    // "Media Not Found" even though creation itself succeeded.
    const maxPollAttempts = 10
    const pollIntervalMs = 1500
    for (let attempt = 0; attempt < maxPollAttempts; attempt++) {
      const statusRes = await fetch(
        `https://graph.threads.net/v1.0/${creationId}?fields=status,error_message&access_token=${encodeURIComponent(accessToken)}`
      )
      const statusData = await statusRes.json()

      if (statusData.status === 'FINISHED') break
      if (statusData.status === 'ERROR') {
        return { error: statusData.error_message || 'Threads failed to process the post container.' }
      }
      // Still IN_PROGRESS (or status missing) — wait and check again.
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
    }

    // Step 2: Publish the media container using POST request body
    const publishRes = await fetch(
      `https://graph.threads.net/v1.0/${threadsUserId}/threads_publish`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          creation_id: creationId,
          access_token: accessToken,
        }),
      }
    )

    const publishData = await publishRes.json()

    if (publishData.error) {
      console.error('Threads Publishing Error:', publishData.error)
      return { error: publishData.error.message || 'Failed to publish Threads post.' }
    }

    // Step 3: Best-effort permalink lookup so the app can link back to the live post.
    // A failure here shouldn't fail the publish — the post is already live.
    let permalinkUrl: string | undefined
    try {
      const permalinkRes = await fetch(
        `https://graph.threads.net/v1.0/${publishData.id}?fields=permalink&access_token=${encodeURIComponent(accessToken)}`
      )
      const permalinkData = await permalinkRes.json()
      permalinkUrl = permalinkData.permalink || undefined
    } catch (err) {
      console.error('Threads Permalink Lookup Failure:', err)
    }

    return { success: true, platformPostId: publishData.id, permalinkUrl }
  } catch (err: any) {
    console.error('Threads API Request Failure:', err)
    return { error: err.message || 'Network error occurred during publishing.' }
  }
}

// Fetches real per-post engagement metrics from the Threads Insights API.
// Requires the threads_manage_insights scope granted during OAuth.
export async function fetchThreadsInsights(accessToken: string, mediaId: string) {
  try {
    const url = new URL(`https://graph.threads.net/v1.0/${mediaId}/insights`)
    url.searchParams.set('metric', 'views,likes,replies,reposts,quotes')
    url.searchParams.set('access_token', accessToken)

    const res = await fetch(url.toString())
    const data = await res.json()

    if (data.error) {
      console.error('Threads Insights Error:', data.error)
      return { error: data.error.message || 'Failed to fetch Threads insights.' }
    }

    // Metrics come back either as a "values" timeseries or a "total_value" object.
    const valueByMetric = new Map<string, number>()
    for (const metric of data.data || []) {
      const value = metric.total_value?.value ?? metric.values?.[0]?.value ?? 0
      valueByMetric.set(metric.name, value)
    }

    return {
      success: true as const,
      metrics: {
        likes: valueByMetric.get('likes') || 0,
        replies: valueByMetric.get('replies') || 0,
        views: valueByMetric.get('views') || 0,
        reposts: valueByMetric.get('reposts') || 0,
      },
    }
  } catch (err: any) {
    console.error('Threads Insights Request Failure:', err)
    return { error: err.message || 'Network error occurred while fetching insights.' }
  }
}

export interface ThreadsSearchResult {
  id: string
  text: string
  permalink: string
  username: string
}

// Real public post discovery by topic, on behalf of the connected user.
// Requires the threads_keyword_search scope granted during OAuth — tokens issued
// before this scope existed will fail here until the user reconnects their account.
export async function searchThreadsByKeyword(accessToken: string, query: string, limit = 5) {
  try {
    const url = new URL('https://graph.threads.net/v1.0/keyword_search')
    url.searchParams.set('q', query)
    url.searchParams.set('search_type', 'TOP')
    url.searchParams.set('media_type', 'TEXT')
    url.searchParams.set('limit', String(limit))
    url.searchParams.set('fields', 'id,text,permalink,username')
    url.searchParams.set('access_token', accessToken)

    const res = await fetch(url.toString())
    const data = await res.json()

    // Temporary verbose logging while debugging why searches return zero results —
    // logs the full raw Threads response so we can see the actual API behavior.
    console.log(`[Threads Keyword Search] q="${query}" HTTP ${res.status}:`, JSON.stringify(data))

    if (data.error) {
      console.error('Threads Keyword Search Error:', data.error)
      return { error: data.error.message || 'Failed to search Threads.' }
    }

    const posts: ThreadsSearchResult[] = (data.data || [])
      .filter((p: any) => typeof p.text === 'string' && p.text.trim().length > 0)
      .map((p: any) => ({
        id: p.id,
        text: p.text,
        permalink: p.permalink || '',
        username: p.username || '',
      }))

    return { success: true as const, posts }
  } catch (err: any) {
    console.error('Threads Keyword Search Request Failure:', err)
    return { error: err.message || 'Network error occurred while searching Threads.' }
  }
}

export async function publishToThreadsApi(content: string, topicTag?: string) {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'User is not authenticated' }
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

  return publishThreadsContent(account.access_token, account.account_id, content, topicTag)
}

export async function disconnectThreads() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Not authenticated' }
  }

  // Delete all generated posts for this user
  const { error: deletePostsError } = await supabase
    .from('posts')
    .delete()
    .eq('user_id', user.id)

  if (deletePostsError) {
    console.error('[Threads Disconnect] Failed to delete user posts:', deletePostsError)
  }

  // Reset the user profile persona details
  const { error: resetProfileError } = await supabase
    .from('user_profiles')
    .update({
      background_info: null,
      writing_style_rules: null,
      preferred_tone: null,
      author_persona: null,
      target_audience: null,
      personality_traits: null,
      likes_dislikes: null,
      values: null,
      lifestyle: null,
      dreams: null,
      outlook_on_life: null,
    })
    .eq('user_id', user.id)

  if (resetProfileError) {
    console.error('[Threads Disconnect] Failed to reset user profile:', resetProfileError)
  }

  // Delete the social account linking
  const { error } = await supabase
    .from('social_accounts')
    .delete()
    .eq('user_id', user.id)
    .eq('platform', 'threads')

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
