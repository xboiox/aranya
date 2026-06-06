import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = `${process.env.EMAIL_FROM_NAME ?? "Aranya HRIS"} <${process.env.EMAIL_FROM ?? "noreply@aranya.app"}>`

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Reset Password Aranya HRIS",
    html: `
      <p>Anda menerima email ini karena ada permintaan reset password untuk akun <strong>${email}</strong>.</p>
      <p><a href="${resetUrl}" style="background:#2563EB;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Reset Password</a></p>
      <p>Link ini berlaku selama <strong>24 jam</strong>. Jika Anda tidak meminta reset password, abaikan email ini.</p>
    `,
  })
}

export async function sendInvitationEmail(
  email: string,
  inviteUrl: string,
  tenantName: string,
  invitedByName: string,
) {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Undangan bergabung ke ${tenantName} di Aranya HRIS`,
    html: `
      <p><strong>${invitedByName}</strong> mengundang Anda untuk bergabung ke <strong>${tenantName}</strong> di Aranya HRIS.</p>
      <p><a href="${inviteUrl}" style="background:#2563EB;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Terima Undangan</a></p>
      <p>Link undangan ini berlaku selama <strong>7 hari</strong>.</p>
    `,
  })
}
