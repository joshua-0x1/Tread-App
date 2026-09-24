'use client'

import React from 'react'
import { Pencil, Send, CalendarClock, XCircle, Trash2, AlertTriangle, FolderHeart } from 'lucide-react'
import { useLanguage } from './LanguageContext'
import { PostRecord } from '@/app/actions/posts'

interface SavedPostsListProps {
  posts: PostRecord[]
  onEdit: (post: PostRecord) => void
  onPublishNow: (post: PostRecord) => void
  onCancelSchedule: (post: PostRecord) => void
  onDelete: (post: PostRecord) => void
  busyId: string | null
}

export function SavedPostsList({ posts, onEdit, onPublishNow, onCancelSchedule, onDelete, busyId }: SavedPostsListProps) {
  const { t } = useLanguage()

  if (posts.length === 0) {
    return (
      <div className="glass-panel p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-center space-y-2">
        <FolderHeart className="w-8 h-8 text-zinc-400 dark:text-zinc-500 mx-auto" />
        <p className="text-xs text-zinc-500 dark:text-zinc-450">{t('saved.empty')}</p>
      </div>
    )
  }

  const statusBadge = (status: string) => {
    if (status === 'scheduled') {
      return (
        <span className="text-[10px] px-2.5 py-1 rounded-full bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 font-mono-custom font-semibold flex items-center gap-1">
          <CalendarClock className="w-3 h-3" /> {t('saved.status.scheduled')}
        </span>
      )
    }
    if (status === 'failed') {
      return (
        <span className="text-[10px] px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-mono-custom font-semibold flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> {t('saved.status.failed')}
        </span>
      )
    }
    return (
      <span className="text-[10px] px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 font-mono-custom font-semibold">
        {t('saved.status.saved')}
      </span>
    )
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => {
        const isBusy = busyId === post.id
        return (
          <div
            key={post.id}
            className="glass-panel p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-mono-custom text-orange-600 dark:text-orange-400 font-bold uppercase tracking-wider">
                  {post.topic || 'General Topic'}
                </span>
                <p className="text-xs text-zinc-800 dark:text-zinc-200 mt-1 whitespace-pre-wrap break-words font-sans-custom leading-relaxed">
                  {post.generatedContent}
                </p>
              </div>
              <div className="shrink-0">{statusBadge(post.status)}</div>
            </div>

            {post.status === 'scheduled' && post.scheduledAt && (
              <p className="text-[11px] text-orange-700 dark:text-orange-350 font-mono-custom">
                {t('saved.scheduledFor')}: {new Date(post.scheduledAt).toLocaleString()}
              </p>
            )}

            {post.status === 'failed' && post.failureReason && (
              <p className="text-[11px] text-rose-700 dark:text-rose-350 font-mono-custom flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                {t('saved.failureReason')}: {post.failureReason}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                onClick={() => onEdit(post)}
                disabled={isBusy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 text-[11px] font-bold transition-all cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" /> {t('saved.edit')}
              </button>

              <button
                onClick={() => onPublishNow(post)}
                disabled={isBusy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:opacity-50 text-[11px] font-bold transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" /> {t('saved.publishNow')}
              </button>

              {post.status === 'scheduled' && (
                <button
                  onClick={() => onCancelSchedule(post)}
                  disabled={isBusy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 text-[11px] font-bold transition-all cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" /> {t('saved.cancelSchedule')}
                </button>
              )}

              <button
                onClick={() => onDelete(post)}
                disabled={isBusy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-50 text-[11px] font-bold transition-all cursor-pointer ml-auto"
              >
                <Trash2 className="w-3.5 h-3.5" /> {t('saved.delete')}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
