import { Resend } from "resend"

const apiKey = process.env.RESEND_API_KEY
const resend = apiKey ? new Resend(apiKey) : null

const FROM = `${process.env.EMAIL_FROM_NAME ?? "Aranya HRIS"} <${process.env.EMAIL_FROM ?? "noreply@aranya.app"}>`

interface SendArgs {
  to: string
  subject: string
  html: string
  /** Link penting untuk fallback dev (di-log ke console saat Resend tidak dikonfigurasi) */
  devLink?: string
}

// Kirim email via Resend. Jika RESEND_API_KEY tidak diset (dev), log link ke console
// agar alur auth tetap bisa dites tanpa mengirim email sungguhan.
async function send({ to, subject, html, devLink }: SendArgs): Promise<void> {
  if (!resend) {
    // eslint-disable-next-line no-console
    console.warn(
      `\n📧 [DEV] RESEND_API_KEY tidak diset — email tidak dikirim.\n` +
        `   To: ${to}\n   Subject: ${subject}\n` +
        (devLink ? `   Link: ${devLink}\n` : ""),
    )
    return
  }
  await resend.emails.send({ from: FROM, to, subject, html })
}

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  await send({
    to: email,
    subject: "Reset Password Aranya HRIS",
    devLink: resetUrl,
    html: `
      <p>Anda menerima email ini karena ada permintaan reset password untuk akun <strong>${email}</strong>.</p>
      <p><a href="${resetUrl}" style="background:#2563EB;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Reset Password</a></p>
      <p>Link ini berlaku selama <strong>24 jam</strong>. Jika Anda tidak meminta reset password, abaikan email ini.</p>
    `,
  })
}

export async function sendNotificationEmail(
  email: string,
  title: string,
  body: string,
) {
  await send({
    to: email,
    subject: title,
    html: `<p>${body}</p><p style="color:#888;font-size:12px;">Notifikasi otomatis dari Aranya HRIS.</p>`,
  })
}

export async function sendInvitationEmail(
  email: string,
  inviteUrl: string,
  tenantName: string,
  invitedByName: string,
) {
  await send({
    to: email,
    subject: `Undangan bergabung ke ${tenantName} di Aranya HRIS`,
    devLink: inviteUrl,
    html: `
      <p><strong>${invitedByName}</strong> mengundang Anda untuk bergabung ke <strong>${tenantName}</strong> di Aranya HRIS.</p>
      <p><a href="${inviteUrl}" style="background:#2563EB;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Terima Undangan</a></p>
      <p>Link undangan ini berlaku selama <strong>7 hari</strong>.</p>
    `,
  })
}
