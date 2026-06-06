import {
  Home,
  Clock,
  CalendarOff,
  CalendarCheck,
  FileText,
  Users,
  Shield,
  Building2,
  MapPin,
  Bell,
  type LucideIcon,
} from "lucide-react"
import type { RoleName } from "@/lib/db/schema"

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  roles?: RoleName[] // undefined = semua role
  disabled?: boolean // fitur belum dibangun (fase berikut)
}

export interface NavSection {
  title: string
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Self-Service",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: Home },
      { href: "/dashboard/notifications", label: "Notifikasi", icon: Bell },
      { href: "/dashboard/attendance", label: "Absensi", icon: Clock },
      { href: "/dashboard/leave", label: "Cuti", icon: CalendarOff },
      { href: "/dashboard/payslip", label: "Slip Gaji", icon: FileText, disabled: true },
    ],
  },
  {
    title: "Manajemen",
    items: [
      { href: "/dashboard/leave/approvals", label: "Persetujuan Cuti", icon: CalendarCheck, roles: ["manager", "hr_admin"] },
      { href: "/dashboard/employees", label: "Karyawan", icon: Users, roles: ["hr_admin"] },
      { href: "/dashboard/attendance/settings", label: "Pengaturan Absensi", icon: MapPin, roles: ["hr_admin"] },
      { href: "/dashboard/security", label: "Keamanan", icon: Shield, roles: ["hr_admin", "super_admin"] },
    ],
  },
  {
    title: "Platform",
    items: [
      { href: "/tenants", label: "Tenant", icon: Building2, roles: ["super_admin"] },
    ],
  },
]

export function visibleSections(roles: RoleName[]): NavSection[] {
  return NAV_SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter((i) => !i.roles || i.roles.some((r) => roles.includes(r))),
  })).filter((s) => s.items.length > 0)
}
