'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PenSquare, FolderHeart, BarChart3, LogOut, User, Shield, Bookmark } from 'lucide-react'
import { logout } from '@/app/actions/auth'
import { getAccountDetails } from '@/app/actions/profile'
import { useLanguage } from './LanguageContext'
import { BrandMark } from './BrandMark'

export function Navigation() {
  const pathname = usePathname()
  
  const activeTab =
    pathname === '/' ? 'workspace' :
    pathname.startsWith('/profile') ? 'profile' :
    pathname.startsWith('/saved') ? 'saved' :
    pathname.startsWith('/analytics') ? 'analytics' :
    pathname.startsWith('/admin') ? 'admin' :
    pathname.startsWith('/account') ? 'account' : 'workspace';

  const [isAdmin, setIsAdmin] = React.useState(false)

  React.useEffect(() => {
    async function checkRole() {
      const details = await getAccountDetails()
      if (details?.role === 'admin') {
        setIsAdmin(true)
      }
    }
    checkRole()
  }, [])

  const { language, t } = useLanguage()

  const handleLogout = async () => {
    await logout()
  }

  return (
    <>
      {/* Desktop Navigation Bottom Bar (hidden on mobile) */}
      <header className="hidden md:block fixed bottom-6 left-1/2 -translate-x-1/2 z-50 glass-panel border border-zinc-200/85 dark:border-zinc-800/85 px-6 py-2.5 rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/40 max-w-max w-auto">
        <div className="flex items-center justify-between gap-8 md:gap-12">
          <div className="flex items-center gap-2.5 shrink-0">
            <BrandMark className="w-8 h-8" />
            <div>
              <h1 className="font-bold text-sm tracking-wide text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                LETTER COOK for threads
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <nav className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <Link
                href="/profile"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  activeTab === 'profile'
                    ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30 font-semibold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60'
                }`}
              >
                <FolderHeart className="w-3.5 h-3.5" />
                Chef
              </Link>

              <Link
                href="/"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  activeTab === 'workspace'
                    ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30 font-semibold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60'
                }`}
              >
                <PenSquare className="w-3.5 h-3.5" />
                Cooking
              </Link>

              <Link
                href="/saved"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  activeTab === 'saved'
                    ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30 font-semibold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                {t('nav.saved')}
              </Link>

              <Link
                href="/analytics"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  activeTab === 'analytics'
                    ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30 font-semibold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                {t('nav.analytics')}
              </Link>

              <Link
                href="/account"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  activeTab === 'account'
                    ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30 font-semibold'
                    : 'text-zinc-650 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                {t('nav.account')}
              </Link>

              {isAdmin && (
                <Link
                  href="/admin"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    activeTab === 'admin'
                      ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30 font-semibold'
                      : 'text-zinc-650 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  {language === 'jp' ? '管理設定' : 'Admin'}
                </Link>
              )}
            </nav>

            <button
              onClick={handleLogout}
              title={t('nav.signout')}
              className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-zinc-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Header (Top Title Only + Logout) */}
      <header className="block md:hidden glass-panel border-b border-zinc-200/80 dark:border-zinc-800/85 px-4 py-3 mb-6 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BrandMark className="w-8 h-8" />
            <div>
              <h1 className="font-bold text-sm tracking-wide text-zinc-900 dark:text-zinc-100">LETTER COOK for threads</h1>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono-custom">AI cooks up threads for you.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-zinc-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (sticky bottom) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 flex justify-around items-center py-2 px-4 shadow-lg shadow-black/5">
        <Link
          href="/profile"
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'profile' ? 'text-orange-600 dark:text-orange-400' : 'text-zinc-500 dark:text-zinc-450'
          }`}
        >
          <FolderHeart className="w-5 h-5" />
          <span className="text-[10px] font-medium">Chef</span>
        </Link>

        <Link
          href="/"
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'workspace' ? 'text-orange-600 dark:text-orange-400' : 'text-zinc-500 dark:text-zinc-450'
          }`}
        >
          <PenSquare className="w-5 h-5" />
          <span className="text-[10px] font-medium">Cooking</span>
        </Link>

        <Link
          href="/saved"
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'saved' ? 'text-orange-600 dark:text-orange-400' : 'text-zinc-500 dark:text-zinc-450'
          }`}
        >
          <Bookmark className="w-5 h-5" />
          <span className="text-[10px] font-medium">{t('nav.saved')}</span>
        </Link>

        <Link
          href="/analytics"
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'analytics' ? 'text-orange-600 dark:text-orange-400' : 'text-zinc-500 dark:text-zinc-450'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px] font-medium">{t('nav.analytics')}</span>
        </Link>

        <Link
          href="/account"
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'account' ? 'text-orange-600 dark:text-orange-400' : 'text-zinc-550 dark:text-zinc-450'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] font-medium">{t('nav.account')}</span>
        </Link>

        {isAdmin && (
          <Link
            href="/admin"
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${
              activeTab === 'admin' ? 'text-orange-600 dark:text-orange-400' : 'text-zinc-550 dark:text-zinc-450'
            }`}
          >
            <Shield className="w-5 h-5" />
            <span className="text-[10px] font-medium">{language === 'jp' ? '管理' : 'Admin'}</span>
          </Link>
        )}
      </nav>
    </>
  )
}
