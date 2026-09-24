'use client'

import React, { useState, useEffect } from 'react'
import { Send, CheckCircle2, AlertCircle, RefreshCw, Save, CalendarClock } from 'lucide-react'
import { useLanguage } from './LanguageContext'
import { translateMessage } from '@/lib/errorTranslations'

type ActionResult = { error?: string; success?: boolean } | void

interface PostEditorProps {
  initialContent: string
  topic: string
  coreMessage: string
  initialTopicTag?: string
  onPublish: (content: string, topicTag: string) => Promise<ActionResult>
  onSave?: (content: string, topicTag: string) => Promise<ActionResult>
  onSchedule?: (content: string, scheduledAt: string, topicTag: string) => Promise<ActionResult>
  initialScheduledAt?: string
  onRegenerate?: () => void
  threadsAccount?: { username: string; avatarUrl: string } | null
}

export function PostEditor({
  initialContent,
  topic,
  coreMessage,
  initialTopicTag,
  onPublish,
  onSave,
  onSchedule,
  initialScheduledAt,
  onRegenerate,
  threadsAccount,
}: PostEditorProps) {
  const { t, language } = useLanguage()
  const [content, setContent] = useState(initialContent)
  const [topicTag, setTopicTag] = useState(initialTopicTag || '')
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  const [scheduled, setScheduled] = useState(false)
  const [scheduledAt, setScheduledAt] = useState(initialScheduledAt || '')
  const [error, setError] = useState<string | null>(null)

  const charCount = content.length
  const maxChars = 500
  const isOverLimit = charCount > maxChars

  const [minScheduleValue, setMinScheduleValue] = useState('')
  useEffect(() => {
    setMinScheduleValue(new Date(Date.now() + 60 * 1000).toISOString().slice(0, 16))
  }, [])

  const handlePublish = async () => {
    if (isOverLimit || !content.trim()) return
    setPublishing(true)
    setError(null)

    try {
      const result = await onPublish(content, topicTag)
      if (result?.error) {
        setError(translateMessage(result.error, language))
      } else {
        setPublished(true)
      }
    } catch (err: any) {
      setError(translateMessage(err.message, language) || (language === 'jp' ? '投稿処理中に予期しないエラーが発生しました。' : 'An unexpected error occurred during publishing.'))
    } finally {
      setPublishing(false)
    }
  }

  const handleSave = async () => {
    if (!onSave || !content.trim()) return
    setSaving(true)
    setError(null)

    try {
      const result = await onSave(content, topicTag)
      if (result?.error) {
        setError(translateMessage(result.error, language))
      } else {
        setSaved(true)
      }
    } catch (err: any) {
      setError(translateMessage(err.message, language) || (language === 'jp' ? '保存中に予期しないエラーが発生しました。' : 'An unexpected error occurred while saving.'))
    } finally {
      setSaving(false)
    }
  }

  const handleSchedule = async () => {
    if (!onSchedule || isOverLimit || !content.trim() || !scheduledAt) return
    setScheduling(true)
    setError(null)

    try {
      const isoScheduledAt = new Date(scheduledAt).toISOString()
      const result = await onSchedule(content, isoScheduledAt, topicTag)
      if (result?.error) {
        setError(translateMessage(result.error, language))
      } else {
        setScheduled(true)
      }
    } catch (err: any) {
      setError(translateMessage(err.message, language) || (language === 'jp' ? '予約設定中に予期しないエラーが発生しました。' : 'An unexpected error occurred while scheduling.'))
    } finally {
      setScheduling(false)
    }
  }

  return (
    <div className="glass-panel p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            {language === 'jp' ? '生成された下書き' : 'Generated Single-Text Draft'}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono-custom">
            {language === 'jp' ? 'Threadsに直接投稿する前に、内容を確認・調整してください。' : 'Review and refine your post before publishing directly to Threads.'}
          </p>
        </div>

        {onRegenerate && (
          <button
            onClick={onRegenerate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 text-xs font-mono-custom transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" /> {language === 'jp' ? '再作成' : 'Re-roll'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor Column */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">{language === 'jp' ? '下書き編集' : 'Editable Content'}</label>
          <div className="relative">
            <textarea
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all font-sans-custom leading-relaxed shadow-sm"
            />

            <div className="flex items-center justify-between mt-2 px-1">
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono-custom">
                {language === 'jp' ? 'ターゲット' : 'Target'}: {topic ? `"${topic}"` : 'Single post'}
              </span>

              <div className="flex items-center gap-2 font-mono-custom text-xs">
                <span className={isOverLimit ? 'text-rose-600 font-bold' : 'text-zinc-500 dark:text-zinc-400'}>
                  {charCount}/{maxChars}
                </span>
                <div className="w-16 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                     className={`h-full transition-all ${
                      isOverLimit ? 'bg-rose-500' : 'bg-orange-600'
                    }`}
                    style={{ width: `${Math.min((charCount / maxChars) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {isOverLimit && (
            <p className="text-xs text-rose-600 flex items-center gap-1.5 font-mono-custom font-medium">
              <AlertCircle className="w-3.5 h-3.5" /> {language === 'jp' ? 'Threadsの500文字制限を超えています。' : 'Exceeds Threads 500-character limit.'}
            </p>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">{t('gen.topicTag')}</label>
            <input
              type="text"
              value={topicTag}
              onChange={(e) => setTopicTag(e.target.value)}
              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
            />
          </div>
        </div>

        {/* Live Preview Column */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">{language === 'jp' ? 'プレビュー' : 'Threads Live Preview'}</label>
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4 shadow-sm">
            <div className="flex items-start gap-3">
              {threadsAccount?.avatarUrl ? (
                <img
                  src={threadsAccount.avatarUrl}
                  alt={threadsAccount.username}
                  className="w-9 h-9 rounded-full object-cover border border-zinc-200 dark:border-zinc-800"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-800 dark:text-zinc-200 shrink-0">
                  {threadsAccount?.username ? threadsAccount.username.slice(0, 2).toUpperCase() : 'You'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                    {threadsAccount?.username ? `@${threadsAccount.username}` : '@creator_brand'}
                  </span>
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-450 font-mono-custom shrink-0 ml-2">{language === 'jp' ? '今' : 'Now'}</span>
                </div>
                <div className="mt-2 text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap break-words leading-relaxed font-sans-custom">
                  {content || <span className="text-zinc-400 dark:text-zinc-550 italic">{language === 'jp' ? '下書きが空です...' : 'Draft is empty...'}</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-350 flex items-start gap-2.5 animate-fade-in min-w-0">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span className="font-mono-custom break-all flex-1">{error}</span>
        </div>
      )}

      {onSchedule && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 shrink-0">
            <CalendarClock className="w-3.5 h-3.5" /> {t('gen.editor.scheduleLabel')}
          </label>
          <input
            type="datetime-local"
            value={scheduledAt}
            min={minScheduleValue}
            onChange={(e) => {
              setScheduledAt(e.target.value)
              setScheduled(false)
            }}
            className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
          />
          <button
            onClick={handleSchedule}
            disabled={scheduling || isOverLimit || !content.trim() || !scheduledAt}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold transition-all active:scale-95 shrink-0"
          >
            {scheduling ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> {t('gen.editor.scheduling')}
              </>
            ) : scheduled ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" /> {t('gen.editor.scheduleSuccess')}
              </>
            ) : (
              <>
                <CalendarClock className="w-3.5 h-3.5" /> {t('gen.editor.scheduleButton')}
              </>
            )}
          </button>
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
        <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono-custom">
          {published ? (
            <span className="text-emerald-600 dark:text-emerald-450 flex items-center gap-1.5 font-semibold">
              <CheckCircle2 className="w-4 h-4" /> {language === 'jp' ? 'Threadsへの投稿が完了しました！' : 'Published to Threads successfully!'}
            </span>
          ) : saved ? (
            <span className="text-emerald-600 dark:text-emerald-450 flex items-center gap-1.5 font-semibold">
              <CheckCircle2 className="w-4 h-4" /> {t('gen.editor.saveSuccess')}
            </span>
          ) : (
            language === 'jp' ? 'Threads API 有効' : 'Threads API Active'
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {onSave && (
            <button
              onClick={handleSave}
              disabled={saving || !content.trim()}
              className="flex items-center gap-2 px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-xs font-bold transition-all active:scale-95"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> {t('gen.editor.saving')}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> {t('gen.editor.save')}
                </>
              )}
            </button>
          )}

          <button
            onClick={handlePublish}
            disabled={publishing || isOverLimit || !content.trim()}
            className="flex items-center gap-2 px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md animate-fade-in"
          >
            {publishing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> {language === 'jp' ? '投稿中...' : 'Publishing...'}
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> {language === 'jp' ? 'Threadsに投稿' : 'Publish to Threads'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
