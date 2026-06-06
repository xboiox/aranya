"use client"
import { useActionState, useState } from "react"
import { verifyTwoFactor } from "../actions"

export default function TwoFactorVerify() {
  const [useBackup, setUseBackup] = useState(false)
  const [state, formAction, isPending] = useActionState(verifyTwoFactor, {})

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Verifikasi 2FA</h2>
        <p className="mt-1 text-sm text-gray-500">
          {useBackup
            ? "Masukkan salah satu kode backup Anda."
            : "Masukkan kode 6 digit dari Google Authenticator."}
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        {useBackup ? (
          <div>
            <label htmlFor="backup_code" className="block text-sm font-medium text-gray-700">
              Kode Backup
            </label>
            <input
              id="backup_code"
              name="backup_code"
              type="text"
              required
              placeholder="XXXXXXXX"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-center font-mono tracking-widest focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        ) : (
          <div>
            <label htmlFor="token" className="block text-sm font-medium text-gray-700">
              Kode Autentikasi
            </label>
            <input
              id="token"
              name="token"
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              placeholder="000000"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-center text-lg font-mono tracking-widest focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        )}

        {state?.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? "Memverifikasi..." : "Verifikasi"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setUseBackup(!useBackup)}
        className="w-full text-center text-sm text-blue-600 hover:underline"
      >
        {useBackup ? "Gunakan aplikasi authenticator" : "Gunakan kode backup"}
      </button>
    </div>
  )
}
