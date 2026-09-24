'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Users, Search, ShieldAlert, UserX, UserCheck, Shield, RefreshCw, CheckCircle2, Trash2, KeyRound, Eye, EyeOff, Ticket, Plus, Copy, Ban } from 'lucide-react'
import {
  getUsersList,
  updateUserStatus,
  deleteUser,
  resetUserPassword,
  getInvitationCodes,
  createInvitationCode,
  setInvitationCodeActive,
  deleteInvitationCode,
} from '@/app/actions/admin'
import { getAccountDetails } from '@/app/actions/profile'
import { useLanguage } from '@/components/LanguageContext'
import { translateMessage } from '@/lib/errorTranslations'

interface InvitationCode {
  id: string
  code: string
  max_uses: number
  uses_count: number
  is_active: boolean
  expires_at: string | null
  note: string | null
  created_at: string
}

interface UserProfile {
  profile_id: string
  user_id: string
  email: string
  display_name: string
  avatar_url: string
  role: string
  is_approved: boolean
  approved_until?: string | null
  created_at: string
  invitation_code?: string | null
  post_count?: number
}

export default function AdminPage() {
  const router = useRouter()
  const { language } = useLanguage()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'admin'>('all')
  const [activeSection, setActiveSection] = useState<'users' | 'invites'>('users')
  const [actioningId, setActioningId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // State for Approval Modal
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [modalProfileId, setModalProfileId] = useState<string | null>(null)
  const [modalRole, setModalRole] = useState<string>('user')
  const [durationOption, setDurationOption] = useState<'permanent' | '1day' | '7days' | '30days' | '1year' | 'custom'>('permanent')
  const [customDate, setCustomDate] = useState('')
  const [mounted, setMounted] = useState(false)

  // State for Password Reset Modal
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordModalUserId, setPasswordModalUserId] = useState<string | null>(null)
  const [passwordModalEmail, setPasswordModalEmail] = useState<string>('')
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordResetting, setPasswordResetting] = useState(false)

  // State for Invitation Codes
  const [invitationCodes, setInvitationCodes] = useState<InvitationCode[]>([])
  const [invitationLoading, setInvitationLoading] = useState(true)
  const [invitationActioningId, setInvitationActioningId] = useState<string | null>(null)
  const [showCreateCodeModal, setShowCreateCodeModal] = useState(false)
  const [newCode, setNewCode] = useState('')
  const [newCodeMaxUses, setNewCodeMaxUses] = useState('1')
  const [newCodeExpiresAt, setNewCodeExpiresAt] = useState('')
  const [newCodeNote, setNewCodeNote] = useState('')
  const [creatingCode, setCreatingCode] = useState(false)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getUsersList()
      if (res.error) {
        setError(translateMessage(res.error, language))
      } else if (res.users) {
        setUsers(res.users)
      }
    } catch (err) {
      console.error(err)
      setError(language === 'jp' ? 'ユーザー一覧の取得に失敗しました。' : 'Failed to fetch user list')
    } finally {
      setLoading(false)
    }
  }

  const fetchInvitationCodes = async () => {
    setInvitationLoading(true)
    try {
      const res = await getInvitationCodes()
      if (res.error) {
        showToast(translateMessage(res.error, language), 'error')
      } else if (res.codes) {
        setInvitationCodes(res.codes)
      }
    } catch (err) {
      console.error(err)
      showToast(language === 'jp' ? '招待コードの取得に失敗しました' : 'Failed to fetch invitation codes', 'error')
    } finally {
      setInvitationLoading(false)
    }
  }

  useEffect(() => {
    setMounted(true)
    async function verifyAdmin() {
      const details = await getAccountDetails()
      if (!details || details.role !== 'admin') {
        router.push('/')
      } else {
        fetchUsers()
        fetchInvitationCodes()
      }
    }
    verifyAdmin()
  }, [router])

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 10; i++) {
      if (i > 0 && i % 5 === 0) code += '-'
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setNewCode(code)
  }

  const handleOpenCreateCodeModal = () => {
    setNewCode('')
    setNewCodeMaxUses('1')
    setNewCodeExpiresAt('')
    setNewCodeNote('')
    setShowCreateCodeModal(true)
  }

  const handleCreateInvitationCode = async () => {
    if (!newCode.trim()) {
      showToast(language === 'jp' ? 'コードを入力してください' : 'Please enter a code', 'error')
      return
    }
    const maxUses = parseInt(newCodeMaxUses, 10)
    if (!maxUses || maxUses < 1) {
      showToast(language === 'jp' ? '利用可能回数は1以上で入力してください' : 'Max uses must be at least 1', 'error')
      return
    }

    setCreatingCode(true)
    try {
      const res = await createInvitationCode(
        newCode.trim(),
        maxUses,
        newCodeExpiresAt ? new Date(newCodeExpiresAt).toISOString() : null,
        newCodeNote.trim() || null
      )
      if (res.error) {
        showToast(translateMessage(res.error, language), 'error')
      } else {
        showToast(language === 'jp' ? '招待コードを作成しました' : 'Invitation code created successfully!')
        setShowCreateCodeModal(false)
        fetchInvitationCodes()
      }
    } catch (err) {
      console.error(err)
      showToast(language === 'jp' ? 'エラーが発生しました' : 'An error occurred', 'error')
    } finally {
      setCreatingCode(false)
    }
  }

  const handleToggleCodeActive = async (id: string, currentActive: boolean) => {
    setInvitationActioningId(id)
    try {
      const res = await setInvitationCodeActive(id, !currentActive)
      if (res.error) {
        showToast(translateMessage(res.error, language), 'error')
      } else {
        setInvitationCodes(prev =>
          prev.map(c => (c.id === id ? { ...c, is_active: !currentActive } : c))
        )
        showToast(
          !currentActive
            ? (language === 'jp' ? 'コードを有効化しました' : 'Code activated successfully!')
            : (language === 'jp' ? 'コードを無効化しました' : 'Code deactivated successfully!')
        )
      }
    } catch (err) {
      console.error(err)
      showToast(language === 'jp' ? 'エラーが発生しました' : 'An error occurred', 'error')
    } finally {
      setInvitationActioningId(null)
    }
  }

  const handleDeleteInvitationCode = async (id: string, code: string) => {
    const confirmText = language === 'jp'
      ? `招待コード「${code}」を削除しますか？この操作は取り消せません。`
      : `Delete invitation code "${code}"? This action cannot be undone.`

    if (!window.confirm(confirmText)) return

    setInvitationActioningId(id)
    try {
      const res = await deleteInvitationCode(id)
      if (res.error) {
        showToast(translateMessage(res.error, language), 'error')
      } else {
        setInvitationCodes(prev => prev.filter(c => c.id !== id))
        showToast(language === 'jp' ? '招待コードを削除しました' : 'Invitation code deleted successfully!')
      }
    } catch (err) {
      console.error(err)
      showToast(language === 'jp' ? 'エラーが発生しました' : 'An error occurred', 'error')
    } finally {
      setInvitationActioningId(null)
    }
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    showToast(language === 'jp' ? 'コピーしました' : 'Copied to clipboard!')
  }

  const handleToggleApproval = async (profileId: string, currentApproved: boolean, role: string) => {
    if (currentApproved) {
      // Suspend user directly (no modal needed)
      setActioningId(profileId)
      try {
        const res = await updateUserStatus(profileId, false, role, null)
        if (res.error) {
          showToast(translateMessage(res.error, language), 'error')
        } else {
          setUsers(prev =>
            prev.map(u =>
              u.profile_id === profileId 
                ? { ...u, is_approved: false, approved_until: null } 
                : u
            )
          )
          showToast(
            language === 'jp'
              ? 'ユーザーの承認を解除しました'
              : 'User approval removed successfully!'
          )
        }
      } catch (err) {
        console.error(err)
        showToast(language === 'jp' ? 'エラーが発生しました' : 'An error occurred', 'error')
      } finally {
        setActioningId(null)
      }
    } else {
      // Approving user: show duration selection modal
      setModalProfileId(profileId)
      setModalRole(role)
      setDurationOption('permanent')
      setCustomDate('')
      setShowApprovalModal(true)
    }
  }

  const handleConfirmApproval = async () => {
    if (!modalProfileId) return

    let approvedUntil: string | null = null

    if (durationOption === '1day') {
      approvedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    } else if (durationOption === '7days') {
      approvedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    } else if (durationOption === '30days') {
      approvedUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    } else if (durationOption === '1year') {
      approvedUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    } else if (durationOption === 'custom') {
      if (!customDate) {
        showToast(
          language === 'jp' ? '日付を選択してください' : 'Please select a custom date',
          'error'
        )
        return
      }
      approvedUntil = new Date(customDate).toISOString()
    }

    setActioningId(modalProfileId)
    setShowApprovalModal(false)

    try {
      const res = await updateUserStatus(modalProfileId, true, modalRole, approvedUntil)
      if (res.error) {
        showToast(translateMessage(res.error, language), 'error')
      } else {
        setUsers(prev =>
          prev.map(u =>
            u.profile_id === modalProfileId 
              ? { ...u, is_approved: true, approved_until: approvedUntil } 
              : u
          )
        )
        showToast(
          language === 'jp'
            ? 'ユーザーを承認しました'
            : 'User approved successfully!'
        )
      }
    } catch (err) {
      console.error(err)
      showToast(language === 'jp' ? 'エラーが発生しました' : 'An error occurred', 'error')
    } finally {
      setActioningId(null)
      setModalProfileId(null)
    }
  }

  const handleToggleRole = async (profileId: string, approved: boolean, currentRole: string) => {
    setActioningId(profileId)
    const newRole = currentRole === 'admin' ? 'user' : 'admin'
    try {
      const res = await updateUserStatus(profileId, approved, newRole)
      if (res.error) {
        showToast(translateMessage(res.error, language), 'error')
      } else {
        setUsers(prev =>
          prev.map(u =>
            u.profile_id === profileId ? { ...u, role: newRole } : u
          )
        )
        showToast(
          language === 'jp'
            ? `役割を${newRole === 'admin' ? '管理者' : '一般ユーザー'}に変更しました`
            : `Role updated to ${newRole} successfully!`
        )
      }
    } catch (err) {
      console.error(err)
      showToast(language === 'jp' ? 'エラーが発生しました' : 'An error occurred', 'error')
    } finally {
      setActioningId(null)
    }
  }

  const handleDeleteUser = async (userId: string, email: string) => {
    const confirmText = language === 'jp' 
      ? `本当にこのユーザー (${email}) を完全に削除しますか？この操作は取り消せません。`
      : `Are you sure you want to permanently delete user (${email})? This action cannot be undone.`
    
    if (!window.confirm(confirmText)) return

    setActioningId(userId)
    try {
      const res = await deleteUser(userId)
      if (res.error) {
        showToast(translateMessage(res.error, language), 'error')
      } else {
        setUsers(prev => prev.filter(u => u.user_id !== userId))
        showToast(
          language === 'jp'
            ? 'ユーザーを完全に削除しました。'
            : 'User permanently deleted successfully.'
        )
      }
    } catch (err) {
      console.error(err)
      showToast(language === 'jp' ? 'エラーが発生しました' : 'An error occurred', 'error')
    } finally {
      setActioningId(null)
    }
  }

  const generateStrongPassword = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*'
    let pwd = ''
    for (let i = 0; i < 16; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setNewPassword(pwd)
    setShowPassword(true)
  }

  const handleOpenPasswordReset = (userId: string, email: string) => {
    setPasswordModalUserId(userId)
    setPasswordModalEmail(email)
    setNewPassword('')
    setShowPassword(false)
    setShowPasswordModal(true)
  }

  const handleConfirmPasswordReset = async () => {
    if (!passwordModalUserId || !newPassword) return
    setPasswordResetting(true)
    try {
      const res = await resetUserPassword(passwordModalUserId, newPassword)
      if (res.error) {
        showToast(translateMessage(res.error, language), 'error')
      } else {
        showToast(
          language === 'jp'
            ? 'パスワードをリセットしました'
            : 'Password reset successfully!'
        )
        setShowPasswordModal(false)
        setPasswordModalUserId(null)
      }
    } catch (err) {
      console.error(err)
      showToast(language === 'jp' ? 'エラーが発生しました' : 'An error occurred', 'error')
    } finally {
      setPasswordResetting(false)
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.email?.toLowerCase().includes(search.toLowerCase()) ||
      user.display_name?.toLowerCase().includes(search.toLowerCase())

    if (!matchesSearch) return false

    if (statusFilter === 'pending') return !user.is_approved
    if (statusFilter === 'approved') return user.is_approved
    if (statusFilter === 'admin') return user.role === 'admin'
    return true
  })

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-fade-in px-2 md:px-0">
      {/* Section Tabs */}
      <div className="flex bg-zinc-150/40 dark:bg-zinc-900/60 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 gap-1 w-full md:w-fit overflow-x-auto select-none">
        <button
          onClick={() => setActiveSection('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer font-sans-custom ${
            activeSection === 'users'
              ? 'bg-orange-600 text-white shadow-md'
              : 'text-zinc-650 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          {language === 'jp' ? 'ユーザー管理' : 'User Management'}
        </button>
        <button
          onClick={() => setActiveSection('invites')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer font-sans-custom ${
            activeSection === 'invites'
              ? 'bg-orange-600 text-white shadow-md'
              : 'text-zinc-650 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <Ticket className="w-3.5 h-3.5" />
          {language === 'jp' ? '招待コード' : 'Invitation Codes'}
        </button>
      </div>

      {activeSection === 'users' && (
        <div className="glass-panel p-4 md:p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
          {/* Card Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  {language === 'jp' ? 'ユーザー管理 & 承認ハブ' : 'User Control & Approvals'}
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono-custom">
                  {language === 'jp' ? '登録ユーザーの審査・承認、管理権限の割り当てを行います。' : 'Review user registrations, toggle approval status, and manage platform roles.'}
                </p>
              </div>
            </div>
            <button
              onClick={fetchUsers}
              disabled={loading}
              className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer shrink-0"
              title={language === 'jp' ? '再読み込み' : 'Refresh table'}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

      {error ? (
        <div className="p-6 rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50/5 text-rose-800 dark:text-rose-400 text-center font-mono-custom text-xs">
          <ShieldAlert className="w-8 h-8 text-rose-500 mx-auto mb-2" />
          {error}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full md:max-w-xs">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={language === 'jp' ? 'メールまたは名前で検索...' : 'Search by email or name...'}
                className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-orange-500 transition-all font-mono-custom"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex bg-zinc-150/40 dark:bg-zinc-900/60 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 gap-1 self-stretch md:self-auto overflow-x-auto select-none">
              {(['all', 'pending', 'approved', 'admin'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer font-sans-custom ${
                    statusFilter === tab
                      ? 'bg-orange-600 text-white shadow-md'
                      : 'text-zinc-650 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  {tab === 'all' && (language === 'jp' ? 'すべて' : 'All Users')}
                  {tab === 'pending' && (language === 'jp' ? '承認待ち' : 'Pending')}
                  {tab === 'approved' && (language === 'jp' ? '承認済み' : 'Approved')}
                  {tab === 'admin' && (language === 'jp' ? '管理者' : 'Admins')}
                </button>
              ))}
            </div>
          </div>

          {/* User List: loading / empty states shared by both layouts */}
          {loading ? (
            <div className="py-12 text-center text-zinc-400 dark:text-zinc-500 font-mono-custom rounded-2xl border border-zinc-200 dark:border-zinc-800 text-xs">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-orange-600" />
              {language === 'jp' ? 'ユーザー読み込み中...' : 'Loading users list...'}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 dark:text-zinc-500 font-mono-custom rounded-2xl border border-zinc-200 dark:border-zinc-800 text-xs">
              {language === 'jp' ? '該当するユーザーが見つかりません。' : 'No matching users found.'}
            </div>
          ) : (
            <>
              {/* Mobile: card list */}
              <div className="md:hidden space-y-3">
                {filteredUsers.map(user => {
                  const isExpired = user.is_approved && user.approved_until && new Date(user.approved_until) < new Date()
                  return (
                    <div
                      key={user.profile_id}
                      className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3 bg-white dark:bg-zinc-950"
                    >
                      <div className="flex items-start gap-3">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.display_name}
                            className="w-9 h-9 rounded-full object-cover border border-zinc-200 dark:border-zinc-800 bg-zinc-100 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800/40 flex items-center justify-center font-bold shrink-0 text-xs">
                            {user.display_name?.slice(0, 2).toUpperCase() || 'US'}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-zinc-900 dark:text-zinc-100 block truncate leading-tight text-sm">
                            {user.display_name}
                          </span>
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-550 font-mono-custom truncate block">
                            {user.email}
                          </span>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono-custom text-[10px] font-bold shrink-0 ${
                          user.role === 'admin'
                            ? 'bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-350 border border-orange-200 dark:border-orange-900'
                            : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-650 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800'
                        }`}>
                          {user.role === 'admin' ? (<><Shield className="w-3 h-3" /> Admin</>) : 'User'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] font-mono-custom text-zinc-500 dark:text-zinc-450">
                        <span>
                          {language === 'jp' ? '登録日: ' : 'Registered: '}
                          {user.created_at ? new Date(user.created_at).toLocaleDateString(language === 'jp' ? 'ja-JP' : 'en-US', {
                            year: 'numeric', month: 'short', day: 'numeric'
                          }) : '-'}
                        </span>
                        {user.invitation_code && (
                          <span className="inline-flex items-center gap-1">
                            <Ticket className="w-3 h-3" />
                            {user.invitation_code}
                          </span>
                        )}
                        <span>
                          {language === 'jp' ? '生成数: ' : 'Outputs: '}
                          {user.post_count ?? 0}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono-custom font-semibold w-fit border ${
                          isExpired
                            ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border-rose-250 dark:border-rose-900/50'
                            : user.is_approved
                            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-250 dark:border-emerald-900/50'
                            : 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-450 border border-amber-250 dark:border-amber-900/50'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isExpired ? 'bg-rose-500' : user.is_approved ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          {isExpired
                            ? (language === 'jp' ? '期限切れ' : 'Expired')
                            : user.is_approved
                            ? (language === 'jp' ? '承認済み' : 'Approved')
                            : (language === 'jp' ? '承認待ち' : 'Pending')}
                        </span>
                        {user.is_approved && !isExpired && user.approved_until && (
                          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono-custom">
                            {language === 'jp' ? '期限: ' : 'Expires: '}
                            {new Date(user.approved_until).toLocaleDateString(language === 'jp' ? 'ja-JP' : 'en-US', {
                              year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                        )}
                        {user.is_approved && !user.approved_until && (
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono-custom">
                            {language === 'jp' ? '無期限' : 'Permanent'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-900">
                        <button
                          onClick={() => handleToggleApproval(user.profile_id, user.is_approved, user.role)}
                          disabled={actioningId === user.profile_id}
                          className={`flex-1 p-2.5 rounded-xl border transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center ${
                            user.is_approved
                              ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-250 dark:border-rose-900 text-rose-700 dark:text-rose-400'
                              : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-250 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400'
                          }`}
                          title={user.is_approved ? (language === 'jp' ? '承認を解除' : 'Suspend User') : (language === 'jp' ? 'ユーザーを承認' : 'Approve User')}
                        >
                          {user.is_approved ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleOpenPasswordReset(user.user_id, user.email)}
                          disabled={actioningId === user.profile_id}
                          className="flex-1 p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/50 text-amber-600 dark:text-amber-400 transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center"
                          title={language === 'jp' ? 'パスワードリセット' : 'Reset Password'}
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleRole(user.profile_id, user.is_approved, user.role)}
                          disabled={actioningId === user.profile_id}
                          className="flex-1 p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center"
                          title={language === 'jp' ? '役割を切り替え' : 'Toggle Role'}
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.user_id, user.email)}
                          disabled={actioningId === user.profile_id}
                          className="flex-1 p-2.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/10 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-455 transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center"
                          title={language === 'jp' ? 'ユーザーを削除' : 'Delete User'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Desktop: table */}
              <div className="hidden md:block rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono-custom select-none">
                        <th className="py-4 px-6">{language === 'jp' ? 'ユーザー' : 'User'}</th>
                        <th className="py-4 px-6">{language === 'jp' ? '登録日' : 'Registered At'}</th>
                        <th className="py-4 px-6">{language === 'jp' ? '役割' : 'Role'}</th>
                        <th className="py-4 px-6 whitespace-nowrap">{language === 'jp' ? 'ステータス' : 'Status'}</th>
                        <th className="py-4 px-6">{language === 'jp' ? '招待コード' : 'Invite Code'}</th>
                        <th className="py-4 px-6 text-right whitespace-nowrap">{language === 'jp' ? '生成数' : 'Outputs'}</th>
                        <th className="py-4 px-6 text-right">{language === 'jp' ? 'アクション' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs leading-normal">
                      {filteredUsers.map(user => (
                        <tr key={user.profile_id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 transition-colors">
                          {/* Profile Info */}
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              {user.avatar_url ? (
                                <img
                                  src={user.avatar_url}
                                  alt={user.display_name}
                                  className="w-8.5 h-8.5 rounded-full object-cover border border-zinc-200 dark:border-zinc-800 bg-zinc-100"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-8.5 h-8.5 rounded-full bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800/40 flex items-center justify-center font-bold">
                                  {user.display_name?.slice(0, 2).toUpperCase() || 'US'}
                                </div>
                              )}
                              <div className="min-w-0">
                                <span className="font-bold text-zinc-900 dark:text-zinc-100 block truncate leading-none mb-1">
                                  {user.display_name}
                                </span>
                                <span className="text-[10px] text-zinc-400 dark:text-zinc-550 font-mono-custom break-all block">
                                  {user.email}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Registered date */}
                          <td className="py-4 px-6 text-zinc-500 dark:text-zinc-450 font-mono-custom whitespace-nowrap">
                            {user.created_at ? new Date(user.created_at).toLocaleDateString(language === 'jp' ? 'ja-JP' : 'en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            }) : '-'}
                          </td>

                          {/* Role */}
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-mono-custom text-[10px] font-bold ${
                              user.role === 'admin'
                                ? 'bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-350 border border-orange-200 dark:border-orange-900'
                                : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-650 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800'
                            }`}>
                              {user.role === 'admin' ? (
                                <>
                                  <Shield className="w-3 h-3" /> Admin
                                </>
                              ) : 'User'}
                            </span>
                          </td>

                          {/* Approval status */}
                          <td className="py-4 px-6">
                            {(() => {
                              const isExpired = user.is_approved && user.approved_until && new Date(user.approved_until) < new Date()
                              return (
                                <div className="flex flex-col gap-1.5 animate-fade-in">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono-custom font-semibold w-fit whitespace-nowrap border ${
                                    isExpired
                                      ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border-rose-250 dark:border-rose-900/50'
                                      : user.is_approved
                                      ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-250 dark:border-emerald-900/50'
                                      : 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-450 border border-amber-250 dark:border-amber-900/50'
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${isExpired ? 'bg-rose-500' : user.is_approved ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                    {isExpired
                                      ? (language === 'jp' ? '期限切れ' : 'Expired')
                                      : user.is_approved
                                      ? (language === 'jp' ? '承認済み' : 'Approved')
                                      : (language === 'jp' ? '承認待ち' : 'Pending')}
                                  </span>

                                  {user.is_approved && !isExpired && user.approved_until && (
                                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono-custom pl-1">
                                      {language === 'jp' ? '期限: ' : 'Expires: '}
                                      {new Date(user.approved_until).toLocaleDateString(language === 'jp' ? 'ja-JP' : 'en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                  )}

                                  {user.is_approved && !user.approved_until && (
                                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono-custom pl-1 animate-fade-in">
                                      {language === 'jp' ? '無期限' : 'Permanent'}
                                    </span>
                                  )}
                                </div>
                              )
                            })()}
                          </td>

                          {/* Invitation code used at signup */}
                          <td className="py-4 px-6 text-zinc-500 dark:text-zinc-450 font-mono-custom whitespace-nowrap">
                            {user.invitation_code ? (
                              <span className="inline-flex items-center gap-1.5">
                                <Ticket className="w-3 h-3 text-zinc-400" />
                                {user.invitation_code}
                              </span>
                            ) : (
                              <span className="text-zinc-300 dark:text-zinc-700">—</span>
                            )}
                          </td>

                          {/* Post generation count */}
                          <td className="py-4 px-6 text-right text-zinc-700 dark:text-zinc-300 font-mono-custom font-bold">
                            {user.post_count ?? 0}
                          </td>

                          {/* Action buttons */}
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Toggle Approval Button */}
                              <button
                                onClick={() => handleToggleApproval(user.profile_id, user.is_approved, user.role)}
                                disabled={actioningId === user.profile_id}
                                className={`p-2 rounded-xl border transition-all active:scale-95 cursor-pointer disabled:opacity-50 ${
                                  user.is_approved
                                    ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-250 dark:border-rose-900 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40'
                                    : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-250 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                                }`}
                                title={user.is_approved ? (language === 'jp' ? '承認を解除' : 'Suspend User') : (language === 'jp' ? 'ユーザーを承認' : 'Approve User')}
                              >
                                {user.is_approved ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                              </button>

                              {/* Reset Password Button */}
                              <button
                                onClick={() => handleOpenPasswordReset(user.user_id, user.email)}
                                disabled={actioningId === user.profile_id}
                                className="p-2 rounded-xl bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/50 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                                title={language === 'jp' ? 'パスワードリセット' : 'Reset Password'}
                              >
                                <KeyRound className="w-4 h-4" />
                              </button>

                              {/* Toggle Role Button */}
                              <button
                                onClick={() => handleToggleRole(user.profile_id, user.is_approved, user.role)}
                                disabled={actioningId === user.profile_id}
                                className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-850 text-zinc-700 dark:text-zinc-300 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                                title={language === 'jp' ? '役割を切り替え' : 'Toggle Role'}
                              >
                                <Shield className="w-4 h-4" />
                              </button>

                              {/* Delete User Button */}
                              <button
                                onClick={() => handleDeleteUser(user.user_id, user.email)}
                                disabled={actioningId === user.profile_id}
                                className="p-2 rounded-xl bg-rose-50/50 dark:bg-rose-950/10 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-455 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                                title={language === 'jp' ? 'ユーザーを削除' : 'Delete User'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
        </div>
      )}

      {activeSection === 'invites' && (
      <div className="glass-panel p-4 md:p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {language === 'jp' ? '招待コード管理' : 'Invitation Codes'}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono-custom">
                {language === 'jp' ? '新規登録に必要な招待コードを発行・管理します。' : 'Issue and manage invitation codes required for new sign-ups.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleOpenCreateCodeModal}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-md shadow-orange-500/10"
            >
              <Plus className="w-4 h-4" />
              {language === 'jp' ? '新規コード' : 'New Code'}
            </button>
            <button
              onClick={fetchInvitationCodes}
              disabled={invitationLoading}
              className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer"
              title={language === 'jp' ? '再読み込み' : 'Refresh table'}
            >
              <RefreshCw className={`w-4 h-4 ${invitationLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono-custom select-none">
                  <th className="py-4 px-6">{language === 'jp' ? 'コード' : 'Code'}</th>
                  <th className="py-4 px-6">{language === 'jp' ? '利用状況' : 'Usage'}</th>
                  <th className="py-4 px-6">{language === 'jp' ? '有効期限' : 'Expires'}</th>
                  <th className="py-4 px-6">{language === 'jp' ? 'ステータス' : 'Status'}</th>
                  <th className="py-4 px-6 text-right">{language === 'jp' ? 'アクション' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs leading-normal">
                {invitationLoading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-zinc-400 dark:text-zinc-500 font-mono-custom">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-orange-600" />
                      {language === 'jp' ? '読み込み中...' : 'Loading invitation codes...'}
                    </td>
                  </tr>
                ) : invitationCodes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-zinc-400 dark:text-zinc-500 font-mono-custom">
                      {language === 'jp' ? '招待コードがありません。' : 'No invitation codes yet.'}
                    </td>
                  </tr>
                ) : (
                  invitationCodes.map(c => {
                    const isExpired = !!c.expires_at && new Date(c.expires_at) < new Date()
                    const isExhausted = c.uses_count >= c.max_uses
                    const isUsable = c.is_active && !isExpired && !isExhausted
                    return (
                      <tr key={c.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono-custom tracking-wide">
                              {c.code}
                            </span>
                            <button
                              onClick={() => handleCopyCode(c.code)}
                              className="text-zinc-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors cursor-pointer"
                              title={language === 'jp' ? 'コピー' : 'Copy'}
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {c.note && (
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-550 block mt-0.5 truncate max-w-[220px]">
                              {c.note}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-zinc-500 dark:text-zinc-450 font-mono-custom">
                          {c.uses_count} / {c.max_uses}
                        </td>
                        <td className="py-4 px-6 text-zinc-500 dark:text-zinc-450 font-mono-custom">
                          {c.expires_at
                            ? new Date(c.expires_at).toLocaleDateString(language === 'jp' ? 'ja-JP' : 'en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })
                            : (language === 'jp' ? '無期限' : 'Never')}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono-custom font-semibold w-fit border ${
                            isUsable
                              ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-250 dark:border-emerald-900/50'
                              : 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border-rose-250 dark:border-rose-900/50'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isUsable ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            {!c.is_active
                              ? (language === 'jp' ? '無効' : 'Revoked')
                              : isExpired
                              ? (language === 'jp' ? '期限切れ' : 'Expired')
                              : isExhausted
                              ? (language === 'jp' ? '使用済み' : 'Exhausted')
                              : (language === 'jp' ? '有効' : 'Active')}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleToggleCodeActive(c.id, c.is_active)}
                              disabled={invitationActioningId === c.id}
                              className={`p-2 rounded-xl border transition-all active:scale-95 cursor-pointer disabled:opacity-50 ${
                                c.is_active
                                  ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-250 dark:border-rose-900 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40'
                                  : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-250 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                              }`}
                              title={c.is_active ? (language === 'jp' ? 'コードを無効化' : 'Revoke Code') : (language === 'jp' ? 'コードを有効化' : 'Activate Code')}
                            >
                              {c.is_active ? <Ban className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleDeleteInvitationCode(c.id, c.code)}
                              disabled={invitationActioningId === c.id}
                              className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-850 text-zinc-700 dark:text-zinc-300 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                              title={language === 'jp' ? 'コードを削除' : 'Delete Code'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}

      {toast && (
        <div className="fixed top-6 right-6 md:top-8 md:right-8 z-[100] flex items-center gap-3 px-4 py-3 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border border-zinc-800 dark:border-zinc-200 shadow-2xl shadow-black/40 animate-fade-in leading-relaxed min-w-[300px] max-w-sm">
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0" />
          )}
          <span className="text-xs font-bold font-sans-custom">{toast.message}</span>
        </div>
      )}

      {/* Approval Duration Selection Modal */}
      {showApprovalModal && mounted && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-2">
              {language === 'jp' ? 'ユーザー承認期間の選択' : 'Select Approval Duration'}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5">
              {language === 'jp'
                ? 'このユーザーの有効期限を選択してください。期限が切れると自動的にアクセスが制限されます。'
                : 'Select how long this user should remain approved. Once expired, access is revoked automatically.'}
            </p>

            <div className="space-y-3 mb-6">
              {[
                { value: 'permanent', label: language === 'jp' ? '無期限 (永久承認)' : 'Indefinite / Permanent' },
                { value: '1day', label: language === 'jp' ? '24時間 (1日間)' : '24 Hours (1 Day)' },
                { value: '7days', label: language === 'jp' ? '7日間 (1週間)' : '7 Days (1 Week)' },
                { value: '30days', label: language === 'jp' ? '30日間 (1ヶ月間)' : '30 Days (1 Month)' },
                { value: '1year', label: language === 'jp' ? '1年間 (365日間)' : '1 Year (365 Days)' },
                { value: 'custom', label: language === 'jp' ? 'カスタム期限指定' : 'Custom Expiry Date' }
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer text-xs font-semibold ${
                    durationOption === opt.value
                      ? 'bg-orange-50/50 dark:bg-orange-950/10 border-orange-500/50 text-orange-700 dark:text-orange-300'
                      : 'bg-zinc-50/50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/50 dark:hover:bg-zinc-850/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="duration"
                    value={opt.value}
                    checked={durationOption === opt.value}
                    onChange={() => setDurationOption(opt.value as any)}
                    className="sr-only"
                  />
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      durationOption === opt.value
                        ? 'border-orange-500'
                        : 'border-zinc-300 dark:border-zinc-700'
                    }`}
                  >
                    {durationOption === opt.value && (
                      <div className="w-2 h-2 rounded-full bg-orange-500" />
                    )}
                  </div>
                  <span>{opt.label}</span>
                </label>
              ))}

              {/* Custom Date Input Field */}
              {durationOption === 'custom' && (
                <div className="pt-2 animate-fade-in">
                  <input
                    type="datetime-local"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-orange-500 transition-all font-mono-custom"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowApprovalModal(false)
                  setModalProfileId(null)
                }}
                className="flex-1 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold transition-all active:scale-95 cursor-pointer"
              >
                {language === 'jp' ? 'キャンセル' : 'Cancel'}
              </button>
              <button
                onClick={handleConfirmApproval}
                className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-all active:scale-95 shadow-md shadow-orange-500/10 cursor-pointer"
              >
                {language === 'jp' ? '承認を適用' : 'Approve User'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Password Reset Modal */}
      {showPasswordModal && mounted && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            {/* Ambient Glow */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {language === 'jp' ? 'パスワードリセット' : 'Reset Password'}
                </h3>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono-custom truncate max-w-[200px]">
                  {passwordModalEmail}
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5 mt-3">
              {language === 'jp'
                ? '新しいパスワードを設定します。SUPABASE_SECRET_KEY が必要です。'
                : 'Set a new password for this user. Requires SUPABASE_SECRET_KEY to be configured.'}
            </p>

            <div className="space-y-3 mb-5">
              {/* Password input */}
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={language === 'jp' ? '新しいパスワード (6文字以上)' : 'New password (min 6 characters)'}
                  className="w-full bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 pr-10 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-amber-500 transition-all font-mono-custom"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Generate password */}
              <button
                type="button"
                onClick={generateStrongPassword}
                className="w-full py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-xs font-semibold transition-all cursor-pointer"
              >
                ✦ {language === 'jp' ? 'ランダムな強力なパスワードを生成' : 'Generate strong random password'}
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPasswordModal(false)
                  setPasswordModalUserId(null)
                }}
                className="flex-1 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold transition-all active:scale-95 cursor-pointer"
              >
                {language === 'jp' ? 'キャンセル' : 'Cancel'}
              </button>
              <button
                onClick={handleConfirmPasswordReset}
                disabled={passwordResetting || newPassword.length < 6}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold transition-all active:scale-95 shadow-md shadow-amber-500/20 cursor-pointer"
              >
                {passwordResetting
                  ? (language === 'jp' ? 'リセット中...' : 'Resetting...')
                  : (language === 'jp' ? 'パスワードを更新' : 'Update Password')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Create Invitation Code Modal */}
      {showCreateCodeModal && mounted && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400">
                <Ticket className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {language === 'jp' ? '新規招待コード' : 'New Invitation Code'}
              </h3>
            </div>

            <div className="space-y-3 mb-6">
              {/* Code input */}
              <div className="relative">
                <input
                  type="text"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  placeholder={language === 'jp' ? 'コード (例: LAUNCH-2026)' : 'Code (e.g. LAUNCH-2026)'}
                  className="w-full bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 pr-24 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-orange-500 transition-all font-mono-custom uppercase"
                />
                <button
                  type="button"
                  onClick={generateRandomCode}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[10px] font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all cursor-pointer"
                >
                  {language === 'jp' ? '生成' : 'Generate'}
                </button>
              </div>

              {/* Max uses */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                  {language === 'jp' ? '利用可能回数' : 'Max Uses'}
                </label>
                <input
                  type="number"
                  min={1}
                  value={newCodeMaxUses}
                  onChange={(e) => setNewCodeMaxUses(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-orange-500 transition-all font-mono-custom"
                />
              </div>

              {/* Expiry */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                  {language === 'jp' ? '有効期限 (任意)' : 'Expires At (optional)'}
                </label>
                <input
                  type="datetime-local"
                  value={newCodeExpiresAt}
                  onChange={(e) => setNewCodeExpiresAt(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-orange-500 transition-all font-mono-custom"
                />
              </div>

              {/* Note */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                  {language === 'jp' ? 'メモ (任意)' : 'Note (optional)'}
                </label>
                <input
                  type="text"
                  value={newCodeNote}
                  onChange={(e) => setNewCodeNote(e.target.value)}
                  placeholder={language === 'jp' ? '例: 提携パートナー向け' : 'e.g. For partner outreach'}
                  className="w-full bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-orange-500 transition-all font-mono-custom"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateCodeModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold transition-all active:scale-95 cursor-pointer"
              >
                {language === 'jp' ? 'キャンセル' : 'Cancel'}
              </button>
              <button
                onClick={handleCreateInvitationCode}
                disabled={creatingCode || !newCode.trim()}
                className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-xs font-bold transition-all active:scale-95 shadow-md shadow-orange-500/10 cursor-pointer"
              >
                {creatingCode
                  ? (language === 'jp' ? '作成中...' : 'Creating...')
                  : (language === 'jp' ? 'コードを作成' : 'Create Code')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
