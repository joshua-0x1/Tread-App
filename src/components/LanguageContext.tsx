'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

export type Language = 'en' | 'jp'

export interface LanguageContextProps {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Nav / Global
    "nav.analytics": "Analytics",
    "nav.account": "Settings",
    "nav.saved": "Saved Posts",
    "nav.signout": "Sign Out",
    "global.theme.dark": "Dark Mode",
    "global.theme.light": "Light Mode",

    // Auth
    "auth.title": "LETTER COOK",
    "auth.subtitle": "Automated Reference & Rewrite Loop",
    "auth.email": "Email Address",
    "auth.password": "Password",
    "auth.confirmPassword": "Confirm Password",
    "auth.signin": "Sign In",
    "auth.signup": "Create Account",
    "auth.authenticating": "Authenticating...",
    "auth.or": "or",
    "auth.oauth": "Continue with Threads",
    "auth.toSignup": "Don't have an account? Sign Up",
    "auth.toSignin": "Already have an account? Sign In",

    // Generator Workspace
    "gen.subtitle": "Enter your theme and target message. The AI handles Threads scraping and structure analysis.",
    "gen.theme": "Theme (Title)",
    "gen.message": "Key Message / Value to Deliver",
    "gen.reference": "Reference Posts (Optional)",
    "gen.reference.placeholder": "Paste the full text of posts you want to use as style references — line breaks and paragraphs are fine. Separate multiple posts with a blank line. Links aren't fetched — paste the post's text directly.",
    "gen.topicTag": "Community or Topic (Optional)",
    "gen.activePocket": "Active Pocket",
    "gen.audience": "Audience",
    "gen.loaded": "Loaded",
    "gen.autofill": "Auto-fill",
    "gen.loop": "Start Generation Loop",
    "gen.loop.generating": "Analyzing & Generating...",
    "gen.editor.title": "Threads Draft Preview",
    "gen.editor.subtitle": "Double check alignment before publishing or saving.",
    "gen.editor.charLimit": "characters remaining",
    "gen.editor.saving": "Saving Draft...",
    "gen.editor.saveSuccess": "Saved to history!",
    "gen.editor.save": "Save to History",
    "gen.editor.publish": "Publish to Threads",
    "gen.editor.publishing": "Publishing...",
    "gen.editor.publishSuccess": "Published successfully!",
    "gen.editor.connectedAs": "Connected as",
    "gen.editor.scheduleLabel": "Schedule for",
    "gen.editor.scheduleButton": "Schedule Post",
    "gen.editor.scheduling": "Scheduling...",
    "gen.editor.scheduleSuccess": "Post scheduled!",
    "gen.variations.title": "Choose a Variation",
    "gen.variations.subtitle": "3 distinct angles were generated from your input. Pick one to edit & publish; save the others for later.",
    "gen.variations.useThis": "Use This",
    "gen.variations.save": "Save",
    "gen.variations.saving": "Saving...",
    "gen.variations.saved": "Saved",
    "gen.variations.selected": "Selected",

    // Saved Posts
    "saved.title": "Saved Posts",
    "saved.subtitle": "Drafts and scheduled posts that haven't been published yet.",
    "saved.empty": "Nothing saved yet. Generate a post and save a variation to see it here.",
    "saved.edit": "Edit",
    "saved.publishNow": "Publish Now",
    "saved.schedule": "Schedule",
    "saved.reschedule": "Reschedule",
    "saved.cancelSchedule": "Cancel Schedule",
    "saved.delete": "Delete",
    "saved.scheduledFor": "Scheduled for",
    "saved.status.saved": "Saved",
    "saved.status.scheduled": "Scheduled",
    "saved.status.failed": "Failed",
    "saved.failureReason": "Last attempt failed",

