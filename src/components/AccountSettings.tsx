'use client'

import React, { useState } from 'react'
import { User, Key, AlertCircle, CheckCircle, Camera, Check, Eye, EyeOff, Sparkles, ExternalLink } from 'lucide-react'
import { updateAccountProfile, changeUserPassword } from '@/app/actions/profile'
import { getThreadsAuthUrl, disconnectThreads } from '@/app/actions/threads'
import { useLanguage } from './LanguageContext'
import { translateMessage } from '@/lib/errorTranslations'

// Default fallback avatar
const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'

interface AccountSettingsProps {
  initialDisplayName?: string
  initialAvatarUrl?: string
  initialEmail?: string
  isThreadsUser?: boolean
  threadsConnected?: boolean
  threadsUsername?: string
  threadsDisplayName?: string
  threadsAvatarUrl?: string
  threadsLoading?: boolean
  threadsExpiresAt?: string
}

export function AccountSettings({
  initialDisplayName = 'Content Creator',
  initialAvatarUrl = DEFAULT_AVATAR,
  initialEmail = 'creator@threadcraft.ai',
  isThreadsUser = false,
  threadsConnected = false,
  threadsUsername = '',
  threadsDisplayName = '',
  threadsAvatarUrl = '',
  threadsLoading = false,
  threadsExpiresAt = '',
}: AccountSettingsProps) {
  const { t, language } = useLanguage()
  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null)
  const [profileSaving, setProfileSaving] = useState(false)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [pwdError, setPwdError] = useState<string | null>(null)
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null)
  const [pwdSaving, setPwdSaving] = useState(false)

  // Threads connection states
  const [threadsConnecting, setThreadsConnecting] = useState(false)
  const [threadsError, setThreadsError] = useState<string | null>(null)
  const [threadsSuccess, setThreadsSuccess] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(threadsConnected)
  const [connUsername, setConnUsername] = useState(threadsUsername)
  const [connDisplayName, setConnDisplayName] = useState(threadsDisplayName)
  const [connAvatarUrl, setConnAvatarUrl] = useState(threadsAvatarUrl)

  const [showDisconnectModal, setShowDisconnectModal] = useState(false)

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setProfileError(null)
    setProfileSuccess(null)
    setProfileSaving(true)

    const formData = new FormData()
    formData.append('displayName', displayName)
    formData.append('avatarUrl', avatarUrl)

    try {
      const result = await updateAccountProfile(formData)
      if (result?.error) {
        setProfileError(translateMessage(result.error, language))
      } else {
        setProfileSuccess(t('settings.saved'))
      }
    } catch (err: any) {
      setProfileError(translateMessage(err.message, language) || (language === 'jp' ? '予期しないエラーが発生しました。' : 'An unexpected error occurred.'))
    } finally {
      setProfileSaving(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setPwdError(null)
    setPwdSuccess(null)
    setPwdSaving(true)

    const formData = new FormData()
    formData.append('password', password)
    formData.append('confirmPassword', confirmPassword)

    try {
      const result = await changeUserPassword(formData)
      if (result?.error) {
        setPwdError(translateMessage(result.error, language))
      } else {
        setPwdSuccess(t('settings.pwd.changed'))
        setPassword('')
        setConfirmPassword('')
      }
    } catch (err: any) {
      setPwdError(translateMessage(err.message, language) || (language === 'jp' ? '予期しないエラーが発生しました。' : 'An unexpected error occurred.'))
    } finally {
      setPwdSaving(false)
    }
  }

  const handleConnectThreads = async () => {
    setThreadsError(null)
    setThreadsSuccess(null)
    setThreadsConnecting(true)

    if (isConnected) {
      // Disconnect
      try {
        const result = await disconnectThreads()
        if (result?.error) {
          setThreadsError(translateMessage(result.error, language))
        } else {
          // Clear local storage AI data
          localStorage.removeItem('threadcraft_profile')
          localStorage.removeItem('threadcraft_setup_complete')

          setIsConnected(false)
          setConnUsername('')
          setConnDisplayName('')
          setConnAvatarUrl('')
          setThreadsSuccess(language === 'jp' ? 'Threadsアカウントの連携を解除しました！蓄積されたAIペルソナデータはすべて削除されました。' : 'Threads account unlinked successfully! All AI profile data has been deleted.')
          
          setTimeout(() => {
            window.location.reload()
          }, 1500)
        }
      } catch (err: any) {
        setThreadsError(translateMessage(err.message, language) || (language === 'jp' ? '連携解除中にエラーが発生しました。' : 'An error occurred during disconnect.'))
      } finally {
        setThreadsConnecting(false)
      }
    } else {
      // Connect / Link — redirect to Threads OAuth
      try {
        const result = await getThreadsAuthUrl()
        if (result?.error) {
          setThreadsError(translateMessage(result.error, language))
          setThreadsConnecting(false)
        } else if (result?.url) {
          window.location.href = result.url
        }
      } catch (err: any) {
        setThreadsError(translateMessage(err.message, language) || (language === 'jp' ? '連携処理の開始中にエラーが発生しました。' : 'An error occurred triggering OAuth.'))
        setThreadsConnecting(false)
      }
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fade-in px-2 md:px-0">
      {/* Tab Header Banner */}
      <div className="glass-panel p-4 md:p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-orange-600" />
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{t('settings.title')}</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono-custom font-medium">
              {t('settings.subtitle')}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Card */}
        <div className="glass-panel p-5 md:p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Camera className="w-4 h-4 text-orange-600" /> {t('settings.public')}
            </h3>

            {profileError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5 animate-fade-in min-w-0">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-mono-custom break-all flex-1">{profileError}</span>
              </div>
            )}

            {profileSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2.5 animate-fade-in min-w-0">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="font-mono-custom break-all flex-1">{profileSuccess}</span>
              </div>
            )}

            {/* Read-Only Profile Photo */}
            <div className="flex items-center gap-4 pb-2">
              <img
                src={avatarUrl}
                alt="Profile"
                className="w-16 h-16 rounded-full object-cover border-2 border-orange-600 shadow-md shrink-0 bg-zinc-100"
              />
              <div>
                <span className="text-[11px] font-bold text-zinc-500 block uppercase tracking-wider">{t('settings.photo')}</span>
                <p className="text-xs text-zinc-400">{t('settings.photo.subtitle')}</p>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4 pt-2">
              {/* Display Name Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block">{t('settings.displayName')}</label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all font-mono-custom"
                />
              </div>

              {/* Read Only Email / Username */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 block">
                  {isThreadsUser ? t('settings.username') : t('settings.email')}
                </label>
                <input
                  type={isThreadsUser ? 'text' : 'email'}
                  disabled
                  value={initialEmail}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-xs text-zinc-400 dark:text-zinc-505 font-mono-custom select-none cursor-not-allowed"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={profileSaving || !displayName.trim()}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md shadow-orange-600/25 transition-all active:scale-95 cursor-pointer font-sans-custom"
                >
                  {profileSaving ? t('settings.saving') : t('settings.save')}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Password Card */}
        <div className="glass-panel p-5 md:p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Key className="w-4 h-4 text-orange-600" /> {t('settings.password')}
            </h3>

            {pwdError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5 animate-fade-in min-w-0">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-mono-custom break-all flex-1">{pwdError}</span>
              </div>
            )}

            {pwdSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2.5 animate-fade-in min-w-0">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="font-mono-custom break-all flex-1">{pwdSuccess}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              {/* New Password */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block">{t('settings.pwd.new')}</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 pr-10 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all font-mono-custom"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block">{t('settings.pwd.confirm')}</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 pr-10 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all font-mono-custom"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={pwdSaving || password.length < 6 || password !== confirmPassword}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md shadow-orange-600/25 transition-all active:scale-95 cursor-pointer font-sans-custom"
                >
                  {pwdSaving ? t('settings.pwd.changing') : t('settings.pwd.change')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Threads Connection Panel */}
      <div className="glass-panel p-5 md:p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-orange-600 animate-pulse" /> {t('settings.threads')}
        </h3>

        {threadsError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5 animate-fade-in min-w-0">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="font-mono-custom break-all flex-1">{threadsError}</span>
          </div>
        )}

        {threadsSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2.5 animate-fade-in min-w-0">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="font-mono-custom break-all flex-1">{threadsSuccess}</span>
          </div>
        )}
        
        {threadsLoading ? (
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 animate-pulse">
            <div className="flex items-center gap-3 w-full">
              <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-1/4" />
                <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
              </div>
            </div>
            <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded-xl w-32 shrink-0 hidden md:block" />
          </div>
        ) : (
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              {isConnected && connAvatarUrl ? (
                <img
                  src={connAvatarUrl}
                  alt={connDisplayName || connUsername}
                  className="w-10 h-10 rounded-full object-cover border-2 border-orange-200 dark:border-orange-800 shadow-sm shrink-0"
                />
              ) : (
              <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 border-2 border-zinc-300 dark:border-zinc-700 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-zinc-500" />
                </div>
              )}
              <div className="space-y-0.5">
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">
                {isConnected ? (connDisplayName || `@${connUsername}`) : t('settings.threads')}
              </span>
              <div className="flex items-center gap-2 flex-wrap text-xs text-zinc-500 dark:text-zinc-400 font-mono-custom">
                <span>
                  {isConnected 
                    ? (language === 'jp' ? `@${connUsername} · 連携中` : `@${connUsername} · Connected`)
                    : t('settings.threads.desc')}
                </span>
                {isConnected && (
                  <>
                    <span className="text-zinc-300 dark:text-zinc-700 select-none">|</span>
                    <a
                      href={`https://threads.net/@${connUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 transition-colors inline-flex items-center gap-0.5 text-[10px] font-bold"
                      title="View profile on Threads"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> {language === 'jp' ? 'プロフィールを表示' : 'View Profile'}
                    </a>
                  </>
                )}
              </div>
              {isConnected && threadsExpiresAt && (
                <span className="text-[10px] text-zinc-400 dark:text-zinc-505 font-mono-custom block mt-0.5">
                  {t('settings.threads.expires')} {threadsExpiresAt}
                </span>
              )}
            </div>
            </div>
            
            <button
              type="button"
              onClick={isConnected ? () => setShowDisconnectModal(true) : handleConnectThreads}
              disabled={threadsConnecting}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-md whitespace-nowrap font-sans-custom ${
                isConnected 
                  ? 'bg-zinc-200 dark:bg-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-zinc-700 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-rose-450 border border-transparent dark:border-zinc-700' 
                  : 'bg-black dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-100 shadow-zinc-950/20'
              }`}
            >
              {threadsConnecting 
                ? t('settings.threads.disconnecting') 
                : isConnected 
                  ? t('settings.threads.disconnect') 
                  : t('settings.threads.connect')}
            </button>
          </div>
        )}
      </div>

      {showDisconnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h4 className="text-base font-bold">{t('settings.threads.modal.title')}</h4>
            </div>
            
            <p className="text-xs text-zinc-600 dark:text-zinc-350 leading-relaxed font-mono-custom">
              {t('settings.threads.modal.desc')}
            </p>

            <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-xl p-3.5 flex gap-2.5 items-start">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="text-[10px] text-rose-800 dark:text-rose-300 font-bold leading-normal">
                {t('settings.threads.modal.warning')}
              </span>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDisconnectModal(false)}
                className="px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl text-xs font-semibold transition-all cursor-pointer border border-transparent dark:border-zinc-700 font-sans-custom"
              >
                {t('settings.threads.modal.cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDisconnectModal(false)
                  handleConnectThreads()
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-rose-600/25 transition-all active:scale-95 cursor-pointer font-sans-custom"
              >
                {t('settings.threads.modal.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
