"use client"
import { useActionState } from "react"
import Link from "next/link"
import { loginAction } from "./actions"

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, {})

  return (
    <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Aranya HRIS</h1>
        <p className="mt-1 text-sm text-gray-500">Masuk ke akun Anda</p>
      </div>

      <form action={formAction} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {state?.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isPending ? "Memproses..." : "Masuk"}
        </button>

        <p className="text-center text-sm text-gray-500">
          <Link href="/forgot-password" className="text-blue-600 hover:underline">
            Lupa password?
          </Link>
        </p>
      </form>
    </div>
  )
}
