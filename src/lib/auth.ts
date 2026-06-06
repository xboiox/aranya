import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { eq } from "drizzle-orm"
import bcryptjs from "bcryptjs"
import { db } from "@/lib/db"
import { users, userRoles, roles, employees } from "@/lib/db/schema"
import type { RoleName } from "@/lib/db/schema"

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
  interface JWT {
    id: string
    tenantId?: string | null
    roles: RoleName[]
    isTwoFactorVerified: boolean
  }
}

// Session timeouts per role (seconds)
const SESSION_DURATIONS: Record<RoleName, number> = {
  super_admin: 2 * 60 * 60,
  hr_admin: 4 * 60 * 60,
  manager: 8 * 60 * 60,
  employee: 8 * 60 * 60,
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id

        // Load tenant and roles
        const employee = await db.query.employees.findFirst({
          where: eq(employees.userId, user.id),
        })
        token.tenantId = employee?.tenantId ?? null

        const userRoleRows = await db
          .select({ name: roles.name })
          .from(userRoles)
          .innerJoin(roles, eq(userRoles.roleId, roles.id))
          .where(eq(userRoles.userId, user.id))

        token.roles = userRoleRows.map((r) => r.name as RoleName)
        token.isTwoFactorVerified = false
      }
      return token
    },

    async session({ session, token }) {
      session.user.id = token.id as string
      session.user.tenantId = token.tenantId as string | null
      session.user.roles = (token.roles as RoleName[]) ?? []
      session.user.isTwoFactorVerified =
        (token.isTwoFactorVerified as boolean) ?? false
      return session
    },
  },
  jwt: {
    // Session duration based on highest-privilege role
    maxAge: SESSION_DURATIONS.employee,
  },
})

export function hasRole(userRoles: RoleName[], role: RoleName): boolean {
  return userRoles.includes(role)
}

export function hasAnyRole(userRoles: RoleName[], ...checkRoles: RoleName[]): boolean {
  return checkRoles.some((r) => userRoles.includes(r))
}