    // Analytics
    "analytics.title": "Threads Performance Loop",
    "analytics.subtitle": "Audit your live posts and trigger automatic optimizations.",
    "analytics.sync": "Sync Performance Data",
    "analytics.syncing": "Syncing...",
    "analytics.postsCount": "Total Tracked Posts",
    "analytics.avgLikes": "Average Likes",
    "analytics.avgReplies": "Average Replies",
    "analytics.empty": "No posts tracked yet. Generate and publish to view performance analytics.",
    "analytics.card.connected": "Connected",
    "analytics.card.failed": "Failed",
    "analytics.card.draft": "Draft",
    "analytics.card.pending": "Pending Publish",
    "analytics.card.restart": "Low Engagement",

    // Pocket (Profile)
    "profile.title": "Chef & Target",
    "profile.subtitle": "Store your personal persona details (\"Pocket\") and target avatars.",
    "profile.tab.pocket": "① Chef Profile (Your Background & Strengths)",
    "profile.tab.audience": "② Target Definition (Target Audience)",
    "profile.bio": "Chef Information",
    "profile.bio.placeholder": "[Bio & Background]\n...\n\n[Personality Traits]\n...\n\n[Likes & Dislikes]\n...\n\n[Values]\n...\n\n[Lifestyle]\n...\n\n[Dreams & Goals]\n...\n\n[Outlook on Life]\n...",
    "profile.audience": "Target Customer / Reader Profile",
    "profile.audience.placeholder": "Describe your target audience...",
    "profile.tone": "Preferred Tone",
    "profile.tone.placeholder": "e.g. Friendly, professional, humorous",
    "profile.constraints": "Formatting Constraints",
    "profile.constraints.placeholder": "e.g. Keep sentences under 12 words, no hashtags",
    "profile.saved": "Guidelines saved & applied!",
    "profile.save": "Save Changes",

