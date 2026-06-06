// TODO Fase 0: 2FA verification page
// Flow: user sudah login → jika role hr_admin/super_admin → redirect ke sini
// Input TOTP code dari Google Authenticator (atau backup code)
// Setelah verify → set token.isTwoFactorVerified = true → redirect ke dashboard
export default function TwoFactorPage() {
  return (
    <div className="w-full max-w-md rounded-lg bg-white p-8 shadow">
      <h1 className="mb-2 text-2xl font-bold">Verifikasi 2FA</h1>
      <p className="text-gray-500">2FA form — coming in Fase 0</p>
    </div>
  )
}
