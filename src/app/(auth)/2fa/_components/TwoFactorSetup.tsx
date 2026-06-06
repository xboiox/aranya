"use client"
import { useActionState, useEffect, useState } from "react"
import { initTwoFactorSetup, completeTwoFactorSetup } from "../actions"

export default function TwoFactorSetup() {
  const [qrCode, setQrCode] = useState<string>("")
  const [state, formAction, isPending] = useActionState(completeTwoFactorSetup, {})

  useEffect(() => {
    initTwoFactorSetup().then((res) => {
      if (res.qrCodeDataUrl) setQrCode(res.qrCodeDataUrl)
    })
  }, [])

  if (state.backupCodes) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-green-50 p-4">
          <h3 className="font-semibold text-green-800">2FA berhasil diaktifkan!</h3>
          <p className="mt-1 text-sm text-green-700">
            Simpan kode backup berikut di tempat yang aman. Kode ini hanya ditampilkan sekali.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {state.backupCodes.map((code) => (
            <code key={code} className="rounded bg-gray-100 px-3 py-1.5 text-center text-sm font-mono">
              {code}
            </code>
          ))}
        </div>
        <a
          href="/dashboard"
          className="block w-full rounded-lg bg-blue-600 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-700"
        >
          Lanjut ke Dashboard
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Setup Autentikasi 2 Faktor</h2>
        <p className="mt-1 text-sm text-gray-500">
          Pindai QR code di bawah dengan aplikasi Google Authenticator.
        </p>
      </div>

      {qrCode ? (
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrCode} alt="QR Code 2FA" className="h-48 w-48" />
        </div>
      ) : (
        <div className="flex h-48 w-48 mx-auto items-center justify-center rounded-lg bg-gray-100">
          <span className="text-sm text-gray-400">Memuat QR Code...</span>
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="token" className="block text-sm font-medium text-gray-700">
            Masukkan kode 6 digit dari aplikasi
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

        {state?.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={isPending || !qrCode}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? "Memverifikasi..." : "Aktifkan 2FA"}
        </button>
      </form>
    </div>
  )
}
