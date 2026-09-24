'use client'

import React, { useState } from 'react'
import { updatePassword } from '@/app/actions/auth'
import { Lock, AlertCircle, CheckCircle2, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { useLanguage } from '@/components/LanguageContext'
import { BrandMark } from '@/components/BrandMark'
import { translateMessage } from '@/lib/errorTranslations'

export default function UpdatePasswordPage() {
  const { language } = useLanguage()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)

    try {
      const result = await updatePassword(formData)
      if (result?.error) {
        setError(translateMessage(result.error, language))
      } else if (result?.success) {
        setSuccess(true)
        // Redirect to home after a short delay
        setTimeout(() => {
          window.location.href = '/'
        }, 2000)
      }
    } catch (err: any) {
      setError(translateMessage(err.message, language) || (language === 'jp' ? '予期しないエラーが発生しました。' : 'An unexpected error occurred.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] flex items-center justify-center p-4 md:p-8 font-sans-custom transition-colors duration-200">
      <div className="w-full max-w-md glass-panel p-6 md:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="text-center space-y-2 mb-8">
          <BrandMark className="w-10 h-10 inline-flex" />
          <div>
            <h1 className="font-bold text-xl tracking-wide text-zinc-900 dark:text-zinc-100">
              {language === 'jp' ? '新しいパスワードを設定' : 'Set New Password'}
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono-custom">
              {language === 'jp' ? '新しいパスワードを入力してください' : 'Enter and confirm your new password'}
            </p>
          </div>
        </div>

        {/* Success state */}
        {success ? (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-xs text-emerald-800 dark:text-emerald-350 flex items-start gap-2.5 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-0.5">
                {language === 'jp' ? 'パスワードを更新しました！' : 'Password updated!'}
              </p>
              <p className="font-mono-custom text-emerald-700 dark:text-emerald-400">
                {language === 'jp' ? 'ダッシュボードにリダイレクトしています...' : 'Redirecting to dashboard...'}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Error alert */}
            {error && (
              <div className="p-3.5 mb-5 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-800 dark:text-rose-350 flex items-start gap-2.5 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-mono-custom">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* New password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-orange-600" />
                  {language === 'jp' ? '新しいパスワード' : 'New Password'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 pr-10 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all font-mono-custom"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-zinc-400 hover:text-zinc-650 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-orange-600" />
                  {language === 'jp' ? 'パスワード（確認）' : 'Confirm Password'}
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    name="confirmPassword"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 pr-10 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all font-mono-custom"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-zinc-400 hover:text-zinc-650 transition-colors cursor-pointer"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 mt-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-600/25 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading
                  ? (language === 'jp' ? '更新中...' : 'Updating...')
                  : (language === 'jp' ? 'パスワードを更新する' : 'Update Password')}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
