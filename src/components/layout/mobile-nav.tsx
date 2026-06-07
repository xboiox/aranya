"use client"
import { useState } from "react"
import { Menu, X } from "lucide-react"
import { NavList } from "./nav-list"
import { UserMenu } from "./user-menu"
import type { RoleName } from "@/lib/db/schema"

interface Props {
  name?: string | null
  email?: string | null
  roles: RoleName[]
  activeModules?: string[]
  unreadCount?: number
}

export function MobileNav({ name, email, roles, activeModules = [], unreadCount = 0 }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <header className="flex h-14 items-center gap-3 border-b bg-sidebar px-4 text-sidebar-foreground md:hidden">
        <button
          type="button"
          aria-label="Buka menu"
          onClick={() => setOpen(true)}
          className="rounded-md p-1 hover:bg-sidebar-accent"
        >
          <Menu className="size-5" />
        </button>
        <span className="text-lg font-bold">Aranya HRIS</span>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 flex h-full w-72 flex-col bg-sidebar p-3 text-sidebar-foreground shadow-xl">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-lg font-bold">Aranya HRIS</span>
              <button
                type="button"
                aria-label="Tutup menu"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 hover:bg-sidebar-accent"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NavList roles={roles} activeModules={activeModules} unreadCount={unreadCount} onNavigate={() => setOpen(false)} />
            </div>
            <div className="border-t pt-3">
              <UserMenu name={name} email={email} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
