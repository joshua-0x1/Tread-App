'use client'

import React, { useState, useEffect } from 'react'
import { AnalyticsDashboard, PostItem } from '@/components/AnalyticsDashboard'
import { listPublishedPosts, syncAnalyticsMetrics } from '@/app/actions/posts'

export default function AnalyticsPage() {
  const [posts, setPosts] = useState<PostItem[] | null>(null)

  const refreshPosts = async () => {
    const result = await listPublishedPosts()
    if ('posts' in result) {
      setPosts(
        result.posts.map((p) => ({
          id: p.id,
          topic: p.topic,
          topicTag: p.topicTag || undefined,
          coreMessage: p.coreMessage,
          generatedContent: p.generatedContent,
          platformPostUrl: p.platformPostUrl || undefined,
          status: p.status,
          publishedAt: p.publishedAt || '',
          analyticsSynced: p.analyticsSynced,
          structureCloned: p.structureCloned,
          markedForRestart: p.markedForRestart,
          metrics: p.metrics,
          aiInsight: p.aiInsight || undefined,
          syncError: p.syncError || undefined,
        }))
      )
    } else {
      console.error('[Analytics Page] Failed to load posts:', result.error)
      setPosts([])
    }
  }

  // Load posts on client mount to prevent server hydration mismatches
  useEffect(() => {
    refreshPosts()
  }, [])

  const handleSyncAnalytics = async () => {
    if (!posts) return

    const idsToSync = posts
      .filter((post) => !post.analyticsSynced || post.metrics?.likes === 0)
      .map((post) => post.id)

    if (idsToSync.length === 0) return

    const result = await syncAnalyticsMetrics(idsToSync)
    await refreshPosts()

    if (result && 'error' in result) {
      console.error('[Analytics Page] Failed to sync analytics:', result.error)
      return result.error
    }
  }

  if (!posts) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  return <AnalyticsDashboard posts={posts} onSyncAnalytics={handleSyncAnalytics} />
}
