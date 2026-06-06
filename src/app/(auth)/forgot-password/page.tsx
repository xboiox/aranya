"use client"
import { useActionState } from "react"
import Link from "next/link"
import { forgotPasswordAction } from "./actions"

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useActionState(forgotPasswordAction, {})

  if (state.success) {
    return (
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Email terkirim</h2>
        <p className="mt-2 text-sm text-gray-500">
          Jika email Anda terdaftar, kami telah mengirimkan link reset password. Periksa inbox Anda.
        </p>
        <Link href="/login" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
          Kembali ke login
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Lupa Password</h1>
        <p className="mt-1 text-sm text-gray-500">
          Masukkan email Anda dan kami akan mengirimkan link reset password.
        </p>
      </div>

      <form action={formAction} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
          <input
            id="email"
            name="email"
            type="email"
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
          {isPending ? "Mengirim..." : "Kirim Link Reset"}
        </button>

        <p className="text-center text-sm">
          <Link href="/login" className="text-blue-600 hover:underline">Kembali ke login</Link>
        </p>
      </form>
    </div>
  )
}
