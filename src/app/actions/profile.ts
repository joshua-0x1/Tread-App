'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import OpenAI from 'openai'
import { ProfileData } from '@/components/ProfileWorkspace'
import { DEFAULT_PROFILE } from '@/lib/state'

export async function getAccountDetails() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  // Try to get richer profile from social_accounts (Threads OAuth users)
  const { data: social } = await supabase
    .from('social_accounts')
    .select('display_name, avatar_url, username')
    .eq('user_id', user.id)
    .eq('platform', 'threads')
    .maybeSingle()

  const displayName =
    social?.display_name ||
    user.user_metadata?.display_name ||
    user.email?.split('@')[0] ||
    'Content Creator'

  const avatarUrl =
    social?.avatar_url ||
    user.user_metadata?.avatar_url ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_approved')
    .eq('user_id', user.id)
    .maybeSingle()

  const isThreadsUser = user.email?.endsWith('@threads-auth.internal') ?? false

  return {
    email: isThreadsUser ? `@${social?.username || 'threads_user'}` : (user.email || ''),
    displayName,
    avatarUrl,
    isThreadsUser,
    role: profile?.role || 'user',
    isApproved: profile?.is_approved || false,
  }
}

export async function updateAccountProfile(formData: FormData) {
  const displayName = formData.get('displayName') as string
  const avatarUrl = formData.get('avatarUrl') as string

  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase.auth.updateUser({
    data: {
      display_name: displayName,
      avatar_url: avatarUrl,
    },
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/')
  return { success: 'Profile updated successfully!' }
}

export async function changeUserPassword(formData: FormData) {
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!password || !confirmPassword) {
    return { error: 'All password fields are required' }
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match' }
  }

  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters long' }
  }

  const supabase = await createClient()

  // Verify session is active and valid before updating password
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { error: 'Not authenticated or session expired' }
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: 'Password changed successfully!' }
}

// --- Pocket persona (persisted to user_profiles, replacing the old localStorage version) ---

type ExtractedPersonaFields = Pick<
  ProfileData,
  'personalityTraits' | 'likesDislikes' | 'values' | 'lifestyle' | 'dreams' | 'outlookOnLife'
>

async function extractPersonaFields(rawText: string, language: 'en' | 'jp'): Promise<ExtractedPersonaFields | null> {
  if (!rawText || !rawText.trim()) return null

  const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY
  if (!apiKey || apiKey === 'your-openai-api-key-here' || apiKey === 'your-openrouter-api-key-here') {
    return null
  }

  const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: apiKey,
    defaultHeaders: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      'X-OpenRouter-Title': 'LETTER COOK',
    },
  })

  const systemPrompt = `You are a persona-parsing assistant. Read the user's freeform "Pocket" notes about themselves and extract 6 distinct categories from it: personality traits, likes/dislikes, values, lifestyle, dreams/goals, and outlook on life.

Write each extracted field in ${language === 'jp' ? 'Japanese (日本語)' : 'English'}, using the user's own words/tone where possible. If a category isn't mentioned in the text, return an empty string for it — do not invent details.

RESPONSE FORMAT: Respond with ONLY a JSON object of the exact shape {"personalityTraits": "...", "likesDislikes": "...", "values": "...", "lifestyle": "...", "dreams": "...", "outlookOnLife": "..."}. No other text, no markdown code fences.`

  try {
    const response = await openai.chat.completions.create({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: rawText },
      ],
      temperature: 0.3,
      max_tokens: 700,
      response_format: { type: 'json_object' },
    })

    const raw = response.choices[0]?.message?.content?.trim() || ''
    return parseExtractedPersonaFields(raw)
  } catch (error) {
    console.error('[Profile Actions] Persona extraction failed:', error)
    return null
  }
}

function parseExtractedPersonaFields(raw: string): ExtractedPersonaFields | null {
  const tryParse = (text: string): ExtractedPersonaFields | null => {
    try {
      const parsed = JSON.parse(text)
      if (parsed && typeof parsed === 'object') {
        return {
          personalityTraits: typeof parsed.personalityTraits === 'string' ? parsed.personalityTraits : '',
          likesDislikes: typeof parsed.likesDislikes === 'string' ? parsed.likesDislikes : '',
          values: typeof parsed.values === 'string' ? parsed.values : '',
          lifestyle: typeof parsed.lifestyle === 'string' ? parsed.lifestyle : '',
          dreams: typeof parsed.dreams === 'string' ? parsed.dreams : '',
          outlookOnLife: typeof parsed.outlookOnLife === 'string' ? parsed.outlookOnLife : '',
        }
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

export async function getPersonaProfile(): Promise<ProfileData> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return DEFAULT_PROFILE

  const { data } = await supabase
    .from('user_profiles')
    .select('author_persona, target_audience, preferred_tone, writing_style_rules, personality_traits, likes_dislikes, values, lifestyle, dreams, outlook_on_life')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!data) return DEFAULT_PROFILE

  return {
    authorPersona: data.author_persona ?? DEFAULT_PROFILE.authorPersona,
    targetAudience: data.target_audience ?? DEFAULT_PROFILE.targetAudience,
    preferredTone: data.preferred_tone ?? DEFAULT_PROFILE.preferredTone,
    writingStyleRules: data.writing_style_rules ?? DEFAULT_PROFILE.writingStyleRules,
    personalityTraits: data.personality_traits ?? DEFAULT_PROFILE.personalityTraits,
    likesDislikes: data.likes_dislikes ?? DEFAULT_PROFILE.likesDislikes,
    values: data.values ?? DEFAULT_PROFILE.values,
    lifestyle: data.lifestyle ?? DEFAULT_PROFILE.lifestyle,
    dreams: data.dreams ?? DEFAULT_PROFILE.dreams,
    outlookOnLife: data.outlook_on_life ?? DEFAULT_PROFILE.outlookOnLife,
  }
}

export async function savePersonaProfile(
  data: ProfileData,
  language: 'en' | 'jp'
): Promise<{ error: string } | { success: true; extractionFailed?: true }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Not authenticated' }
  }

  const extracted = await extractPersonaFields(data.authorPersona, language)

  const { error } = await supabase
    .from('user_profiles')
    .upsert(
      {
        user_id: user.id,
        author_persona: data.authorPersona,
        target_audience: data.targetAudience,
        preferred_tone: data.preferredTone,
        writing_style_rules: data.writingStyleRules,
        ...(extracted
          ? {
              personality_traits: extracted.personalityTraits,
              likes_dislikes: extracted.likesDislikes,
              values: extracted.values,
              lifestyle: extracted.lifestyle,
              dreams: extracted.dreams,
              outlook_on_life: extracted.outlookOnLife,
            }
          : {}),
      },
      { onConflict: 'user_id' }
    )

  if (error) {
    console.error('[Profile Actions] Failed to save persona profile:', error)
    return { error: error.message }
  }

  revalidatePath('/profile')
  revalidatePath('/')

  return extracted ? { success: true } : { success: true, extractionFailed: true }
}
