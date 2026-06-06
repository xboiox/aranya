import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { eq } from "drizzle-orm"
import bcryptjs from "bcryptjs"
import { db } from "@/lib/db"
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

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    tenantId?: string | null
    roles: RoleName[]
    isTwoFactorVerified: boolean
  }
}

// Session timeouts per role (seconds)
const SESSION_DURATIONS: Record<RoleName, number> = {
  super_admin: 2 * 60 * 60,  // 2 hours
  hr_admin:    4 * 60 * 60,  // 4 hours
  manager:     8 * 60 * 60,  // 8 hours
  employee:    8 * 60 * 60,  // 8 hours
}

// Role priority — higher number = more privileged = shorter session
const ROLE_PRIORITY: Record<RoleName, number> = {
  super_admin: 4,
  hr_admin:    3,
  manager:     2,
  employee:    1,
}

function getHighestPrivilegeRole(userRoles: RoleName[]): RoleName {
  if (!userRoles.length) return "employee"
  return userRoles.reduce((highest, role) =>
    ROLE_PRIORITY[role] > ROLE_PRIORITY[highest] ? role : highest,
  )
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Fix: explicit table mapping so adapter uses our schema
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
    async jwt({ token, user }) {
      // Only runs on fresh sign-in (user object is present)
      if (user) {
        token.id = user.id

        // Load tenant from employee record
        const employee = await db.query.employees.findFirst({
          where: eq(employees.userId, user.id),
        })
        token.tenantId = employee?.tenantId ?? null

        // Load all roles for this user
        const userRoleRows = await db
          .select({ name: roles.name })
          .from(userRoles)
          .innerJoin(roles, eq(userRoles.roleId, roles.id))
          .where(eq(userRoles.userId, user.id))

        token.roles = userRoleRows.map((r) => r.name as RoleName)
        token.isTwoFactorVerified = false

        // Fix: set per-role expiry on the token itself
        const highestRole = getHighestPrivilegeRole(token.roles)
        token.exp = Math.floor(Date.now() / 1000) + SESSION_DURATIONS[highestRole]
      }
      return token
    },

    async session({ session, token }) {
      session.user.id                = token.id
      session.user.tenantId          = token.tenantId ?? null
      session.user.roles             = token.roles ?? []
      session.user.isTwoFactorVerified = token.isTwoFactorVerified ?? false
      return session
    },
  },
})

export function hasRole(userRoles: RoleName[], role: RoleName): boolean {
  return userRoles.includes(role)
}

export function hasAnyRole(userRoles: RoleName[], ...checkRoles: RoleName[]): boolean {
  return checkRoles.some((r) => userRoles.includes(r))
}
