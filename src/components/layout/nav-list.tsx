"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { visibleSections } from "./nav-config"
import type { RoleName } from "@/lib/db/schema"

const NOTIF_HREF = "/dashboard/notifications"

interface Props {
  roles: RoleName[]
  unreadCount?: number
  onNavigate?: () => void
}

export function NavList({ roles, unreadCount = 0, onNavigate }: Props) {
  const pathname = usePathname()
  const sections = visibleSections(roles)

  return (
    <nav className="space-y-4">
      {sections.map((section) => (
        <div key={section.title}>
          <p className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {section.title}
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
                      {item.label}
                      <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px]">
                        Segera
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
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-sidebar-accent",
                      active && "bg-sidebar-accent font-medium",
                    )}
                  >
                    <Icon className="size-4" />
                    {item.label}
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
