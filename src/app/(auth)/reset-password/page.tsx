"use client"
import { useActionState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { resetPasswordAction } from "./actions"
import { Suspense } from "react"

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") ?? ""
  const [state, formAction, isPending] = useActionState(resetPasswordAction, {})

  if (!token) {
    return (
      <div className="text-center">
        <p className="text-sm text-red-600">Token reset tidak ditemukan.</p>
        <Link href="/forgot-password" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
          Minta link baru
        </Link>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="token" value={token} />

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password Baru</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-400">Min. 8 karakter, huruf kapital, dan angka</p>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Konfirmasi Password</label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? "Menyimpan..." : "Simpan Password Baru"}
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Reset Password</h1>
        <p className="mt-1 text-sm text-gray-500">Buat password baru untuk akun Anda.</p>
      </div>
      <Suspense fallback={<p className="text-sm text-gray-400">Memuat...</p>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}