    // Settings (Account)
    "settings.title": "Account Credentials",
    "settings.subtitle": "Manage your personal display name, profile avatar, and secure password updates.",
    "settings.public": "Public Details",
    "settings.photo": "Profile Photo",
    "settings.photo.subtitle": "Synced via your linked Threads profile.",
    "settings.displayName": "Display Name",
    "settings.username": "Threads Account (Read Only)",
    "settings.email": "Registered Email (Read Only)",
    "settings.save": "Update Details",
    "settings.saving": "Saving...",
    "settings.saved": "Details updated successfully!",
    "settings.password": "Password settings",
    "settings.pwd.new": "New Password",
    "settings.pwd.confirm": "Confirm New Password",
    "settings.pwd.change": "Change Password",
    "settings.pwd.changing": "Changing...",
    "settings.pwd.changed": "Password updated successfully!",
    "settings.threads": "Linked Threads Account",
    "settings.threads.desc": "Connect your Threads account to publish directly from the app.",
    "settings.threads.connected": "Connected",
    "settings.threads.expires": "Token active · Expires on",
    "settings.threads.disconnect": "Disconnect Account",
    "settings.threads.disconnecting": "Processing...",
    "settings.threads.connect": "Link Threads Account",
    "settings.threads.modal.title": "Unlink Threads Account?",
    "settings.threads.modal.desc": "Unlinking your Threads account will delete all generated posts, historical analytics, custom writing rules, and persona attributes permanently.",
    "settings.threads.modal.warning": "CRITICAL WARNING: This will permanently wipe your accumulated AI-generated data. This action is irreversible.",
    "settings.threads.modal.cancel": "Cancel",
    "settings.threads.modal.confirm": "Delete & Unlink"
  },
  jp: {
    // Nav / Global
    "nav.analytics": "分析",
    "nav.account": "設定",
    "nav.saved": "保存済み投稿",
    "nav.signout": "サインアウト",
    "global.theme.dark": "ダークモード",
    "global.theme.light": "ライトモード",

    // Auth
    "auth.title": "LETTER COOK",
    "auth.subtitle": "自動ペルソナ参照・リライトループ",
    "auth.email": "メールアドレス",
    "auth.password": "パスワード",
    "auth.confirmPassword": "パスワードの確認",
    "auth.signin": "サインイン",
    "auth.signup": "アカウント作成",
    "auth.authenticating": "認証中...",
    "auth.or": "または",
    "auth.oauth": "Threadsでログイン",
    "auth.toSignup": "アカウントをお持ちでないですか？ 新規登録",
    "auth.toSignin": "すでにアカウントをお持ちですか？ ログイン",

    // Generator Workspace
    "gen.subtitle": "テーマと伝えたい内容を入力してください。AIがThreadsの構造分析に基づいて投稿を作成します。",
    "gen.theme": "テーマ（タイトル）",
    "gen.message": "キーメッセージ / 伝えたい価値",
    "gen.reference": "参考にする投稿 (任意)",
    "gen.reference.placeholder": "スタイルの参考にしたい投稿の文章をそのまま貼り付けてください（改行や段落はそのままでOK）。複数の投稿を貼り付ける場合は空行で区切ってください。リンクは取得されないため、投稿の文章を直接貼り付けてください。",
    "gen.topicTag": "コミュニティまたはトピック (任意)",
    "gen.activePocket": "有効なシェフ情報",
    "gen.audience": "ターゲット層",
    "gen.loaded": "読み込み済み",
    "gen.autofill": "自動入力",
    "gen.loop": "スレッド作成ループ開始",
    "gen.loop.generating": "分析・生成中...",
    "gen.editor.title": "Threads 下書きプレビュー",
    "gen.editor.subtitle": "投稿または保存する前に、内容を確認してください。",
    "gen.editor.charLimit": "文字残り",
    "gen.editor.saving": "下書き保存中...",
    "gen.editor.saveSuccess": "履歴に保存されました！",
    "gen.editor.save": "履歴に保存",
    "gen.editor.publish": "Threadsに投稿",
    "gen.editor.publishing": "投稿中...",
    "gen.editor.publishSuccess": "Threadsへ投稿しました！",
    "gen.editor.connectedAs": "接続中:",
    "gen.editor.scheduleLabel": "予約日時",
    "gen.editor.scheduleButton": "投稿を予約",
    "gen.editor.scheduling": "予約中...",
    "gen.editor.scheduleSuccess": "投稿を予約しました！",
    "gen.variations.title": "バリエーションを選択",
    "gen.variations.subtitle": "入力内容から3つの異なる切り口の投稿を生成しました。1つを選んで編集・投稿し、残りは後で使えるように保存できます。",
    "gen.variations.useThis": "これを使う",
    "gen.variations.save": "保存",
    "gen.variations.saving": "保存中...",
    "gen.variations.saved": "保存済み",
    "gen.variations.selected": "選択中",

    // Saved Posts
    "saved.title": "保存済み投稿",
    "saved.subtitle": "まだ投稿されていない下書きや予約投稿の一覧です。",
    "saved.empty": "保存された投稿はまだありません。投稿を生成してバリエーションを保存してください。",
    "saved.edit": "編集",
    "saved.publishNow": "今すぐ投稿",
    "saved.schedule": "予約する",
    "saved.reschedule": "予約を変更",
    "saved.cancelSchedule": "予約をキャンセル",
    "saved.delete": "削除",
    "saved.scheduledFor": "予約日時",
    "saved.status.saved": "保存済み",
    "saved.status.scheduled": "予約済み",
    "saved.status.failed": "失敗",
    "saved.failureReason": "前回の投稿に失敗しました",

    // Analytics
    "analytics.title": "Threads パフォーマンスループ",
    "analytics.subtitle": "投稿のパフォーマンスを確認し、自動最適化をトリガーします。",
    "analytics.sync": "実績データを同期",
    "analytics.syncing": "同期中...",
    "analytics.postsCount": "総トラッキング投稿数",
    "analytics.avgLikes": "平均いいね数",
    "analytics.avgReplies": "平均返信数",
    "analytics.empty": "まだ投稿がありません。スレッドを生成・公開してパフォーマンス分析を開始しましょう。",
    "analytics.card.connected": "公開済み",
    "analytics.card.failed": "エラー",
    "analytics.card.draft": "下書き",
    "analytics.card.pending": "公開保留中",
    "analytics.card.restart": "エンゲージメント低調",

    // Pocket (Profile)
    "profile.title": "シェフ＆ターゲット",
    "profile.subtitle": "あなたのペルソナ情報とターゲット属性を設定します。",
    "profile.tab.pocket": "① シェフプロフィール (あなたの経歴・強み)",
    "profile.tab.audience": "② ターゲット設定 (ターゲット層)",
    "profile.bio": "シェフ情報",
    "profile.bio.placeholder": "【自己紹介・経歴】\n...\n\n【性格・特徴】\n...\n\n【好きなこと・嫌いなこと】\n...\n\n【価値観】\n...\n\n【ライフスタイル】\n...\n\n【将来の夢・目標】\n...\n\n【人生観】\n...",
    "profile.audience": "ターゲット読者層",
    "profile.audience.placeholder": "あなたのターゲット層を説明してください...",
    "profile.tone": "トーン＆マナー",
    "profile.tone.placeholder": "例: フレンドリー、プロフェッショナル、ユーモラス",
    "profile.constraints": "フォーマットの制約ルール",
    "profile.constraints.placeholder": "例: 1文は12文字以内にする、ハッシュタグ禁止",
    "profile.saved": "設定を保存し適用しました！",
    "profile.save": "変更を保存",

    // Settings (Account)
    "settings.title": "アカウント認証情報",
    "settings.subtitle": "表示名、プロフィール画像、パスワードの変更管理を行います。",
    "settings.public": "公開情報",
    "settings.photo": "プロフィール写真",
    "settings.photo.subtitle": "接続中のThreadsアカウントと同期しています。",
    "settings.displayName": "表示名",
    "settings.username": "Threadsアカウント (読み取り専用)",
    "settings.email": "登録用メールアドレス (読み取り専用)",
    "settings.save": "詳細を更新",
    "settings.saving": "保存中...",
    "settings.saved": "更新に成功しました！",
    "settings.password": "パスワードの設定",
    "settings.pwd.new": "新しいパスワード",
    "settings.pwd.confirm": "新しいパスワード (再入力)",
    "settings.pwd.change": "パスワードを変更",
    "settings.pwd.changing": "変更中...",
    "settings.pwd.changed": "パスワードの変更に成功しました！",
    "settings.threads": "連携済みのThreadsアカウント",
    "settings.threads.desc": "直接投稿するために、Threadsアカウントと接続します。",
    "settings.threads.connected": "連携中",
    "settings.threads.expires": "トークン有効 · 有効期限:",
    "settings.threads.disconnect": "連携解除する",
    "settings.threads.disconnecting": "処理中...",
    "settings.threads.connect": "Threadsアカウントと連携",
    "settings.threads.modal.title": "Threadsアカウントの連携を解除しますか？",
    "settings.threads.modal.desc": "連携を解除すると、作成した投稿、蓄積されたデータ、ペルソナ設定などが完全に削除されます。",
    "settings.threads.modal.warning": "注意: この操作を行うと永久にデータが消去されます。元に戻すことはできません。",
    "settings.threads.modal.cancel": "キャンセル",
    "settings.threads.modal.confirm": "消去して連携解除"
  }
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('jp')

  useEffect(() => {
    // Always use Japanese; there is no UI control to switch languages.
    document.documentElement.setAttribute('lang', 'jp')
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('language', lang)
    document.documentElement.setAttribute('lang', lang)
  }

  const t = (key: string): string => {
    return translations[language][key] || translations['en'][key] || key
  }

  // Render children normally but wait for load if reading language
  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
