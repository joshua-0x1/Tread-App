'use server'

import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { searchThreadsByKeyword } from './threads'

interface GenerateParams {
  topic: string
  coreMessage: string
  referencePosts?: string
  discoveredReferencePosts?: { text: string; username: string }[]
  recentAttempts?: string[]
  recentAngles?: string[]
  authorPersona?: string
  personalityTraits?: string
  likesDislikes?: string
  values?: string
  lifestyle?: string
  dreams?: string
  outlookOnLife?: string
  targetAudience?: string
  preferredTone?: string
  writingStyleRules?: string
  language?: 'en' | 'jp'
}

function fallbackVariations(params: GenerateParams): string[] {
  if (params.language === 'jp') {
    return [
      `${params.topic.toUpperCase()} 🚀

${params.coreMessage ? params.coreMessage : '今日知っておくべき重要なインサイトはこちらです：'}

1. ノイズを排し、シグナルを最大化する。
2. 実証済みのパターンを自分自身の声に適応させる。
3. エンゲージメントを追跡して今後の投稿を改善する。

あなたの最大の学びは何ですか？ぜひ以下で教えてください。👇`,
      `知っていましたか？${params.topic}について、多くの人が見落としているポイントがあります。

${params.coreMessage ? params.coreMessage : ''}

これを実践するだけで、結果は大きく変わります。`,
      `${params.topic}について、率直に話しましょう。

${params.coreMessage ? params.coreMessage : ''}

あなたはどう思いますか？コメントで教えてください。`,
    ]
  }

  return [
    `${params.topic.toUpperCase()} 🚀

${params.coreMessage ? params.coreMessage : 'Here is the key insight you need to know today:'}

1. High signal over noise.
2. Adapt proven patterns to your authentic voice.
3. Track engagement to refine future posts.

What is your main takeaway? Let me know below. 👇`,
    `Unpopular opinion about ${params.topic}:

${params.coreMessage ? params.coreMessage : ''}

Most people get this wrong. Here's the fix.`,
    `Let's talk about ${params.topic}.

${params.coreMessage ? params.coreMessage : ''}

What's your take? Drop it below. 👇`,
  ]
}

interface PastPerformanceExample {
  topic: string | null
  generated_content: string | null
}

interface PastPerformanceExamples {
  proven: PastPerformanceExample[]
  avoid: PastPerformanceExample[]
  recentDrafts: PastPerformanceExample[]
}

