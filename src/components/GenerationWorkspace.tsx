'use client'

import React, { useState, useEffect } from 'react'
import { Sparkles, MessageSquare, Lightbulb, Search, Loader2, CheckCircle2, ArrowRight, FileText, PenSquare } from 'lucide-react'
import { ProfileData } from './ProfileWorkspace'
import { PostEditor } from './PostEditor'
import { generateThreadsPost, suggestPostIdea, getSearchKeywordCandidates, searchThreadsForKeyword } from '@/app/actions/generate'
import { publishToThreadsApi, checkThreadsConnection } from '@/app/actions/threads'
import { saveDraftPost, scheduleNewPost } from '@/app/actions/posts'
import { useLanguage } from './LanguageContext'
import { translateMessage } from '@/lib/errorTranslations'

interface GenerationWorkspaceProps {
  profile: ProfileData
  onPostCreated: (post: {
    topic: string
    topicTag?: string
    coreMessage: string
    referencePosts: string
    generatedContent: string
    status: string
    platformPostId?: string
    platformPostUrl?: string
  }) => void | Promise<void>
}

type StepState = 'idle' | 'searching' | 'analyzing' | 'synthesizing' | 'drafting' | 'completed'

const TEMPLATES_JP = {
  developer: [
    {
      topic: 'テスト駆動開発（TDD）の誤解と真実',
      core: 'TDDは単にバグを減らすための手法ではなく、より良いソフトウェアの「設計ツール」である。'
    },
    {
      topic: '技術的負債の戦略的返済',
      core: 'すべての負債をすぐに返済する必要はない。顧客価値を生む機能領域の負債にフォーカスして優先的に返済すべき。'
    },
    {
      topic: 'シニアエンジニアの意思決定',
      core: '最も優れたコードは、書かれなかったコードである。複雑なシステムを作るより、シンプルなアプローチで問題を回避する方が賢明。'
    }
  ],
  solopreneur: [
    {
      topic: '1人ビジネスのレバレッジ設計',
      core: '労働時間を増やすのではなく、ソフトウェアと自動化システムを構築して自分のクローンを作るべき。'
    },
    {
      topic: '公開開発（Build in Public）の集客力',
      core: '完璧な状態でリリースするより、開発プロセスや失敗を共有する方が信頼性の高いコミュニティを構築できる。'
    },
    {
      topic: 'SaaSプロダクトの初期トラクション',
      core: '初期ユーザー10人を集めるには、広告ではなく個別のDMや手動のオンボーディングが最も効果的。'
    }
  ],
  productivity: [
    {
      topic: '毎日1つの小さな自動化が人生を変える理由',
      core: '1日5分の手作業を自動化すると、年間で丸3日分の自由時間が手に入る。自動化は時間の福利効果を生む。'
    },
    {
      topic: '非同期ワークフローの極意',
      core: 'チャットに即レスするのをやめよう。まとまった集中ブロックを確保し、決まった時間にまとめて返信する方が生産的。'
    },
    {
      topic: '断片的な14時間作業 vs 4時間のディープフォーカス',
      core: '通知をすべて切り、1つのタスクに超集中する4時間は、マルチタスクをする14時間よりも圧倒的に高い成果を生む。'
    }
  ],
  general: [
    {
      topic: 'AI時代に必要なサバイバルスキル',
      core: 'AIの使い方自体よりも、解決すべき「正しい問題」を見つける課題発見能力こそが最も重要なスキルになる。'
    },
    {
      topic: '時間対効果の最大化',
      core: 'すべてをやろうとしない。最も重要なレバレッジポイントである20%のタスクにリソースの80%を注ぎ込むべき。'
    }
  ]
}

