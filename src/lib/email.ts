import { Resend } from 'resend'

interface ScheduledPostEmailParams {
  success: boolean
  content: string
  failureReason?: string
}

export async function sendScheduledPostEmail(userEmail: string, params: ScheduledPostEmailParams) {
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL

  if (!apiKey || !fromEmail) {
    console.error('[Email] RESEND_API_KEY or RESEND_FROM_EMAIL not configured, skipping notification email.')
    return { error: 'Email not configured' }
  }

  const resend = new Resend(apiKey)

  const subject = params.success ? '予約投稿がThreadsに公開されました' : '予約投稿の公開に失敗しました'

  const html = params.success
    ? `<p>予約していた投稿がThreadsに公開されました：</p><blockquote>${escapeHtml(params.content)}</blockquote>`
    : `<p>予約投稿のThreadsへの公開に失敗しました。</p>` +
      (params.failureReason ? `<p><strong>理由：</strong> ${escapeHtml(params.failureReason)}</p>` : '') +
      `<blockquote>${escapeHtml(params.content)}</blockquote>` +
      `<p>保存済み投稿ページから編集・再送できます。</p>`

  try {
    const result = await resend.emails.send({
      from: fromEmail,
      to: userEmail,
      subject,
      html,
    })
    return { success: true, id: result.data?.id }
  } catch (err: any) {
    console.error('[Email] Failed to send notification email:', err)
    return { error: err.message || 'Failed to send email' }
  }
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
