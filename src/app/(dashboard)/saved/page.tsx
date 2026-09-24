'use client'

import React, { useState, useEffect } from 'react'
import { X, Bookmark } from 'lucide-react'
import { SavedPostsList } from '@/components/SavedPostsList'
import { PostEditor } from '@/components/PostEditor'
import { useLanguage } from '@/components/LanguageContext'
import { translateMessage } from '@/lib/errorTranslations'
import { checkThreadsConnection } from '@/app/actions/threads'
import {
  PostRecord,
  listSavedPosts,
  updateSavedPost,
  publishSavedPost,
  schedulePost,
  cancelScheduledPost,
  deleteSavedPost,
} from '@/app/actions/posts'

export default function SavedPostsPage() {
  const { t, language } = useLanguage()
  const [posts, setPosts] = useState<PostRecord[] | null>(null)
  const [editingPost, setEditingPost] = useState<PostRecord | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [threadsAccount, setThreadsAccount] = useState<{ username: string; avatarUrl: string } | null>(null)

  const refresh = async () => {
    const result = await listSavedPosts()
    if ('posts' in result) {
      setPosts(result.posts)
    } else {
      console.error('[Saved Posts Page] Failed to load posts:', result.error)
      setPosts([])
    }
  }

  useEffect(() => {
    refresh()
    checkThreadsConnection().then((conn) => {
      if (conn?.connected && conn.username) {
        setThreadsAccount({ username: conn.username, avatarUrl: conn.avatarUrl || '' })
      }
    })
  }, [])

  const handlePublishNow = async (post: PostRecord) => {
    setBusyId(post.id)
    try {
      const result = await publishSavedPost(post.id)
      if (result?.error) {
        alert(translateMessage(result.error, language))
      }
      await refresh()
    } finally {
      setBusyId(null)
    }
  }

  const handleCancelSchedule = async (post: PostRecord) => {
    setBusyId(post.id)
    try {
      await cancelScheduledPost(post.id)
      await refresh()
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (post: PostRecord) => {
    if (!confirm('Delete this saved post? This cannot be undone.')) return
    setBusyId(post.id)
    try {
      await deleteSavedPost(post.id)
      await refresh()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fade-in px-2 md:px-0">
      <div className="glass-panel p-4 md:p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
            <Bookmark className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{t('saved.title')}</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono-custom">{t('saved.subtitle')}</p>
          </div>
        </div>
      </div>

      {posts === null ? (
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      ) : (
        <SavedPostsList
          posts={posts}
          onEdit={setEditingPost}
          onPublishNow={handlePublishNow}
          onCancelSchedule={handleCancelSchedule}
          onDelete={handleDelete}
          busyId={busyId}
        />
      )}

      {editingPost && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-start md:items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-3xl my-8 relative">
            <button
              onClick={() => setEditingPost(null)}
              className="absolute -top-3 -right-3 z-10 p-1.5 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-zinc-100 shadow-md cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <PostEditor
              key={editingPost.id}
              initialContent={editingPost.generatedContent}
              topic={editingPost.topic}
              coreMessage={editingPost.coreMessage}
              initialTopicTag={editingPost.topicTag || ''}
              initialScheduledAt={editingPost.scheduledAt ? editingPost.scheduledAt.slice(0, 16) : undefined}
              threadsAccount={threadsAccount}
              onSave={async (content, topicTag) => {
                const result = await updateSavedPost(editingPost.id, content, topicTag)
                await refresh()
                return result
              }}
              onPublish={async (content, topicTag) => {
                await updateSavedPost(editingPost.id, content, topicTag)
                const result = await publishSavedPost(editingPost.id)
                await refresh()
                if (!result?.error) {
                  setTimeout(() => setEditingPost(null), 1200)
                }
                return result
              }}
              onSchedule={async (content, scheduledAt, topicTag) => {
                await updateSavedPost(editingPost.id, content, topicTag)
                const result = await schedulePost(editingPost.id, scheduledAt)
                await refresh()
                if (!result?.error) {
                  setTimeout(() => setEditingPost(null), 1200)
                }
                return result
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
