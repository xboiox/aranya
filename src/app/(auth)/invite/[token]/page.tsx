import { db } from "@/lib/db"
import { invitations } from "@/lib/db/schema"
import { eq, and, gt, isNull } from "drizzle-orm"
import { notFound } from "next/navigation"
import InviteForm from "./_form"

interface Props {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params

  const invite = await db.query.invitations.findFirst({
    where: and(
      eq(invitations.token, token),
      gt(invitations.expiresAt, new Date()),
      isNull(invitations.acceptedAt),
    ),
  })

  if (!invite) notFound()

  return (
    <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Buat Akun Anda</h1>
        <p className="mt-1 text-sm text-gray-500">
          Anda diundang ke Aranya HRIS. Lengkapi data berikut untuk mulai.
        </p>
      </div>

      <div className="mb-6 rounded-lg bg-blue-50 px-4 py-3">
        <p className="text-sm text-blue-700">
          Email: <strong>{invite.email}</strong>
        </p>
      </div>

      <InviteForm token={token} email={invite.email} />
    </div>
  )
}
