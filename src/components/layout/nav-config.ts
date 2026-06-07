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
  Network,
  Timer,
  Wallet,
  ScrollText,
  CalendarClock,
  GraduationCap,
  Package,
  type LucideIcon,
} from "lucide-react"
import type { RoleName } from "@/lib/db/schema"

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  roles?: RoleName[] // undefined = semua role
  module?: string // jika diisi, hanya tampil bila modul aktif untuk tenant
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
      { href: "/dashboard/overtime", label: "Lembur", icon: Timer },
      { href: "/dashboard/organization", label: "Struktur Organisasi", icon: Network },
      { href: "/dashboard/payslip", label: "Slip Gaji", icon: FileText },
    ],
  },
  {
    title: "Manajemen",
    items: [
      { href: "/dashboard/leave/approvals", label: "Persetujuan Cuti", icon: CalendarCheck, roles: ["manager", "hr_admin"] },
      { href: "/dashboard/overtime/approvals", label: "Persetujuan Lembur", icon: Timer, roles: ["manager", "hr_admin"] },
      { href: "/dashboard/employees", label: "Karyawan", icon: Users, roles: ["hr_admin"] },
      { href: "/dashboard/payslip/manage", label: "Kelola Slip Gaji", icon: FileText, roles: ["hr_admin"] },
      { href: "/dashboard/leave/settings", label: "Pengaturan Cuti", icon: CalendarOff, roles: ["hr_admin"] },
      { href: "/dashboard/attendance/team", label: "Absensi Tim", icon: Clock, roles: ["hr_admin"] },
      { href: "/dashboard/attendance/shifts", label: "Shift Kerja", icon: CalendarClock, roles: ["hr_admin"] },
      { href: "/dashboard/attendance/settings", label: "Pengaturan Absensi", icon: MapPin, roles: ["hr_admin"] },
      { href: "/dashboard/security", label: "Keamanan", icon: Shield, roles: ["hr_admin", "super_admin"] },
      { href: "/dashboard/audit", label: "Audit Log", icon: ScrollText, roles: ["hr_admin", "super_admin"] },
    ],
  },
  {
    title: "HR Ops & Performance (Modul 2)",
    items: [
      { href: "/dashboard/training", label: "Training & Sertifikasi", icon: GraduationCap, module: "MODULE_2" },
      { href: "/dashboard/training/manage", label: "Kelola Training", icon: GraduationCap, roles: ["hr_admin"], module: "MODULE_2" },
      { href: "/dashboard/assets", label: "Aset Saya", icon: Package, module: "MODULE_2" },
      { href: "/dashboard/assets/manage", label: "Kelola Aset", icon: Package, roles: ["hr_admin"], module: "MODULE_2" },
    ],
  },
  {
    title: "Payroll (Modul 3)",
    items: [
      { href: "/dashboard/payroll", label: "Payroll", icon: Wallet, roles: ["hr_admin"], module: "MODULE_3" },
    ],
  },
  {
    title: "Platform",
    items: [
      { href: "/tenants", label: "Tenant", icon: Building2, roles: ["super_admin"] },
    ],
  },
]

export function visibleSections(
  roles: RoleName[],
  activeModules: string[] = [],
): NavSection[] {
  return NAV_SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter(
      (i) =>
        (!i.roles || i.roles.some((r) => roles.includes(r))) &&
        (!i.module || activeModules.includes(i.module)),
    ),
  })).filter((s) => s.items.length > 0)
}
