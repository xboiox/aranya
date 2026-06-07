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

export function Sidebar({ name, email, roles, activeModules = [], unreadCount = 0 }: Props) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-14 items-center border-b px-4 text-lg font-bold">
        Aranya HRIS
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <NavList roles={roles} activeModules={activeModules} unreadCount={unreadCount} />
      </div>
      <div className="border-t p-3">
        <UserMenu name={name} email={email} />
      </div>
    </aside>
  )
}