// Pulls the user's own past posts already flagged by the real analytics sync
// (syncAnalyticsMetrics in posts.ts) so the prompt can emulate what worked and
// avoid repeating what didn't — no Threads API calls involved. Also pulls recently
// saved drafts, which have no engagement data to judge but still count as "already
// tried this" for anti-repetition purposes.
async function getPastPerformanceExamples(userId: string): Promise<PastPerformanceExamples> {
  try {
    const supabase = await createClient()

    const [provenResult, avoidResult, draftsResult] = await Promise.all([
      supabase
        .from('posts')
        .select('topic, generated_content')
        .eq('user_id', userId)
        .eq('status', 'published')
        .eq('structure_cloned', true)
        .order('published_at', { ascending: false })
        .limit(3),
      supabase
        .from('posts')
        .select('topic, generated_content')
        .eq('user_id', userId)
        .eq('status', 'published')
        .eq('marked_for_restart', true)
        .order('published_at', { ascending: false })
        .limit(2),
      supabase
        .from('posts')
        .select('topic, generated_content')
        .eq('user_id', userId)
        .eq('status', 'draft')
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    return {
      proven: provenResult.data || [],
      avoid: avoidResult.data || [],
      recentDrafts: draftsResult.data || [],
    }
  } catch (error) {
    console.error('[Generate Action] Failed to fetch past performance examples:', error)
    return { proven: [], avoid: [], recentDrafts: [] }
  }
}

// Threads' /keyword_search matches literal keywords, not full descriptive phrases — a
// topic like "Debunking Test-Driven Development (TDD)" needs to become "TDD" or similar
// to find anything. Returns several ranked candidate keywords (most literal/specific
// first) so the caller can try more than one angle; falls back to [topic] (today's
// single-attempt behavior) if no API key is configured or the call fails.
export async function getSearchKeywordCandidates(topic: string, language?: 'en' | 'jp'): Promise<string[]> {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY

  if (!apiKey || apiKey === 'your-openai-api-key-here' || apiKey === 'your-openrouter-api-key-here') {
    return [topic]
  }

  const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: apiKey,
    defaultHeaders: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      'X-OpenRouter-Title': 'LETTER COOK',
    },
  })

  const systemPrompt = `Suggest 3-5 short, literal search keywords or phrases (1-3 words each) for the given Threads post topic, suitable for a keyword-search API that matches literal text in posts — not semantic/descriptive titles.

Rank them from most specific/literal to broadest, e.g. a well-known acronym or proper noun first (e.g. "TDD"), then the full term (e.g. "test-driven development"), then a broader related category (e.g. "software testing"). Do not include filler words like "Debunking", "The Power of", "Getting Your First", "誤解と真実", etc. Keep them distinct from each other, not near-duplicates.

${language === 'jp' ? 'Respond in Japanese (日本語).' : 'Respond in English.'}

RESPONSE FORMAT: Respond with ONLY a JSON object of the exact shape {"keywords": ["...", "...", "..."]}. No other text, no markdown code fences.`

  try {
    const response = await openai.chat.completions.create({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: topic },
      ],
      temperature: 0.4,
      max_tokens: 150,
      response_format: { type: 'json_object' },
    })

    const raw = response.choices[0]?.message?.content?.trim() || ''
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed?.keywords)) {
      const keywords = parsed.keywords.filter((k: unknown): k is string => typeof k === 'string' && k.trim().length > 0).map((k: string) => k.trim())
      if (keywords.length > 0) return keywords
    }
  } catch (error) {
    console.error('[Generate Action] getSearchKeywordCandidates failed, falling back to raw topic:', error)
  }

  return [topic]
}

// Real Threads post discovery for ONE keyword, via the /keyword_search API on behalf of
// the current user's connected Threads account. Returns { error } (never throws) if the
// account isn't connected, the token lacks threads_keyword_search, or the call fails —
// callers must treat that as "no discovered posts" and continue generation regardless.
// Intended to be called once per candidate from getSearchKeywordCandidates.
export async function searchThreadsForKeyword(keyword: string): Promise<{ posts: { text: string; permalink: string; username: string }[] } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data: account } = await supabase
    .from('social_accounts')
    .select('access_token')
    .eq('user_id', user.id)
    .eq('platform', 'threads')
    .maybeSingle()

  if (!account?.access_token) {
    return { error: 'Threads account is not linked.' }
  }

  const result = await searchThreadsByKeyword(account.access_token, keyword)

  if ('error' in result) {
    return { error: result.error }
  }

  return { posts: result.posts.map((p) => ({ text: p.text, permalink: p.permalink, username: p.username })) }
}

