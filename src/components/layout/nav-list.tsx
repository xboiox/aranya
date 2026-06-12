"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { visibleSections } from "./nav-config"
import type { RoleName } from "@/lib/db/schema"

const NOTIF_HREF = "/dashboard/notifications"

interface Props {
  roles: RoleName[]
  activeModules?: string[]
  unreadCount?: number
  onNavigate?: () => void
}

export function NavList({ roles, activeModules = [], unreadCount = 0, onNavigate }: Props) {
  const pathname = usePathname()
  const t = useTranslations("nav")
  const tCommon = useTranslations("common")
  const sections = visibleSections(roles, activeModules)

  return (
    <nav className="space-y-4">
      {sections.map((section) => (
        <div key={section.titleKey}>
          <p className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t(`sections.${section.titleKey}`)}
          </p>
          <ul className="space-y-1">
            {section.items.map((item) => {
              const Icon = item.icon
              const active = pathname === item.href
              if (item.disabled) {
                return (
                  <li key={item.href}>
                    <span className="flex cursor-not-allowed items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground/60">
                      <Icon className="size-4" />
                      {t(`items.${item.labelKey}`)}
                      <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px]">
                        {tCommon("soon")}
                      </span>
                    </span>
                  </li>
                )
              }
              const showBadge = item.href === NOTIF_HREF && unreadCount > 0
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
                      active &&
                        "bg-sidebar-accent font-medium text-sidebar-accent-foreground before:absolute before:left-0 before:top-1/2 before:h-5 before:w-1 before:-translate-y-1/2 before:rounded-r-full before:bg-sidebar-primary",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-4 shrink-0 transition-colors",
                        active
                          ? "text-sidebar-primary"
                          : "text-muted-foreground group-hover:text-sidebar-foreground",
                      )}
                    />
                    {t(`items.${item.labelKey}`)}
                    {showBadge && (
                      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}
