'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, LogOut, RefreshCw } from 'lucide-react'
import { logout } from '@/app/actions/auth'
import { getAccountDetails } from '@/app/actions/profile'
import { useLanguage } from '@/components/LanguageContext'
import { BrandMark } from '@/components/BrandMark'

export default function PendingPage() {
  const router = useRouter()
  const { language } = useLanguage()
  const [checking, setChecking] = useState(false)
  const [isLoggedOut, setIsLoggedOut] = useState(false)

  const checkStatus = async () => {
    setChecking(true)
    try {
      const details = await getAccountDetails()
      if (details?.isApproved) {
        router.push('/')
        router.refresh()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setChecking(false)
    }
  }

  // Periodic polling for status changes
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const details = await getAccountDetails()
        if (details?.isApproved) {
          router.push('/')
          router.refresh()
        }
      } catch (err) {
        console.error(err)
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [router])

  const handleLogout = async () => {
    setIsLoggedOut(true)
    await logout()
  }

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] flex items-center justify-center p-4 md:p-8 font-sans-custom">
      <div className="w-full max-w-md glass-panel p-6 md:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl relative overflow-hidden text-center space-y-6 animate-fade-in">
        {/* Glow decoration */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="space-y-2">
          <BrandMark className="w-12 h-12 inline-flex mb-2" />
          <h1 className="font-bold text-xl tracking-wide text-zinc-900 dark:text-zinc-100">LETTER COOK</h1>
          <p className="text-[10px] text-zinc-450 dark:text-zinc-500 font-mono-custom uppercase tracking-widest">
            {language === 'jp' ? '自動承認ワークフロー' : 'Automated Approval Loop'}
          </p>
        </div>

        {/* Pending Card Status */}
        <div className="p-5 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-900/30 flex flex-col items-center gap-3.5">
          <Clock className="w-8 h-8 text-amber-500 animate-pulse" />
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-amber-800 dark:text-amber-400">
              {language === 'jp' ? '承認審査中' : 'Registration Pending Approval'}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-450 leading-relaxed font-mono-custom px-2">
              {language === 'jp' 
                ? 'あなたのアカウントは現在、管理者による承認待ちです。承認されると、自動的にダッシュボードへ遷移します。' 
                : 'Your registration is currently waiting for administrator approval. Once approved, you will automatically gain access.'}
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-3 pt-2">
          <button
            onClick={checkStatus}
            disabled={checking}
            className="w-full py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-600/25 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer font-sans-custom"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            {checking 
              ? (language === 'jp' ? 'ステータス確認中...' : 'Checking Status...') 
              : (language === 'jp' ? 'ステータスを再確認' : 'Re-check Status')}
          </button>

          <button
            onClick={handleLogout}
            disabled={isLoggedOut}
            className="w-full py-3 bg-zinc-100 dark:bg-zinc-900 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer font-sans-custom"
          >
            <LogOut className="w-4 h-4" />
            {isLoggedOut 
              ? (language === 'jp' ? 'ログアウト中...' : 'Signing Out...') 
              : (language === 'jp' ? 'ログアウト' : 'Sign Out')}
          </button>
        </div>
      </div>
    </div>
  )
}
