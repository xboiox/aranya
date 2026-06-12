import { cn } from "@/lib/utils"

interface BrandProps {
  /** Hide the wordmark and show only the logo mark. */
  iconOnly?: boolean
  className?: string
}

/**
 * Aranya brand lockup: a teal gradient mark + wordmark.
 * Used in the sidebar, mobile header, and auth screens for a consistent identity.
 */
export function Brand({ iconOnly = false, className }: BrandProps) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <BrandMark />
      {!iconOnly && (
        <span className="text-lg font-bold tracking-tight">
          Aranya
          <span className="ml-1 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            HRIS
          </span>
        </span>
      )}
    </span>
  )
}

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-chart-2 text-sm font-bold text-primary-foreground shadow-sm",
        className
      )}
    >
      A
    </span>
  )
}
