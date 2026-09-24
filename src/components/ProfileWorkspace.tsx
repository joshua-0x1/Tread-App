'use client'

import React, { useState } from 'react'
import { FolderHeart, Sparkles, User, Heart, Compass, ShieldAlert, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'
import { useLanguage } from './LanguageContext'

export interface ProfileData {
  authorPersona: string
  personalityTraits: string
  likesDislikes: string
  values: string
  lifestyle: string
  dreams: string
  outlookOnLife: string
  targetAudience: string
  preferredTone: string
  writingStyleRules: string
}

interface ProfileWorkspaceProps {
  profile: ProfileData
  onSave: (data: ProfileData) => Promise<{ error?: string }>
}

const SAMPLE_JP_PROFILE: ProfileData = {
  authorPersona: `【自己紹介・経歴】
ソフトウェアと自動化に関する実践的な洞察を共有する、AIアーキテクト兼テック個人起業家（ソロプレナー）。

【性格・特徴】
几帳面、実用的、独自の視点を持つ、直接的でありながら会話的。

【好きなこと・嫌いなこと】
好き: クリーンなコード、深煎りコーヒー、非同期ワークフロー。嫌い: 長時間の会議、中身のない流行。

【将来の目標・夢】
ソフトウェア製品を月間経常収益（MRR）10,000ドルまでスケールさせ、完全リモートで旅をすること。

【ライフスタイル・価値観】
早朝のカフェでのワークスペース、非同期のデイリースケジュール、ビルド・イン・パブリック（公開開発）。`,
  personalityTraits: '',
  likesDislikes: '',
  values: '',
  lifestyle: '',
  dreams: '',
  outlookOnLife: '',
  targetAudience: 'Threadsで開発・構築をしているエンジニア、インディーハッカー、SaaS創業者。',
  preferredTone: '説得力がある、簡潔、洞察に満ちた、パンチのある表現',
  writingStyleRules: '明確な番号付きリストを使用する。フック（書き出し）は10字以内に抑える。重要な洞察は改行で区切る。',
}

const SAMPLE_EN_PROFILE: ProfileData = {
  authorPersona: `[Bio & Background]
AI Architect & Tech Solopreneur sharing actionable insights on software and automation.

[Personality & Traits]
Meticulous, pragmatic, contrarian, direct but conversational.

[Likes & Dislikes]
Likes: Clean code, deep coffee, async workflows. Dislikes: Long meetings, hype cycles.

[Goals & Dreams]
Scale software products to $10k MRR and travel fully remote.

[Values & Lifestyle]
Early morning coffee shop workspace, async daily schedule, building in public, automation leverage.`,
  personalityTraits: '',
  likesDislikes: '',
  values: '',
  lifestyle: '',
  dreams: '',
  outlookOnLife: '',
  targetAudience: 'Developers, indie hackers, and SaaS founders building on Threads.',
  preferredTone: 'Authoritative, concise, insightful, punchy',
  writingStyleRules: 'Use clear numbered lists. Keep hooks under 10 words. Separate key insights with line breaks.',
}

export function ProfileWorkspace({ profile, onSave }: ProfileWorkspaceProps) {
  const { t, language } = useLanguage()
  const [formData, setFormData] = useState<ProfileData>(profile)
  const [activeSubTab, setActiveSubTab] = useState<'pocket' | 'audience'>('pocket')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const handleAutofill = () => {
    const samples = language === 'jp' ? SAMPLE_JP_PROFILE : SAMPLE_EN_PROFILE
    setFormData(samples)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    setSaveError(null)

    try {
      const result = await onSave(formData)

      if (result.error) {
        setSaveError(result.error)
        return
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('[ProfileWorkspace] Save request failed:', err)
      setSaveError(
        language === 'jp'
          ? '保存に失敗しました。ネットワーク接続を確認して、もう一度お試しください。'
          : 'Save failed. Check your network connection and try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fade-in px-2 md:px-0">
      <div className="glass-panel p-4 md:p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Section Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900">
            <FolderHeart className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-bold text-zinc-900 dark:text-zinc-100">{t('profile.title')}</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono-custom">
              {t('profile.subtitle')}
            </p>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3 mb-6">
          <button
            onClick={() => setActiveSubTab('pocket')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'pocket'
                ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200/60 dark:border-orange-800/60 shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            {t('profile.tab.pocket')}
          </button>
          <button
            onClick={() => setActiveSubTab('audience')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'audience'
                ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200/60 dark:border-orange-800/60 shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            {t('profile.tab.audience')}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {activeSubTab === 'pocket' ? (
            <div className="space-y-5">
              {/* Single Broad Pocket Notes Field */}
              <div className="space-y-1.5 animate-fade-in">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-orange-600" />
                  {t('profile.bio')}
                </label>
                <textarea
                  rows={10}
                  value={formData.authorPersona}
                  onChange={(e) => setFormData({ ...formData, authorPersona: e.target.value })}
                  placeholder={t('profile.bio.placeholder')}
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all leading-relaxed font-sans-custom"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Target Audience Profile */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-orange-600" />
                  {t('profile.audience')}
                </label>
                <textarea
                  rows={3}
                  value={formData.targetAudience}
                  onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                  placeholder={t('profile.audience.placeholder')}
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Tone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t('profile.tone')}</label>
                  <input
                    type="text"
                    value={formData.preferredTone}
                    onChange={(e) => setFormData({ ...formData, preferredTone: e.target.value })}
                    placeholder={t('profile.tone.placeholder')}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all"
                  />
                </div>

                {/* Writing Rules */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{t('profile.constraints')}</label>
                  <input
                    type="text"
                    value={formData.writingStyleRules}
                    onChange={(e) => setFormData({ ...formData, writingStyleRules: e.target.value })}
                    placeholder={t('profile.constraints.placeholder')}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="flex justify-end items-center gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            {saveError && (
              <span className="text-xs text-rose-600 flex items-center gap-1.5 animate-fade-in font-mono-custom font-semibold">
                <AlertTriangle className="w-4 h-4" /> {saveError}
              </span>
            )}
            {saved && (
              <span className="text-xs text-emerald-600 flex items-center gap-1.5 animate-fade-in font-mono-custom font-semibold">
                <CheckCircle2 className="w-4 h-4" /> {t('profile.saved')}
              </span>
            )}
            <button
              type="button"
              onClick={handleAutofill}
              className="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer font-sans-custom"
            >
              <Sparkles className="w-3.5 h-3.5 text-orange-650 dark:text-orange-400 shrink-0" />
              {language === 'jp' ? 'サンプル自動入力' : 'Autofill Template'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md shadow-orange-600/25 transition-all active:scale-95 flex items-center gap-2 cursor-pointer font-sans-custom"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {t('profile.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
