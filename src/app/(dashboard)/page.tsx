'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { GenerationWorkspace } from '@/components/GenerationWorkspace'
import { ProfileData } from '@/components/ProfileWorkspace'
import { getPersonaProfile } from '@/app/actions/profile'
import { recordPublishedPost } from '@/app/actions/posts'

export default function Home() {
  const router = useRouter()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  // Load profile on client mount to prevent server hydration mismatches
  useEffect(() => {
    let cancelled = false
    getPersonaProfile()
      .then((data) => {
        if (!cancelled) setProfile(data)
      })
      .catch(() => {
        if (!cancelled) setLoadError(true)
      })
    return () => {
      cancelled = true
    }
  }, [retryKey])

  const retryLoadProfile = () => {
    setLoadError(false)
    setRetryKey((k) => k + 1)
  }

  const handlePostCreated = async (newPostData: {
    topic: string
    topicTag?: string
    coreMessage: string
    referencePosts: string
    generatedContent: string
    status: string
    platformPostId?: string
    platformPostUrl?: string
  }) => {
    await recordPublishedPost({
      topic: newPostData.topic,
      topicTag: newPostData.topicTag,
      coreMessage: newPostData.coreMessage,
      referencePosts: newPostData.referencePosts,
      generatedContent: newPostData.generatedContent,
      platformPostId: newPostData.platformPostId,
      platformPostUrl: newPostData.platformPostUrl,
    })

    // Route page to analytics
    router.push('/analytics')
  }

  if (!profile) {
    if (loadError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <p className="text-sm text-zinc-500 dark:text-zinc-450">Failed to load your profile.</p>
          <button
            onClick={retryLoadProfile}
            className="px-4 py-2 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition-all active:scale-95 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )
    }
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  return (
    <GenerationWorkspace profile={profile} onPostCreated={handlePostCreated} />
  )
}
