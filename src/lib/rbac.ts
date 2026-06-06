import type { RoleName } from "@/lib/db/schema"

// Prioritas role — angka lebih tinggi = lebih privileged = sesi lebih pendek
export const ROLE_PRIORITY: Record<RoleName, number> = {
  super_admin: 4,
  hr_admin: 3,
  manager: 2,
  employee: 1,
}

// Durasi sesi per role (detik)
export const SESSION_DURATIONS: Record<RoleName, number> = {
  super_admin: 2 * 60 * 60, // 2 jam
  hr_admin: 4 * 60 * 60, // 4 jam
  manager: 8 * 60 * 60, // 8 jam
  employee: 8 * 60 * 60, // 8 jam
}

export function getHighestPrivilegeRole(roles: RoleName[]): RoleName {
  if (!roles.length) return "employee"
  return roles.reduce((highest, role) =>
    ROLE_PRIORITY[role] > ROLE_PRIORITY[highest] ? role : highest,
  )
}

export function hasRole(userRoles: RoleName[], role: RoleName): boolean {
  return userRoles.includes(role)
}

export function hasAnyRole(
  userRoles: RoleName[],
  ...checkRoles: RoleName[]
): boolean {
  return checkRoles.some((r) => userRoles.includes(r))
}