const TEMPLATES_EN = {
  developer: [
    {
      topic: 'Debunking Test-Driven Development (TDD)',
      core: 'TDD is not just a bug-reducing testing method, it is ultimately a software design tool.'
    },
    {
      topic: 'Managing Technical Debt Strategy',
      core: 'Don\'t rush to refactor everything. Focus on repaying debt in modules that directly impact user value creation.'
    },
    {
      topic: 'Senior Engineer Decision Frameworks',
      core: 'The best code is the code you didn\'t write. Simplicity wins over complex over-engineering every single time.'
    }
  ],
  solopreneur: [
    {
      topic: 'Leverage for Solopreneurs',
      core: 'Stop trading hours for dollars. Build software assets and automated systems that scale your output while you sleep.'
    },
    {
      topic: 'The Power of Build in Public',
      core: 'Sharing failures and code drafts creates a much stronger community than launching a polished product out of nowhere.'
    },
    {
      topic: 'Getting Your First 10 SaaS Users',
      core: 'Do things that don\'t scale. Send manual DMs and do custom onboarding calls instead of running paid ads.'
    }
  ],
  productivity: [
    {
      topic: 'The Compound Effect of Automation',
      core: 'Saving 5 minutes a day with a custom script buys you back 3 full days a year. Automation acts as compound interest for your time.'
    },
    {
      topic: 'Asynchronous Team Workflows',
      core: 'Stop instant messaging. Protect your focus blocks and reply to team chats in batch intervals to maximize output.'
    },
    {
      topic: '4 Hours of Deep Focus vs 14 Hours of Distraction',
      core: 'One singular deep work block with zero notifications produces more value than a fragmented, multi-tasking long day.'
    }
  ],
  general: [
    {
      topic: 'Survival Skills in the AI Era',
      core: 'The ability to identify the correct problem to solve is infinitely more valuable than knowing how to prompt AI.'
    },
    {
      topic: 'Maximizing Return on Time',
      core: 'Stop doing everything. Focus 80% of your energy on the top 20% high-leverage tasks that move the needle.'
    }
  ]
}

