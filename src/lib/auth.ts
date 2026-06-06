import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { eq } from "drizzle-orm"
import bcryptjs from "bcryptjs"
import { db, withSuperAdminContext } from "@/lib/db"
import {
  users,
  accounts,
  sessions,
  verificationTokens,
  userRoles,
  roles,
  employees,
} from "@/lib/db/schema"
import type { RoleName } from "@/lib/db/schema"
import { logAudit } from "@/lib/audit"
import { SESSION_DURATIONS, getHighestPrivilegeRole, hasRole, hasAnyRole } from "@/lib/rbac"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      tenantId?: string | null
      roles: RoleName[]
      isTwoFactorVerified: boolean
    }
  }
}

// Augment @auth/core/jwt (modul asli) — next-auth/jwt hanya re-export,
// augmentasi via re-export tidak ter-merge ke interface JWT yang sebenarnya.
declare module "@auth/core/jwt" {
  interface JWT {
    id: string
    tenantId?: string | null
    roles: RoleName[]
    isTwoFactorVerified: boolean
  }
}

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await db.query.users.findFirst({
          where: eq(users.email, credentials.email as string),
        })
        if (!user?.password) return null

        const isValid = await bcryptjs.compare(
          credentials.password as string,
          user.password,
        )
        if (!isValid) return null

        return { id: user.id, name: user.name, email: user.email }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Fresh sign-in
      if (user?.id) {
        const userId = user.id
        token.id = userId

        // Bootstrap queries: tenant belum diketahui di titik ini, dan tabel
        // employees/user_roles kena RLS. Pakai bypass context (operasi sistem).
        const { tenantId, roleNames } = await withSuperAdminContext(async (tx) => {
          const employee = await tx.query.employees.findFirst({
            where: eq(employees.userId, userId),
          })

          const userRoleRows = await tx
            .select({ name: roles.name })
            .from(userRoles)
            .innerJoin(roles, eq(userRoles.roleId, roles.id))
            .where(eq(userRoles.userId, userId))

          return {
            tenantId: employee?.tenantId ?? null,
            roleNames: userRoleRows.map((r) => r.name as RoleName),
          }
        })

        token.tenantId = tenantId
        token.roles = roleNames
        token.isTwoFactorVerified = false

        const highestRole = getHighestPrivilegeRole(token.roles)
        token.exp = Math.floor(Date.now() / 1000) + SESSION_DURATIONS[highestRole]
      }

      // Handle unstable_update (e.g. after 2FA verification)
      if (trigger === "update" && session?.user) {
        if (session.user.isTwoFactorVerified === true) {
          token.isTwoFactorVerified = true
        }
        if (session.user.tenantId !== undefined) {
          token.tenantId = session.user.tenantId
        }
        if (session.user.roles) {
          token.roles = session.user.roles
        }
      }

      return token
    },

    async session({ session, token }) {
      session.user.id                  = token.id
      session.user.tenantId            = token.tenantId ?? null
      session.user.roles               = token.roles ?? []
      session.user.isTwoFactorVerified = token.isTwoFactorVerified ?? false
      return session
    },
  },
  events: {
    async signIn({ user }) {
      if (user?.id) {
        await logAudit({ userId: user.id, action: "auth.login" })
      }
    },
  },
})

// Re-export RBAC helpers agar import lama (@/lib/auth) tetap berfungsi
export { hasRole, hasAnyRole }