export async function generateThreadsPost(params: GenerateParams): Promise<{ variations: string[]; anglesUsed: string[] } | { error: string }> {
  const resolvedReferences = params.referencePosts

  const {
    data: { user },
  } = await (await createClient()).auth.getUser()
  const pastPerformance = user ? await getPastPerformanceExamples(user.id) : { proven: [], avoid: [], recentDrafts: [] }

  const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY

  if (!apiKey || apiKey === 'your-openai-api-key-here' || apiKey === 'your-openrouter-api-key-here') {
    return { variations: fallbackVariations(params), anglesUsed: [] }
  }

  const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: apiKey,
    defaultHeaders: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      'X-OpenRouter-Title': 'LETTER COOK',
    },
  })

  // Have real structure to mirror (pasted reference text and/or auto-discovered posts)?
  // Forcing unrelated canned angles (contrarian claim, listicle, etc.) directly
  // contradicts "mirror the reference's structure" when the reference doesn't fit that
  // angle — so skip angle-forcing entirely and vary within the reference's own pattern
  // instead. Angle-forcing only kicks in when there's no structure to mirror.
  const hasReferenceMaterial = Boolean(
    resolvedReferences || (params.discoveredReferencePosts && params.discoveredReferencePosts.length > 0)
  )

  let angleInstruction: string
  let anglesUsed: string[] = []
  if (hasReferenceMaterial) {
    angleInstruction = `The three posts MUST reproduce the EXACT structural/rhetorical pattern of the reference material below — not just its general vibe or tone. Before writing, break the reference down into: (1) its opening formula (e.g. a specific time/context hook, a bold claim, a direct question), (2) any rhetorical device it uses and how many times (e.g. a "not because X, not because Y, but because Z" negation-then-reveal contrast — note it uses exactly two negations before the reveal, not one, not three), and (3) its closing style (e.g. a one-line elaboration, a call to action). Every one of the three variations MUST reuse that same opening formula, the same rhetorical device with the same repetition count and order, and the same closing style — only the specific words, reasons, and topic details should change. The three variations must differ from EACH OTHER only in wording, specific reasons, and emphasis — never in the underlying structure or rhetorical device. If a variation would require abandoning the reference's structure to sound natural, keep the structure anyway — matching it is the priority.`
  } else {
    // Force structural variety instead of leaving it to chance — assign each variation
    // a specific required angle rather than just suggesting "be different."
    const ANGLE_POOL = [
      'a bold, contrarian claim that challenges conventional wisdom',
      'a personal story or anecdote',
      'a numbered listicle/framework breakdown',
      'a myth vs. reality comparison',
      'a direct question posed to the reader',
      'a surprising stat or fact-led hook',
      'a "here is what nobody tells you about X" reveal',
      'a before/after or mistake-then-fix narrative',
      'a "day in the life" or behind-the-scenes glimpse',
      'a bold prediction about where things are headed',
      'a common-mistake breakdown (what most people get wrong)',
      'a step-by-step how-to walkthrough',
    ]
    // Exclude angles used in recent generations (client-supplied, this-session only) so
    // back-to-back generations don't keep landing on the same angle — fall back to the
    // full pool if exclusion would leave fewer than 3 to pick from.
    const excludedAngles = new Set(params.recentAngles || [])
    const availablePool = ANGLE_POOL.filter((a) => !excludedAngles.has(a))
    const effectivePool = availablePool.length >= 3 ? availablePool : ANGLE_POOL

    const shuffledAngles = [...effectivePool].sort(() => Math.random() - 0.5)
    const [angle1, angle2, angle3] = shuffledAngles
    anglesUsed = [angle1, angle2, angle3]
    angleInstruction = `The three posts MUST take genuinely different angles — do not just reword the same post three times. Follow these required angles exactly:
- Variation 1 MUST open with: ${angle1}
- Variation 2 MUST open with: ${angle2}
- Variation 3 MUST open with: ${angle3}`
  }

  // Anti-repetition memory: recently saved drafts (cross-session, DB) plus this-session's
  // prior attempts (client-supplied, not yet saved) — neither is a performance signal,
  // just "already tried this, don't repeat it."
  const recentlyGenerated = [
    ...pastPerformance.recentDrafts.map((p) => p.generated_content).filter((c): c is string => !!c),
    ...(params.recentAttempts || []),
  ].slice(0, 6)

  const systemPrompt = `You are a high-performing social media content creator specializing in Threads posts.
Your goal is to write THREE single-text Threads posts (each under 500 characters) that achieve maximum engagement.

${angleInstruction}
${
  recentlyGenerated.length > 0
    ? `\nRECENTLY GENERATED POSTS FOR THIS AUTHOR (do not repeat their opening line, structure, or wording — write something meaningfully different from all of these):\n${recentlyGenerated.map((c) => `- ${c}`).join('\n')}\n`
    : ''
}
FRAMEWORK RULES TO FOLLOW:
- POCKET PERSONA & BACKGROUND (Casual background, personality notes, values, lifestyle, dreams, or life views):
${
  [
    params.authorPersona,
    params.personalityTraits,
    params.likesDislikes,
    params.values,
    params.lifestyle,
    params.dreams,
    params.outlookOnLife
  ].filter((s): s is string => !!s).map(s => s.trim()).filter(s => s.length > 0).join('\n\n') || 'N/A'
}
- TARGET AUDIENCE: ${params.targetAudience || 'Developers, creators, and indie hackers'}
- PREFERRED TONE: ${params.preferredTone || 'Conversational, authoritative, punchy'}
- WRITING STYLE RULES: ${params.writingStyleRules || 'Use clear line breaks, punchy hooks, and keep sentences short.'}
${
  pastPerformance.proven.length > 0
    ? `\nPROVEN HIGH-PERFORMING STRUCTURES (the author's own past posts that drove strong engagement — emulate their angle/structure/format, not the literal topic):\n${pastPerformance.proven.map((p) => `- ${p.generated_content}`).join('\n')}\n`
    : ''
}${
  pastPerformance.avoid.length > 0
    ? `\nPATTERNS TO AVOID (the author's own past posts that underperformed — do not repeat this angle/structure):\n${pastPerformance.avoid.map((p) => `- ${p.generated_content}`).join('\n')}\n`
    : ''
}${
  params.discoveredReferencePosts && params.discoveredReferencePosts.length > 0
    ? `\nREAL THREADS POSTS FOUND FOR THIS TOPIC (analyze their hook/structure/format and adapt it — do not copy verbatim):\n${params.discoveredReferencePosts.map((p) => `- ${p.text}`).join('\n')}\n`
    : ''
}
CRITICAL CONSTRAINTS:
- Each post strictly under 500 characters.
- Each must deliver the specified core message clearly${hasReferenceMaterial ? ', reusing the reference\'s exact structure and varying only wording, reasons, and emphasis' : ", from its own distinct angle"}.
- No spammy hashtags or cheesy engagement bait.
- Strictly write in PLAIN TEXT. Never use Markdown formatting (do NOT use **bold**, *italics*, _italics_, or headings). Threads does not support rich text or markdown formatting and will display them as raw characters.
- Write the final output posts in whichever language the Topic, Key Message, and Pocket Persona below are written in — detect it from that content, do not assume a language.

