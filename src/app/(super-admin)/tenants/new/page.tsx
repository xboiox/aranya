"use client"
import { useActionState } from "react"
import Link from "next/link"
import { createTenantAction } from "../actions"

export default function NewTenantPage() {
  const [state, formAction, isPending] = useActionState(createTenantAction, {})

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/tenants" className="text-sm text-blue-600 hover:underline">← Kembali</Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Tambah Tenant Baru</h1>
        <p className="text-sm text-gray-500">
          Buat akun perusahaan dan kirim undangan ke HR Admin.
        </p>
      </div>

      <form action={formAction} className="space-y-6 rounded-xl bg-white p-6 shadow-sm border border-gray-200">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Nama Perusahaan <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="PT Contoh Indonesia"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
              Slug <span className="text-red-500">*</span>
            </label>
            <input
              id="slug"
              name="slug"
              type="text"
              required
              placeholder="pt-contoh-indonesia"
              pattern="[a-z0-9-]+"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-400">Huruf kecil, angka, dan tanda hubung saja</p>
          </div>
        </div>

        <div>
          <label htmlFor="hrAdminEmail" className="block text-sm font-medium text-gray-700">
            Email HR Admin <span className="text-red-500">*</span>
          </label>
          <input
            id="hrAdminEmail"
            name="hrAdminEmail"
            type="email"
            required
            placeholder="hr@perusahaan.com"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-400">Undangan akan dikirim ke email ini</p>
        </div>

        <div>
          <p className="block text-sm font-medium text-gray-700 mb-3">Modul yang Diaktifkan</p>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked disabled className="h-4 w-4 rounded border-gray-300 text-blue-600" />
              <span className="text-sm text-gray-700">Modul 1 — Core HR & Employee Self-Service (wajib)</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" id="module2" name="module2" value="on" className="h-4 w-4 rounded border-gray-300 text-blue-600" />
              <span className="text-sm text-gray-700">Modul 2 — HR Operations & Performance Development</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" id="module3" name="module3" value="on" className="h-4 w-4 rounded border-gray-300 text-blue-600" />
              <span className="text-sm text-gray-700">Modul 3 — Payroll & Compliance</span>
            </label>
          </div>
        </div>

        {state?.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? "Menyimpan..." : "Buat Tenant & Kirim Undangan"}
          </button>
          <Link
            href="/tenants"
            className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Batal
          </Link>
        </div>
      </form>
    </div>
  )
}
