import type { Language } from '@/components/LanguageContext'

// Maps known English action/error strings to Japanese. Server actions always
// return English (the canonical form Supabase/Threads errors also arrive in),
// so this substring-matching layer is where display-time localization happens.
// Order matters: more specific substrings must come before broader ones.
const RULES: [string, string][] = [
  ['invalid login credentials', 'メールアドレスまたはパスワードが正しくありません。'],
  ['user already registered', 'このメールアドレスは既に登録されています。'],
  ['password should be at least 6 characters', 'パスワードは6文字以上で入力してください。'],
  ['must be at least 6 characters', 'パスワードは6文字以上で入力してください。'],
  ['both password fields are required', 'パスワード欄をすべて入力してください。'],
  ['all password fields are required', 'パスワード欄をすべて入力してください。'],
  ['email and password are required', 'メールアドレスとパスワードは必須です。'],
  ['email address is required', 'メールアドレスを入力してください。'],
  ['all fields are required', 'すべてのフィールドを入力してください。'],
  ['invalid invitation code', '招待コードが無効です。'],
  ['invitation code is no longer active', 'この招待コードは無効化されています。'],
  ['invitation code has expired', 'この招待コードは有効期限が切れています。'],
  ['invitation code has already been used', 'この招待コードは既に使用されています。'],
  ['passwords do not match', 'パスワードが一致しません。'],
  ['email not confirmed', 'メールアドレスの確認が完了していません。受信トレイを確認してください。'],
  ['confirm your email', 'メールアドレスの確認が完了していません。受信トレイを確認してください。'],
  ['check your email', '確認メールを送信しました。メールボックスを確認してください。'],
  ['rate limit', 'リクエストの制限回数を超えました。しばらく時間をおいて再試行してください。'],
  ['already connected', 'このThreadsアカウントは既に別のメールアドレスと連携されています。そのメールアドレスでログインしてください。'],
  ['already linked', 'このThreadsアカウントは既に別のメールアドレスと連携されています。そのメールアドレスでログインしてください。'],
  ['threads_already_linked', 'このThreadsアカウントは既に別のメールアドレスと連携されています。そのメールアドレスでログインしてください。'],
  ['threads_not_linked', 'このThreadsアカウントに連携されたアカウントがありません。メールアドレスで新規登録した後、アカウント設定からThreadsアカウントを連携してください。'],
  ['no account is linked to this threads profile', 'このThreadsアカウントに連携されたアカウントがありません。メールアドレスで新規登録した後、アカウント設定からThreadsアカウントを連携してください。'],
  ['if an account with that email', 'メールアドレスが登録されている場合、パスワードリセットのリンクが送信されます。'],
  ['access denied: admin privileges required', 'アクセスが拒否されました。管理者権限が必要です。'],
  ['failed to fetch user list', 'ユーザー一覧の取得に失敗しました。'],
  ['not authenticated or session expired', '認証が切れています。再度ログインしてください。'],
  ['not authenticated', '認証されていません。再度ログインしてください。'],
  ['user is not authenticated', '認証されていません。再度ログインしてください。'],
  ['threads account is not linked', 'Threadsアカウントが連携されていません。設定タブからアカウントを連携してください。'],
  ['threads app id is not configured', 'Threads アプリIDが設定されていません。'],
  ['next_public_thread_app_id is not configured', 'Threads アプリIDが設定されていません。'],
  ['failed to load posts for sync', '投稿の同期データの読み込みに失敗しました。'],
  ['post not found', '投稿が見つかりません。'],
  ['scheduled time must be in the future', '予約時間は未来の日時を指定してください。'],
  ['failed to create threads container', 'Threads投稿の作成に失敗しました。'],
  ['threads failed to process the post container', 'Threads側で投稿の処理に失敗しました。'],
  ['failed to publish threads post', 'Threadsへの投稿に失敗しました。'],
  ['network error occurred during publishing', '投稿中にネットワークエラーが発生しました。'],
  ['failed to fetch threads insights', 'Threadsのインサイト取得に失敗しました。'],
  ['network error occurred while fetching insights', 'インサイト取得中にネットワークエラーが発生しました。'],
  ['failed to search threads', 'Threads検索に失敗しました。'],
  ['network error occurred while searching threads', 'Threads検索中にネットワークエラーが発生しました。'],
  ['an error occurred during disconnect', '連携解除中にエラーが発生しました。'],
  ['an error occurred triggering oauth', '連携処理の開始中にエラーが発生しました。'],
  ['an unexpected error occurred during publishing', '投稿処理中に予期しないエラーが発生しました。'],
  ['an unexpected error occurred while saving', '保存中に予期しないエラーが発生しました。'],
  ['an unexpected error occurred while scheduling', '予約設定中に予期しないエラーが発生しました。'],
  ['an unexpected error occurred', '予期しないエラーが発生しました。'],
]

export function translateMessage(message: string, language: Language): string {
  if (language !== 'jp' || !message) return message
  const lower = message.toLowerCase()
  for (const [needle, translation] of RULES) {
    if (lower.includes(needle)) return translation
  }
  return message
}
