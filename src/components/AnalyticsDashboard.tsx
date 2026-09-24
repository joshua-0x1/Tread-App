'use client'

import React, { useState } from 'react'
import { BarChart3, RefreshCw, Sparkles, ThumbsUp, MessageCircle, Eye, Repeat, CheckCircle, Lightbulb, TrendingDown, Copy, ExternalLink, AlertTriangle, Hash } from 'lucide-react'
import { useLanguage } from './LanguageContext'

export interface PostItem {
  id: string
  topic: string
  topicTag?: string
  coreMessage: string
  generatedContent: string
  platformPostUrl?: string
  status: string
  publishedAt: string
  analyticsSynced: boolean
  structureCloned?: boolean
  markedForRestart?: boolean
  metrics?: {
    likes: number
    replies: number
    views: number
    reposts: number
  }
  aiInsight?: string
  syncError?: string
}

interface AnalyticsDashboardProps {
  posts: PostItem[]
  onSyncAnalytics: () => void | string | undefined | Promise<void | string | undefined>
}

export function AnalyticsDashboard({ posts, onSyncAnalytics }: AnalyticsDashboardProps) {
  const { t, language } = useLanguage()
  const [syncing, setSyncing] = useState(false)
  const [syncedLogs, setSyncedLogs] = useState<string[]>([])
  const [syncFailure, setSyncFailure] = useState<string | null>(null)

  const handleRunSync = async () => {
    setSyncing(true)
    setSyncedLogs([])
    setSyncFailure(null)

    // Simulate 24-hour sync cron job execution
    await new Promise((resolve) => setTimeout(resolve, 1500))
    const error = await onSyncAnalytics()

    if (error) {
      setSyncFailure(error)
      setSyncing(false)
      return
    }

    if (language === 'jp') {
      setSyncedLogs([
        '24時間以上前に公開された投稿のエンゲージメント統計を取得しました。',
        '基準値とのパフォーマンス差を比較分析中...',
        'ループ処理完了: エンゲージメントの高い投稿構造をコピーし、低パフォーマンス投稿を再作成用に再登録しました。'
      ])
    } else {
      setSyncedLogs([
        'Fetched engagement metrics for posts published >= 24h ago.',
        'Analyzing performance vs baseline standards...',
        'Completed loop logic: High-engagement structures cloned, low-engagement queued for fresh scrapes.',
      ])
    }
    setSyncing(false)
  }

  const formatPublishedAt = (publishedAt: string): string => {
    const publishedMs = new Date(publishedAt).getTime()
    if (Number.isNaN(publishedMs)) return publishedAt
    return new Date(publishedMs).toLocaleString(language === 'jp' ? 'ja-JP' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusLabel = (status: string) => {
    if (language === 'jp') {
      switch (status) {
        case 'published': return '公開済み'
        case 'failed': return 'エラー'
        case 'draft': return '下書き'
        case 'pending': return '公開保留中'
        default: return status
      }
    }
    return status.toUpperCase()
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fade-in px-2 md:px-0">
      {/* Header & Sync Controller */}
      <div className="glass-panel p-4 md:p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-5 h-5 text-orange-600" />
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{language === 'jp' ? '分析 ＆ 再構築ループ' : 'Analysis & Restart Loop'}</h2>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono-custom font-medium">
            {language === 'jp' ? '投稿のエンゲージメントを追跡し、構成の複製や再作成ルーチンを自動で実行します。' : 'Monitor post engagement and trigger automated structure clone/restart routines.'}
          </p>
        </div>

        <button
          onClick={handleRunSync}
          disabled={syncing}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md shadow-orange-600/30 transition-all active:scale-95 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? (language === 'jp' ? 'ループ分析中...' : 'Analyzing Loop...') : (language === 'jp' ? 'ループレポート同期' : 'Sync Loop Metrics')}
        </button>
      </div>

      {/* Sync Failure Banner */}
      {syncFailure && (
        <div className="glass-panel p-5 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 space-y-1 animate-fade-in">
          <h3 className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2 uppercase tracking-wider font-mono-custom">
            <AlertTriangle className="w-4 h-4 text-amber-600" /> {language === 'jp' ? '同期エラー' : 'Sync Failed'}
          </h3>
          <p className="text-xs text-amber-900 dark:text-amber-300 font-mono-custom">{syncFailure}</p>
        </div>
      )}

      {/* Synced AI Insights Banner */}
      {syncedLogs.length > 0 && (
        <div className="glass-panel p-5 rounded-2xl border border-orange-200 dark:border-orange-900/50 bg-orange-50/60 dark:bg-orange-950/20 space-y-2 animate-fade-in">
          <h3 className="text-xs font-bold text-orange-800 dark:text-orange-300 flex items-center gap-2 uppercase tracking-wider font-mono-custom">
            <Sparkles className="w-4 h-4 text-orange-600" /> {language === 'jp' ? 'ループ処理ログ' : 'Loop Actions Log'}
          </h3>
          <ul className="space-y-1.5 text-xs text-zinc-700 dark:text-zinc-300 font-mono-custom">
            {syncedLogs.map((log, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                {log}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Posts List */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
          {language === 'jp' ? `ループ追跡対象の投稿 (${posts.length}件)` : `Loop Tracking Posts (${posts.length})`}
        </h3>

        {posts.length === 0 ? (
          <div className="glass-panel p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-center space-y-2">
            <Lightbulb className="w-8 h-8 text-zinc-400 dark:text-zinc-500 mx-auto" />
            <p className="text-xs text-zinc-500 dark:text-zinc-450">{language === 'jp' ? '追跡中の投稿がありません。新しく投稿して開始してください。' : 'No posts in tracking loop. Publish a draft to start.'}</p>
          </div>
        ) : (
          posts.map((post) => (
            <div
              key={post.id}
              className={`glass-panel p-5 rounded-2xl border transition-all space-y-4 ${
                post.structureCloned
                  ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/10 dark:bg-emerald-950/5'
                  : post.markedForRestart
                    ? 'border-rose-200 dark:border-rose-900/50 bg-rose-50/10 dark:bg-rose-950/5'
                    : 'border-zinc-200 dark:border-zinc-800'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-mono-custom text-orange-600 dark:text-orange-400 font-bold uppercase tracking-wider">
                      {post.topic || 'General Topic'}
                    </span>
                    {post.topicTag && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800 font-mono-custom font-semibold">
                        <Hash className="w-2.5 h-2.5" />
                        {post.topicTag}
                      </span>
                    )}
                    {post.platformPostUrl && (
                      <a
                        href={post.platformPostUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-mono-custom font-semibold text-zinc-500 dark:text-zinc-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                      >
                        <ExternalLink className="w-2.5 h-2.5" /> {language === 'jp' ? '投稿を見る' : 'View Post'}
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-zinc-800 dark:text-zinc-200 mt-1 whitespace-pre-wrap break-words font-sans-custom leading-relaxed">
                    {post.generatedContent}
                  </p>
                </div>
                
                {/* Visual loop state badges */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 font-mono-custom font-semibold">
                    {getStatusLabel(post.status)}
                  </span>

                  {post.structureCloned && (
                    <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono-custom font-bold flex items-center gap-1 animate-fade-in">
                      <Copy className="w-2.5 h-2.5" /> {language === 'jp' ? '構造コピー済み' : 'Cloned Structure'}
                    </span>
                  )}

                  {post.markedForRestart && (
                    <span className="text-[9px] px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 font-mono-custom font-bold flex items-center gap-1 animate-fade-in">
                      <TrendingDown className="w-2.5 h-2.5" /> {language === 'jp' ? 'エンゲージメント低調' : 'Low Engagement'}
                    </span>
                  )}
                </div>
              </div>

              {/* Metrics row */}
              <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs font-mono-custom">
                <div className="flex items-center gap-4 md:gap-6 text-zinc-500 dark:text-zinc-400">
                  <span className="flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                    <ThumbsUp className="w-3.5 h-3.5 text-orange-600" />
                    {post.metrics?.likes || 0}
                  </span>
                  <span className="flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                    <MessageCircle className="w-3.5 h-3.5 text-indigo-600" />
                    {post.metrics?.replies || 0}
                  </span>
                  <span className="flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                    <Eye className="w-3.5 h-3.5 text-cyan-600" />
                    {post.metrics?.views || 0}
                  </span>
                  <span className="flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                    <Repeat className="w-3.5 h-3.5 text-emerald-600" />
                    {post.metrics?.reposts || 0}
                  </span>
                </div>

                <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                  {language === 'jp' ? '公開日' : 'Pub'}: {formatPublishedAt(post.publishedAt)}
                </span>
              </div>

              {post.aiInsight && (
                <div className={`p-3 rounded-xl border text-xs font-mono-custom flex items-center gap-2 min-w-0 ${
                  post.structureCloned
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-300'
                    : post.markedForRestart
                      ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 text-rose-900 dark:text-rose-300'
                      : 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900/40 text-orange-900 dark:text-orange-300'
                }`}>
                  <Sparkles className={`w-3.5 h-3.5 shrink-0 ${
                    post.structureCloned
                      ? 'text-emerald-600'
                      : post.markedForRestart
                        ? 'text-rose-600'
                        : 'text-orange-600'
                  }`} />
                  <span className="break-words flex-1">{post.aiInsight}</span>
                </div>
              )}

              {post.syncError && (
                <div className="p-3 rounded-xl border text-xs font-mono-custom flex items-center gap-2 min-w-0 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                  <span className="break-words flex-1">
                    {language === 'jp' ? '同期エラー' : 'Sync failed'}: {post.syncError}
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