RESPONSE FORMAT: Respond with ONLY a JSON object of the exact shape {"variations": ["post one text", "post two text", "post three text"]}. No other text, no markdown code fences.
`

  const userPrompt = `
Topic: ${params.topic}
Key Message/Value to Deliver: ${params.coreMessage || 'N/A'}
${resolvedReferences ? `Reference Posts (multiple posts, if present, are separated by a blank line) — reproduce their exact opening formula, rhetorical device (including how many times it repeats, e.g. how many negations before a reveal), and closing style. Match the mechanical pattern, not just the tone:\n${resolvedReferences}` : ''}

Generate three authentic, high-converting Threads single-text post variations now:
`

  try {
    const response = await openai.chat.completions.create({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 900,
      response_format: { type: 'json_object' },
    })

    const raw = response.choices[0]?.message?.content?.trim() || ''
    const variations = parseVariations(raw)

    if (variations.length === 0) {
      console.error('[Generate Action] Could not parse variations from model response:', raw)
      return { error: 'Failed to parse AI-generated variations. Please try again.' }
    }

    // Always surface exactly 3 (pad with fallback templates if the model returned fewer)
    while (variations.length < 3) {
      variations.push(fallbackVariations(params)[variations.length] || fallbackVariations(params)[0])
    }

    return { variations: variations.slice(0, 3), anglesUsed }
  } catch (error: any) {
    console.error('OpenAI Generation Error:', error)
    return { error: error.message || 'AI generation failed. Please try again.' }
  }
}

function parseVariations(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed?.variations)) {
      return parsed.variations.filter((v: unknown): v is string => typeof v === 'string' && v.trim().length > 0)
    }
  } catch {
    // Fall through to regex extraction below
  }

  // Fallback: try to extract a JSON object embedded in extra prose/markdown fences
  const match = raw.match(/\{[\s\S]*\}/)
  if (match) {
    try {
      const parsed = JSON.parse(match[0])
      if (Array.isArray(parsed?.variations)) {
        return parsed.variations.filter((v: unknown): v is string => typeof v === 'string' && v.trim().length > 0)
      }
    } catch {
      // Give up on structured parsing
    }
  }

  return []
}

interface SuggestPostIdeaParams {
  authorPersona?: string
  personalityTraits?: string
  likesDislikes?: string
  values?: string
  lifestyle?: string
  dreams?: string
  outlookOnLife?: string
  targetAudience?: string
  language?: 'en' | 'jp'
}

// Persona-aware "surprise me" idea generator for the Autofill button.
// Callers must fall back to their own static template on { error } (e.g. no API key) —
// this action intentionally returns no filler content of its own.
export async function suggestPostIdea(params: SuggestPostIdeaParams): Promise<{ topic: string; coreMessage: string } | { error: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY

  if (!apiKey || apiKey === 'your-openai-api-key-here' || apiKey === 'your-openrouter-api-key-here') {
    return { error: 'AI not configured' }
  }

  const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: apiKey,
    defaultHeaders: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      'X-OpenRouter-Title': 'LETTER COOK',
    },
  })

  const personaText = [
    params.authorPersona,
    params.personalityTraits,
    params.likesDislikes,
    params.values,
    params.lifestyle,
    params.dreams,
    params.outlookOnLife,
  ].filter((s): s is string => !!s).map(s => s.trim()).filter(s => s.length > 0).join('\n\n') || 'N/A'

  const systemPrompt = `You are a brainstorming assistant that suggests ONE fresh Threads post idea for a specific author, to fill in a "surprise me" button they will click repeatedly.

