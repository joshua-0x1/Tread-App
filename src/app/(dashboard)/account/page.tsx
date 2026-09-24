'use client'

import React, { useState, useEffect } from 'react'
import { AccountSettings } from '@/components/AccountSettings'
import { getAccountDetails } from '@/app/actions/profile'
import { checkThreadsConnection } from '@/app/actions/threads'
import { useLanguage } from '@/components/LanguageContext'

export default function AccountPage() {
  const { language } = useLanguage()
  const [accountDetails, setAccountDetails] = useState<{
    email: string
    displayName: string
    avatarUrl: string
    isThreadsUser?: boolean
  } | null>(null)
  
  const [threadsLoading, setThreadsLoading] = useState(true)
  const [threadsConnected, setThreadsConnected] = useState(false)
  const [threadsUsername, setThreadsUsername] = useState('')
  const [threadsDisplayName, setThreadsDisplayName] = useState('')
  const [threadsAvatarUrl, setThreadsAvatarUrl] = useState('')
  const [threadsExpiresAt, setThreadsExpiresAt] = useState('')

  // Load account details on client mount
  useEffect(() => {
    async function loadAccount() {
      // Fetch profile details first so we can mount the page layout instantly
      const details = await getAccountDetails()
      if (details) {
        setAccountDetails(details)
      }
      
      // Check Threads connection status asynchronously in background
      setThreadsLoading(true)
      try {
        const conn = await checkThreadsConnection()
        setThreadsConnected(conn.connected)
        setThreadsUsername(conn.username || '')
        setThreadsDisplayName(conn.displayName || '')
        setThreadsAvatarUrl(conn.avatarUrl || '')
        setThreadsExpiresAt(conn.expiresAt || '')
      } catch (err) {
        console.error('Failed to load Threads connection status:', err)
      } finally {
        setThreadsLoading(false)
      }
    }
    loadAccount()
  }, [])

  // Handle URL errors and changes on redirect back (e.g. from Threads)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const error = params.get('error')
    const details = params.get('details')
    const accountChanged = params.get('account_changed')
    
    if (error) {
      console.error('[Threads Callback Error] type:', error, 'details:', details)
      alert(
        language === 'jp'
          ? `Threads連携に失敗しました: ${error}${details ? `（${details}）` : ''}`
          : `Threads Connection Failed: ${error}${details ? ` (${details})` : ''}`
      )
      params.delete('error')
      params.delete('details')
      window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`)
    }

    if (accountChanged === 'true') {
      // Clear local storage AI data
      localStorage.removeItem('threadcraft_profile')
      localStorage.removeItem('threadcraft_setup_complete')

      alert(
        language === 'jp'
          ? 'Threadsアカウントが変更されました。ローカルおよびデータベースに保存されたAIペルソナデータはすべて削除されました。'
          : 'Threads account changed! All local and database AI profile data has been deleted.'
      )

      params.delete('account_changed')
      window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`)
      
      // Reload page to refresh dashboard and workspace states
      window.location.reload()
    }
  }, [])

  if (!accountDetails) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  return (
    <AccountSettings
      key={`${accountDetails.email}-${threadsConnected}`}
      initialDisplayName={accountDetails.displayName}
      initialAvatarUrl={accountDetails.avatarUrl}
      initialEmail={accountDetails.email}
      isThreadsUser={accountDetails.isThreadsUser}
      threadsConnected={threadsConnected}
      threadsUsername={threadsUsername}
      threadsDisplayName={threadsDisplayName}
      threadsAvatarUrl={threadsAvatarUrl}
      threadsLoading={threadsLoading}
      threadsExpiresAt={threadsExpiresAt}
    />
  )
}
