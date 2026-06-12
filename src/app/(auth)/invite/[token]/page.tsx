import { withSuperAdminContext } from "@/lib/db"
import { invitations } from "@/lib/db/schema"
import { eq, and, gt, isNull } from "drizzle-orm"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Brand } from "@/components/layout/brand"
import InviteForm from "./_form"

interface Props {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params
  const t = await getTranslations("invite")

  // invitations kena RLS; lookup by token pre-auth & lintas-tenant → bypass context
  const invite = await withSuperAdminContext((tx) =>
    tx.query.invitations.findFirst({
      where: and(
        eq(invitations.token, token),
        gt(invitations.expiresAt, new Date()),
        isNull(invitations.acceptedAt),
      ),
    }),
  )

  if (!invite) notFound()

  return (
    <div className="w-full rounded-2xl border border-border bg-card p-8 shadow-xl ring-1 ring-foreground/5">
      <div className="mb-8 flex flex-col items-center text-center">
        <Brand className="mb-4" />
        <h1 className="text-xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="mb-6 rounded-lg bg-accent px-4 py-3">
        <p className="text-sm text-accent-foreground">
          Email: <strong>{invite.email}</strong>
        </p>
      </div>

      <InviteForm token={token} email={invite.email} />
    </div>
  )
}
