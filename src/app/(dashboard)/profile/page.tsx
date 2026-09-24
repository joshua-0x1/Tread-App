'use client'

import React, { useState, useEffect } from 'react'
import { ProfileWorkspace, ProfileData } from '@/components/ProfileWorkspace'
import { getPersonaProfile, savePersonaProfile } from '@/app/actions/profile'
import { useLanguage } from '@/components/LanguageContext'

export default function ProfilePage() {
  const { language } = useLanguage()
  const [profile, setProfile] = useState<ProfileData | null>(null)

  // Load profile on client mount to prevent server hydration mismatches
  useEffect(() => {
    getPersonaProfile().then(setProfile)
  }, [])

  const handleSaveProfile = async (newProfile: ProfileData): Promise<{ error?: string }> => {
    const result = await savePersonaProfile(newProfile, language)
    if ('error' in result) {
      console.error('[Profile Page] Failed to save persona profile:', result.error)
      return { error: result.error }
    }
    if (result.extractionFailed) {
      console.warn('[Profile Page] Persona saved, but AI field extraction failed.')
    }
    setProfile(newProfile)
    return {}
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  return <ProfileWorkspace profile={profile} onSave={handleSaveProfile} />
}
