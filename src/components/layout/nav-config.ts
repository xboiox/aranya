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
  ListChecks,
  Target,
  BarChart3,
  type LucideIcon,
} from "lucide-react"
import type { RoleName } from "@/lib/db/schema"

export interface NavItem {
  href: string
  label: string // fallback / non-i18n contexts
  labelKey: string // kunci i18n di `nav.items.*`
  icon: LucideIcon
  roles?: RoleName[] // undefined = semua role
  module?: string // jika diisi, hanya tampil bila modul aktif untuk tenant
  disabled?: boolean // fitur belum dibangun (fase berikut)
}

export interface NavSection {
  title: string // fallback / non-i18n contexts
  titleKey: string // kunci i18n di `nav.sections.*`
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Self-Service",
    titleKey: "selfService",
    items: [
      { href: "/dashboard", label: "Dashboard", labelKey: "dashboard", icon: Home },
      { href: "/dashboard/notifications", label: "Notifikasi", labelKey: "notifications", icon: Bell },
      { href: "/dashboard/attendance", label: "Absensi", labelKey: "attendance", icon: Clock },
      { href: "/dashboard/leave", label: "Cuti", labelKey: "leave", icon: CalendarOff },
      { href: "/dashboard/overtime", label: "Lembur", labelKey: "overtime", icon: Timer },
      { href: "/dashboard/organization", label: "Struktur Organisasi", labelKey: "organization", icon: Network },
      { href: "/dashboard/payslip", label: "Slip Gaji", labelKey: "payslip", icon: FileText },
    ],
  },
  {
    title: "Manajemen",
    titleKey: "management",
    items: [
      { href: "/dashboard/leave/approvals", label: "Persetujuan Cuti", labelKey: "leaveApprovals", icon: CalendarCheck, roles: ["manager", "hr_admin"] },
      { href: "/dashboard/overtime/approvals", label: "Persetujuan Lembur", labelKey: "overtimeApprovals", icon: Timer, roles: ["manager", "hr_admin"] },
      { href: "/dashboard/employees", label: "Karyawan", labelKey: "employees", icon: Users, roles: ["hr_admin"] },
      { href: "/dashboard/payslip/manage", label: "Kelola Slip Gaji", labelKey: "payslipManage", icon: FileText, roles: ["hr_admin"] },
      { href: "/dashboard/leave/settings", label: "Pengaturan Cuti", labelKey: "leaveSettings", icon: CalendarOff, roles: ["hr_admin"] },
      { href: "/dashboard/attendance/team", label: "Absensi Tim", labelKey: "attendanceTeam", icon: Clock, roles: ["hr_admin"] },
      { href: "/dashboard/attendance/shifts", label: "Shift Kerja", labelKey: "shifts", icon: CalendarClock, roles: ["hr_admin"] },
      { href: "/dashboard/attendance/settings", label: "Pengaturan Absensi", labelKey: "attendanceSettings", icon: MapPin, roles: ["hr_admin"] },
      { href: "/dashboard/security", label: "Keamanan", labelKey: "security", icon: Shield, roles: ["hr_admin", "super_admin"] },
      { href: "/dashboard/audit", label: "Audit Log", labelKey: "audit", icon: ScrollText, roles: ["hr_admin", "super_admin"] },
    ],
  },
  {
    title: "HR Ops & Performance (Modul 2)",
    titleKey: "hrOps",
    items: [
      { href: "/dashboard/training", label: "Training & Sertifikasi", labelKey: "training", icon: GraduationCap, module: "MODULE_2" },
      { href: "/dashboard/training/manage", label: "Kelola Training", labelKey: "trainingManage", icon: GraduationCap, roles: ["hr_admin"], module: "MODULE_2" },
      { href: "/dashboard/assets", label: "Aset Saya", labelKey: "assets", icon: Package, module: "MODULE_2" },
      { href: "/dashboard/assets/manage", label: "Kelola Aset", labelKey: "assetsManage", icon: Package, roles: ["hr_admin"], module: "MODULE_2" },
      { href: "/dashboard/kpi", label: "KPI Saya", labelKey: "kpi", icon: Target, module: "MODULE_2" },
      { href: "/dashboard/kpi/team", label: "KPI Tim", labelKey: "kpiTeam", icon: Target, roles: ["manager", "hr_admin"], module: "MODULE_2" },
      { href: "/dashboard/kpi/periods", label: "Periode KPI", labelKey: "kpiPeriods", icon: Target, roles: ["hr_admin"], module: "MODULE_2" },
      { href: "/dashboard/onboarding", label: "Checklist Saya", labelKey: "onboarding", icon: ListChecks, module: "MODULE_2" },
      { href: "/dashboard/onboarding/manage", label: "Onboarding/Offboarding", labelKey: "onboardingManage", icon: ListChecks, roles: ["hr_admin"], module: "MODULE_2" },
      { href: "/dashboard/analytics", label: "HR Analytics", labelKey: "analytics", icon: BarChart3, roles: ["hr_admin"], module: "MODULE_2" },
    ],
  },
  {
    title: "Payroll (Modul 3)",
    titleKey: "payroll",
    items: [
      { href: "/dashboard/payroll", label: "Payroll", labelKey: "payroll", icon: Wallet, roles: ["hr_admin"], module: "MODULE_3" },
    ],
  },
  {
    title: "Platform",
    titleKey: "platform",
    items: [
      { href: "/tenants", label: "Tenant", labelKey: "tenants", icon: Building2, roles: ["super_admin"] },
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