export function GenerationWorkspace({ profile, onPostCreated }: GenerationWorkspaceProps) {
  const { t, language } = useLanguage()
  const [topic, setTopic] = useState('')
  const [topicTag, setTopicTag] = useState('')
  const [coreMessage, setCoreMessage] = useState('')
  const [referencePosts, setReferencePosts] = useState('')
  const [generationStep, setGenerationStep] = useState<StepState>('idle')
  const [variations, setVariations] = useState<string[] | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [savedIndices, setSavedIndices] = useState<number[]>([])
  const [savingIndex, setSavingIndex] = useState<number | null>(null)
  const [threadsAccount, setThreadsAccount] = useState<{ username: string; avatarUrl: string } | null>(null)
  const [autofilling, setAutofilling] = useState(false)
  const [discoveredPosts, setDiscoveredPosts] = useState<{ text: string; permalink: string; username: string }[]>([])
  const [discoverySearched, setDiscoverySearched] = useState(false)
  const [discoveryError, setDiscoveryError] = useState<string | null>(null)
  const [searchKeywordsTried, setSearchKeywordsTried] = useState<string[]>([])
  const [recentAttempts, setRecentAttempts] = useState<string[]>([])
  const [recentAngles, setRecentAngles] = useState<string[]>([])

  useEffect(() => {
    async function loadThreadsConnection() {
      const conn = await checkThreadsConnection()
      if (conn && conn.connected && conn.username) {
        setThreadsAccount({
          username: conn.username,
          avatarUrl: conn.avatarUrl || '',
        })
      }
    }
    loadThreadsConnection()
  }, [])

  // Safety-net fallback for when the AI idea generator has no API key configured
  // or fails — keeps today's exact behavior rather than leaving the form empty.
  const applyFallbackTemplate = () => {
    const textToAnalyze = `${profile?.authorPersona || ''} ${profile?.targetAudience || ''} ${profile?.writingStyleRules || ''} ${profile?.personalityTraits || ''}`.toLowerCase()

    let category: 'developer' | 'solopreneur' | 'productivity' | 'general' = 'general'

    const devKeywords = ['dev', 'code', 'soft', 'engineer', 'tech', 'build', 'saas', '開発', 'エンジニア', 'プログラマ', '技術', '実装']
    const bizKeywords = ['solopreneur', 'business', 'startup', 'founder', 'marketing', 'creator', '起業', 'ビジネス', '起業家', '創業者', 'マーケ']
    const prodKeywords = ['productivity', 'time', 'autom', 'async', 'focus', '生産性', '時間', '自動化', '非同期', '集中']

    const matchesDev = devKeywords.filter(kw => textToAnalyze.includes(kw)).length
    const matchesBiz = bizKeywords.filter(kw => textToAnalyze.includes(kw)).length
    const matchesProd = prodKeywords.filter(kw => textToAnalyze.includes(kw)).length

    const maxMatches = Math.max(matchesDev, matchesBiz, matchesProd)

    if (maxMatches > 0) {
      if (maxMatches === matchesDev) category = 'developer'
      else if (maxMatches === matchesBiz) category = 'solopreneur'
      else if (maxMatches === matchesProd) category = 'productivity'
    }

    const list = language === 'jp' ? TEMPLATES_JP[category] : TEMPLATES_EN[category]
    const randomIdx = Math.floor(Math.random() * list.length)
    const selected = list[randomIdx]

    setTopic(selected.topic)
    setCoreMessage(selected.core)
  }

  const handleAutoFill = async () => {
    setAutofilling(true)
    try {
      const result = await suggestPostIdea({
        authorPersona: profile?.authorPersona,
        personalityTraits: profile?.personalityTraits,
        likesDislikes: profile?.likesDislikes,
        values: profile?.values,
        lifestyle: profile?.lifestyle,
        dreams: profile?.dreams,
        outlookOnLife: profile?.outlookOnLife,
        targetAudience: profile?.targetAudience,
        language,
      })

      if ('error' in result) {
        applyFallbackTemplate()
      } else {
        setTopic(result.topic)
        setCoreMessage(result.coreMessage)
      }
    } catch (err) {
      console.error('[GenerationWorkspace] suggestPostIdea failed:', err)
      applyFallbackTemplate()
    }

    // Set mock reference pattern structures for pattern matching
    setReferencePosts(
      language === 'jp'
        ? `【参考フック例】\n思わず目が留まる印象的な1行目のフック（書き出し）\n\n【構成のポイント】\n・具体的かつ実践的なメリットや事実を示す箇条書きポイント1\n・再現性の高い行動や数値を交えた箇条書きポイント2\n\n【結び】\n簡潔なまとめ、または読み手への問いかけやアクションの喚起。`
        : `[Engaging Hook Example]\nAn attention-grabbing first line to hook readers instantly.\n\n[Structural Points]\n- Actionable insight or concrete benefit point 1\n- Measurable metric or proof of concept point 2\n\n[Call to Action]\nSimple concluding takeaway or conversational question.`
    )

    setAutofilling(false)
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!topic.trim()) return

    setVariations(null)
    setSelectedIndex(null)
    setSavedIndices([])
    setDiscoveredPosts([])
    setDiscoveryError(null)
    setDiscoverySearched(false)
    setSearchKeywordsTried([])

    // Step 1: Searching Threads for real reference posts on this topic.
    // Tries several AI-suggested keyword angles in sequence (not parallel, so the UI
    // can show live progress between calls), stopping once enough posts are found or
    // a real time budget is spent — this is genuine work, not a padded animation.
    setGenerationStep('searching')
    const SEARCH_POST_TARGET = 5
    const SEARCH_TIME_BUDGET_MS = 10000
    const searchStartedAt = Date.now()

    const keywords = await getSearchKeywordCandidates(topic, language)
    const accumulatedPosts: { text: string; permalink: string; username: string }[] = []
    const triedKeywords: string[] = []

    for (const keyword of keywords) {
      if (accumulatedPosts.length >= SEARCH_POST_TARGET) break
      if (Date.now() - searchStartedAt >= SEARCH_TIME_BUDGET_MS) break

      const searchResult = await searchThreadsForKeyword(keyword)
      triedKeywords.push(keyword)
      setSearchKeywordsTried([...triedKeywords])

      if ('error' in searchResult) {
        // Expected, already surfaced to the user via discoveryError below (e.g. Threads
        // account not linked) — not a bug, so don't log at `error` level.
        console.warn('[GenerationWorkspace] searchThreadsForKeyword unavailable:', searchResult.error)
        setDiscoveryError(searchResult.error)
        break // account-level error (not linked/authenticated) — more keywords won't help
      }

      accumulatedPosts.push(...searchResult.posts)
      setDiscoveredPosts([...accumulatedPosts])
    }

    setDiscoverySearched(true)

    // Step 2: Analyzing structures
    setGenerationStep('analyzing')
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Step 3: Synthesizing pocket
    setGenerationStep('synthesizing')
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Step 4: Drafting
    setGenerationStep('drafting')

    try {
      const result = await generateThreadsPost({
        topic,
        coreMessage,
        referencePosts: referencePosts.trim() || undefined,
        discoveredReferencePosts: accumulatedPosts,
        recentAttempts,
        recentAngles,
        authorPersona: profile.authorPersona,
        personalityTraits: profile.personalityTraits,
        likesDislikes: profile.likesDislikes,
        values: profile.values,
        lifestyle: profile.lifestyle,
        dreams: profile.dreams,
        outlookOnLife: profile.outlookOnLife,
        targetAudience: profile.targetAudience,
        preferredTone: profile.preferredTone,
        writingStyleRules: profile.writingStyleRules,
        language,
      })

      if ('error' in result) {
        console.error(result.error)
        setGenerationStep('idle')
        return
      }

      setVariations(result.variations)
      setRecentAttempts((prev) => [...result.variations, ...prev].slice(0, 9))
      if (result.anglesUsed.length > 0) {
        setRecentAngles((prev) => [...result.anglesUsed, ...prev].slice(0, 6))
      }
      setGenerationStep('completed')
    } catch (err) {
      console.error(err)
      setGenerationStep('idle')
    }
  }

  const handleSaveVariation = async (index: number) => {
    if (!variations) return
    setSavingIndex(index)
    try {
      const result = await saveDraftPost({
        topic,
        topicTag: topicTag || undefined,
        coreMessage,
        referencePosts: referencePosts.trim() || '[Auto-scraped via AI Theme Search]',
        generatedContent: variations[index],
      })
      if (!result?.error) {
        setSavedIndices((prev) => [...prev, index])
      }
    } finally {
      setSavingIndex(null)
    }
  }

  const handlePublish = async (finalContent: string, topicTag: string) => {
    const result = await publishToThreadsApi(finalContent, topicTag || undefined)
    if (result?.error) {
      return { error: result.error }
    }

    await onPostCreated({
      topic,
      topicTag: topicTag || undefined,
      coreMessage,
      referencePosts: referencePosts.trim() || '[Auto-scraped via AI Theme Search]',
      generatedContent: finalContent,
      status: 'published',
      platformPostId: result?.platformPostId,
      platformPostUrl: result?.permalinkUrl,
    })
    return { success: true }
  }

  const handleScheduleFromEditor = async (finalContent: string, scheduledAt: string, topicTag: string) => {
    const result = await scheduleNewPost(
      {
        topic,
        topicTag: topicTag || undefined,
        coreMessage,
        referencePosts: referencePosts.trim() || '[Auto-scraped via AI Theme Search]',
        generatedContent: finalContent,
      },
      scheduledAt
    )
    if (result?.error) {
      return { error: result.error }
    }
    return { success: true }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in px-2 md:px-0 pb-12">
      {/* Input Form */}
      {generationStep === 'idle' || generationStep === 'completed' ? (
        <div className="glass-panel p-4 md:p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 relative overflow-hidden">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
              <PenSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Let&apos;s Cooking</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono-custom">
                {t('gen.subtitle')}
              </p>
            </div>
          </div>

          <form onSubmit={handleGenerate} className="space-y-5">
            <div className="space-y-5">
              {/* Topic Theme */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-orange-700 dark:text-orange-400 flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5" />
                  {t('gen.theme')}
                </label>
                <input
                  type="text"
                  required
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                />
              </div>

              {/* Core Message / Value */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-orange-700 dark:text-orange-400 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  {t('gen.message')}
                </label>
                <textarea
                  rows={3}
                  value={coreMessage}
                  onChange={(e) => setCoreMessage(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all font-sans-custom leading-relaxed"
                />
              </div>

              {/* Reference Posts for Pattern Matching */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-orange-700 dark:text-orange-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  {t('gen.reference')}
                </label>
                <textarea
                  rows={6}
                  value={referencePosts}
                  onChange={(e) => setReferencePosts(e.target.value)}
                  placeholder={t('gen.reference.placeholder')}
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all font-sans-custom leading-relaxed"
                />
                {searchKeywordsTried.length > 0 && (
                  <span className="text-[9px] font-mono-custom text-zinc-400 dark:text-zinc-500">
                    {language === 'jp' ? '検索キーワード' : 'Searched'}: {searchKeywordsTried.map((k) => `"${k}"`).join(', ')}
                  </span>
                )}
                {discoveredPosts.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-1 animate-fade-in">
                    <span className="text-[10px] font-mono-custom font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                      <Search className="w-3 h-3" />
                      {language === 'jp'
                        ? `このトピックで実際のThreads投稿を${discoveredPosts.length}件発見しました`
                        : `Found ${discoveredPosts.length} real Threads posts on this topic`}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {discoveredPosts.map((post, idx) => (
                        <a
                          key={idx}
                          href={post.permalink || undefined}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-mono-custom text-orange-600 dark:text-orange-400 hover:underline"
                        >
                          @{post.username || 'unknown'}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {discoverySearched && discoveredPosts.length === 0 && (
                  <div className={`p-2.5 rounded-xl border text-[10px] font-mono-custom flex items-center gap-1.5 animate-fade-in ${
                    discoveryError
                      ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300'
                      : 'bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400'
                  }`}>
                    <Search className="w-3 h-3 shrink-0" />
                    {discoveryError
                      ? (language === 'jp' ? `Threads検索に失敗しました: ${translateMessage(discoveryError, language)}` : `Threads search failed: ${discoveryError}`)
                      : (language === 'jp' ? 'このトピックの投稿は見つかりませんでした。' : 'No matching posts found on Threads for this topic.')}
                  </div>
                )}
              </div>

              {/* Threads Community/Topic Tag */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-orange-700 dark:text-orange-400 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5" />
                  {t('gen.topicTag')}
                </label>
                <input
                  type="text"
                  value={topicTag}
                  onChange={(e) => setTopicTag(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                />
              </div>
            </div>

            {/* Persona Summary Status */}
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-xs font-mono-custom text-zinc-600 dark:text-zinc-400 flex flex-col md:flex-row justify-between gap-2">
              <span>
                {t('gen.activePocket')}: <strong className="text-orange-600 dark:text-orange-400">{t('gen.loaded')}</strong>
              </span>
              <span>
                {t('gen.audience')}: <strong className="text-orange-600 dark:text-orange-400">{profile.targetAudience ? profile.targetAudience.slice(0, 30) + '...' : 'General'}</strong>
              </span>
            </div>

            <div className="flex justify-end gap-3">
              {process.env.NEXT_PUBLIC_ENABLE_TEST_TOOLS === 'true' && (
                <button
                  type="button"
                  onClick={handleAutoFill}
                  disabled={autofilling}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-50 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-100 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
                >
                  {autofilling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '⚡'} {t('gen.autofill')}
                </button>
              )}
              <button
                type="submit"
                disabled={!topic.trim()}
                className="flex items-center gap-2 px-6 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-600/25 transition-all active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" /> {t('gen.loop')}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Multi-Stage Loading Pipeline Screen */
        <div className="glass-panel p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-center space-y-8 animate-fade-in max-w-lg mx-auto">
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {language === 'jp' ? 'AIデータ収集・リライトエンジン' : 'AI Scrape & Rewrite Engine'}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono-custom">
              {language === 'jp' ? '自動Threads投稿分析パイプライン実行中...' : 'Executing automated Threads analysis pipeline...'}
            </p>
          </div>

          <div className="space-y-4 max-w-sm mx-auto text-left">
            {/* Step 1 */}
            <div className="flex items-center gap-3">
              {generationStep === 'searching' ? (
                <Loader2 className="w-4 h-4 text-orange-600 animate-spin shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              )}
              <span className={`text-xs font-mono-custom ${generationStep === 'searching' ? 'text-orange-600 font-bold' : 'text-zinc-500 dark:text-zinc-400'}`}>
                {generationStep === 'searching' && searchKeywordsTried.length > 0
                  ? (language === 'jp'
                      ? `1. 検索中: "${searchKeywordsTried[searchKeywordsTried.length - 1]}"（${discoveredPosts.length}件発見）`
                      : `1. Searching "${searchKeywordsTried[searchKeywordsTried.length - 1]}"... (${discoveredPosts.length} found)`)
                  : (language === 'jp' ? '1. Threadsで類似の投稿を検索中...' : '1. Searching Threads for similar posts...')}
              </span>
            </div>

            {/* Step 2 */}
            <div className="flex items-center gap-3">
              {generationStep === 'searching' ? (
                <div className="w-4 h-4 rounded-full border border-zinc-300 dark:border-zinc-700 shrink-0" />
              ) : generationStep === 'analyzing' ? (
                <Loader2 className="w-4 h-4 text-orange-600 animate-spin shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              )}
              <span className={`text-xs font-mono-custom ${generationStep === 'analyzing' ? 'text-orange-600 font-bold' : 'text-zinc-500 dark:text-zinc-400'}`}>
                {language === 'jp' ? '2. エンゲージメントの高い投稿構造を分析中...' : '2. Analyzing top engagement structures...'}
              </span>
            </div>

            {/* Step 3 */}
            <div className="flex items-center gap-3">
              {['searching', 'analyzing'].includes(generationStep) ? (
                <div className="w-4 h-4 rounded-full border border-zinc-300 dark:border-zinc-700 shrink-0" />
              ) : generationStep === 'synthesizing' ? (
                <Loader2 className="w-4 h-4 text-orange-600 animate-spin shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              )}
              <span className={`text-xs font-mono-custom ${generationStep === 'synthesizing' ? 'text-orange-600 font-bold' : 'text-zinc-500 dark:text-zinc-400'}`}>
                {language === 'jp' ? '3. ペルソナとターゲット属性をインプット中...' : '3. Injecting Pocket Persona & Audience...'}
              </span>
            </div>

            {/* Step 4 */}
            <div className="flex items-center gap-3">
              {['searching', 'analyzing', 'synthesizing'].includes(generationStep) ? (
                <div className="w-4 h-4 rounded-full border border-zinc-300 dark:border-zinc-700 shrink-0" />
              ) : generationStep === 'drafting' ? (
                <Loader2 className="w-4 h-4 text-orange-600 animate-spin shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              )}
              <span className={`text-xs font-mono-custom ${generationStep === 'drafting' ? 'text-orange-600 font-bold' : 'text-zinc-500 dark:text-zinc-400'}`}>
                {language === 'jp' ? '4. パーソナライズされた下書きを作成中...' : '4. Generating personalized draft...'}
              </span>
            </div>
          </div>

          <div className="pt-2 flex justify-center">
            <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
          </div>
        </div>
      )}

      {/* Variation picker + Editor once completed */}
      {generationStep === 'completed' && variations && (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs text-emerald-600 font-mono-custom font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> {language === 'jp' ? 'AI生成パイプライン完了' : 'AI Generation Pipeline Complete'}
            </span>
            <button
              onClick={() => {
                setGenerationStep('idle')
                setVariations(null)
                setSelectedIndex(null)
                setSavedIndices([])
              }}
              className="text-xs text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100 font-mono-custom flex items-center gap-1 cursor-pointer"
            >
              {language === 'jp' ? '新しく作成する' : 'Start New Post'} <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="glass-panel p-4 md:p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{t('gen.variations.title')}</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono-custom">{t('gen.variations.subtitle')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {variations.map((variation, index) => {
                const isSelected = selectedIndex === index
                const isSaved = savedIndices.includes(index)
                const isSaving = savingIndex === index
                return (
                  <div
                    key={index}
                    className={`rounded-xl border p-3.5 space-y-3 flex flex-col transition-all ${
                      isSelected
                        ? 'border-orange-500 ring-2 ring-orange-500/20 bg-orange-50/40 dark:bg-orange-950/10'
                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950'
                    }`}
                  >
                    <p className="text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap break-words leading-relaxed font-sans-custom flex-1 min-h-[6rem]">
                      {variation}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedIndex(index)}
                        className={`flex-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-orange-600 text-white'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                        }`}
                      >
                        {isSelected ? t('gen.variations.selected') : t('gen.variations.useThis')}
                      </button>
                      <button
                        type="button"
                        disabled={isSaved || isSaving}
                        onClick={() => handleSaveVariation(index)}
                        className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                      >
                        {isSaved ? t('gen.variations.saved') : isSaving ? t('gen.variations.saving') : t('gen.variations.save')}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {selectedIndex !== null && (
            <PostEditor
              key={selectedIndex}
              initialContent={variations[selectedIndex]}
              topic={topic}
              coreMessage={coreMessage}
              initialTopicTag={topicTag}
              onPublish={handlePublish}
              onSchedule={handleScheduleFromEditor}
              threadsAccount={threadsAccount}
            />
          )}
        </div>
      )}
    </div>
  )
}
