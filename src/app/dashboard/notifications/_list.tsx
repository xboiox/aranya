"use client"
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  markNotificationRead,
  markAllNotificationsRead,
} from "@/modules/notifications/actions"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Item {
  id: string
  title: string
  body: string
  isRead: boolean
  createdAt: string
}

export default function NotificationList({
  items,
  hasUnread,
}: {
  items: Item[]
  hasUnread: boolean
}) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function markAll() {
    startTransition(async () => {
      await markAllNotificationsRead()
      router.refresh()
    })
  }

  function markOne(id: string) {
    startTransition(async () => {
      await markNotificationRead(id)
      router.refresh()
    })
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada notifikasi.</p>
  }

  return (
    <div className="space-y-3">
      {hasUnread && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={markAll} disabled={pending}>
            Tandai semua dibaca
          </Button>
        </div>
      )}
      <ul className="space-y-2">
        {items.map((n) => (
          <li
            key={n.id}
            className={cn(
              "rounded-lg border px-4 py-3",
              !n.isRead && "border-primary/40 bg-primary/5",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-sm text-muted-foreground">{n.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">{n.createdAt}</p>
              </div>
              {!n.isRead && (
                <Button variant="ghost" size="xs" onClick={() => markOne(n.id)} disabled={pending}>
                  Tandai
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