AUTHOR'S PERSONA & BACKGROUND:
${personaText}

TARGET AUDIENCE: ${params.targetAudience || 'General audience'}

Suggest a topic and core message that authentically fits THIS specific person's background, values, and interests above — not a generic content-marketing topic. Since this action gets triggered repeatedly, pick a genuinely different angle, sub-topic, or life/work facet each time (do not default to the most obvious topic every time).

${params.language === 'jp' ? 'Write the topic and coreMessage in Japanese (日本語).' : 'Write the topic and coreMessage in English.'}

RESPONSE FORMAT: Respond with ONLY a JSON object of the exact shape {"topic": "short topic phrase", "coreMessage": "one or two sentence core message/value to deliver"}. No other text, no markdown code fences.`

  try {
    const response = await openai.chat.completions.create({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'system', content: systemPrompt }],
      temperature: 1.0,
      max_tokens: 300,
      response_format: { type: 'json_object' },
    })

    const raw = response.choices[0]?.message?.content?.trim() || ''
    const idea = parsePostIdea(raw)

    if (!idea) {
      console.error('[Generate Action] Could not parse post idea from model response:', raw)
      return { error: 'Failed to parse AI-generated idea.' }
    }

    return idea
  } catch (error: any) {
    console.error('[Generate Action] suggestPostIdea failed:', error)
    return { error: error.message || 'AI idea generation failed.' }
  }
}

function parsePostIdea(raw: string): { topic: string; coreMessage: string } | null {
  const tryParse = (text: string): { topic: string; coreMessage: string } | null => {
    try {
      const parsed = JSON.parse(text)
      if (typeof parsed?.topic === 'string' && parsed.topic.trim() && typeof parsed?.coreMessage === 'string') {
        return { topic: parsed.topic.trim(), coreMessage: parsed.coreMessage.trim() }
      }
    } catch {
      // Fall through
    }
    return null
  }

  const direct = tryParse(raw)
  if (direct) return direct

  const match = raw.match(/\{[\s\S]*\}/)
  if (match) return tryParse(match[0])

  return null
}

