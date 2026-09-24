'use client'

import React, { useState, useEffect } from 'react'
import { login, signup, loginWithThreads, requestPasswordReset } from '@/app/actions/auth'
import { Sparkles, Mail, Lock, AlertCircle, CheckCircle2, ArrowRight, Eye, EyeOff, KeyRound, Ticket } from 'lucide-react'
import { useLanguage } from '@/components/LanguageContext'
import { BrandMark } from '@/components/BrandMark'
import { translateMessage } from '@/lib/errorTranslations'

export default function AuthPage() {
  const { t, language } = useLanguage()
  const [isRegister, setIsRegister] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const translateErrorMessage = (msg: string) => translateMessage(msg, language)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const err = params.get('error')
      if (err) {
        const details = params.get('details')
        let errorMsg = err
        if (err === 'threads_db_save_failed') {
          errorMsg = 'Threads connection database save failed.'
        } else if (err === 'threads_already_linked') {
          errorMsg = 'This Threads account is already connected to another email account. Please log in with that email account.'
        } else if (err === 'threads_not_linked') {
          errorMsg = 'No account is linked to this Threads profile yet. Sign up with email, then link your Threads account from Account Settings.'
        } else if (details) {
          // Surface the underlying error detail (e.g. the actual Supabase error message)
          // instead of just the opaque error code, so failures are diagnosable from the UI.
          errorMsg = `${err}: ${details}`
        }
        setError(translateErrorMessage(errorMsg))
        const newUrl = window.location.pathname
        window.history.replaceState({}, document.title, newUrl)
      }
    }
  }, [language])

  const translateSuccessMessage = (msg: string) => translateMessage(msg, language)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    
    try {
      if (isRegister) {
        const result = await signup(formData)
        if (result?.error) {
          setError(translateErrorMessage(result.error))
        } else if (result?.redirect) {
          window.location.href = result.redirect
        } else if (result?.success) {
          setSuccess(translateSuccessMessage(result.success))
        }
      } else {
        const result = await login(formData)
        if (result?.error) {
          setError(translateErrorMessage(result.error))
        } else if (result?.redirect) {
          window.location.href = result.redirect
        }
      }
    } catch (err: any) {
      setError(translateErrorMessage(err.message || (language === 'jp' ? '予期しないエラーが発生しました。' : 'An unexpected error occurred.')))
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    try {
      const result = await requestPasswordReset(formData)
      if (result?.error) {
        setError(translateErrorMessage(result.error))
      } else if (result?.success) {
        setSuccess(translateErrorMessage(result.success))
      }
    } catch (err: any) {
      setError(translateErrorMessage(err.message || (language === 'jp' ? '予期しないエラーが発生しました。' : 'An unexpected error occurred.')))
    } finally {
      setLoading(false)
    }
  }

  const handleOAuthClick = async () => {
    setError(null)
    try {
      const result = await loginWithThreads()
      if (result?.error) {
        setError(translateErrorMessage(result.error))
      } else if (result?.redirect) {
        window.location.href = result.redirect
      }
    } catch (err: any) {
      setError(translateErrorMessage(err.message || (language === 'jp' ? 'OAuthの初期化に失敗しました。' : 'OAuth initialization failed.')))
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
            <h1 className="font-bold text-xl tracking-wide text-zinc-900 dark:text-zinc-100">LETTER COOK</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono-custom">{language === 'jp' ? '参考投稿の自動取得・リライトループ' : 'Automated Reference & Rewrite Loop'}</p>
          </div>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="p-3.5 mb-5 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-800 dark:text-rose-350 flex items-start gap-2.5 animate-fade-in min-w-0">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="font-mono-custom break-all whitespace-pre-wrap flex-1">{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 mb-5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-xs text-emerald-800 dark:text-emerald-350 flex items-start gap-2.5 animate-fade-in min-w-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="font-mono-custom break-all whitespace-pre-wrap flex-1">{success}</span>
          </div>
        )}

        {/* ── FORGOT PASSWORD VIEW ── */}
        {isForgotPassword ? (
          <>
            <div className="flex items-center gap-2.5 mb-6">
              <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  {language === 'jp' ? 'パスワードをリセット' : 'Reset your password'}
                </p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono-custom">
                  {language === 'jp' ? 'メールにリセットリンクを送信します' : 'We\'ll send a reset link to your email'}
                </p>
              </div>
            </div>

            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-orange-600" />
                  {language === 'jp' ? 'メールアドレス' : 'Email Address'}
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="name@domain.com"
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all font-mono-custom"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 mt-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-600/25 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading
                  ? (language === 'jp' ? '送信中...' : 'Sending...')
                  : (language === 'jp' ? 'リセットリンクを送信' : 'Send Reset Link')}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setIsForgotPassword(false)
                  setError(null)
                  setSuccess(null)
                }}
                className="text-xs text-orange-600 hover:text-orange-700 font-semibold transition-colors cursor-pointer"
              >
                {language === 'jp' ? '← ログインに戻る' : '← Back to Sign In'}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Main Email Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-orange-600" />
                  {language === 'jp' ? 'メールアドレス' : 'Email Address'}
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="name@domain.com"
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all font-mono-custom"
                />
              </div>

              {/* Password field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-orange-600" />
                    {language === 'jp' ? 'パスワード' : 'Password'}
                  </label>
                  {!isRegister && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(true)
                        setError(null)
                        setSuccess(null)
                      }}
                      className="text-[10px] text-orange-600 hover:text-orange-700 font-semibold transition-colors cursor-pointer"
                    >
                      {language === 'jp' ? 'パスワードをお忘れですか？' : 'Forgot password?'}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    required
                    placeholder="••••••••"
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 pr-10 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all font-mono-custom"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-zinc-400 hover:text-zinc-650 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password field (Register only) */}
              {isRegister && (
                <div className="space-y-1.5 animate-fade-in">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-orange-600" />
                    {language === 'jp' ? 'パスワード（確認）' : 'Confirm Password'}
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      required
                      placeholder="••••••••"
                      className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 pr-10 text-xs text-zinc-800 dark:text-zinc-205 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all font-mono-custom"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-zinc-400 hover:text-zinc-650 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Invitation Code field (Register only) */}
              {isRegister && (
                <div className="space-y-1.5 animate-fade-in">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Ticket className="w-3.5 h-3.5 text-orange-600" />
                    {language === 'jp' ? '招待コード' : 'Invitation Code'}
                  </label>
                  <input
                    type="text"
                    name="invitationCode"
                    required
                    placeholder={language === 'jp' ? '招待コードを入力' : 'Enter your invitation code'}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all font-mono-custom uppercase placeholder:normal-case"
                  />
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 mt-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-600/25 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading 
                  ? (language === 'jp' ? '認証中...' : 'Authenticating...') 
                  : isRegister 
                    ? (language === 'jp' ? 'アカウント作成' : 'Create Account') 
                    : (language === 'jp' ? 'ログイン' : 'Sign In')}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Threads sign-in is only available to accounts that already linked Threads
                from Account Settings — it cannot be used to create a new account. */}
            {!isRegister && (
              <>
                {/* Divider */}
                <div className="relative flex py-5 items-center">
                  <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800"></div>
                  <span className="flex-shrink mx-4 text-zinc-400 dark:text-zinc-550 text-[10px] font-mono-custom uppercase tracking-wider">{language === 'jp' ? 'または' : 'or'}</span>
                  <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800"></div>
                </div>

                {/* OAuth Button */}
                <button
                  onClick={handleOAuthClick}
                  className="w-full py-3.5 bg-black dark:bg-white hover:bg-zinc-900 dark:hover:bg-zinc-100 text-white dark:text-black rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <Sparkles className="w-4.5 h-4.5 text-orange-400 animate-pulse" />
                  {language === 'jp' ? 'Threadsでサインイン' : 'Continue with Threads'}
                </button>
              </>
            )}

            {/* Toggle Mode */}
            <div className="mt-8 text-center">
              <button
                onClick={() => {
                  setIsRegister(!isRegister)
                  setError(null)
                  setSuccess(null)
                }}
                className="text-xs text-orange-600 hover:text-orange-700 font-semibold transition-colors cursor-pointer"
              >
                {isRegister 
                  ? (language === 'jp' ? 'すでにアカウントをお持ちですか？ログイン' : 'Already have an account? Sign In') 
                  : (language === 'jp' ? 'アカウントをお持ちでないですか？新規登録' : "Don't have an account? Sign Up")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
