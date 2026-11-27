import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: ReactNode
  /** Optional count shown as a quiet pill after the title (e.g. number of items). */
  count?: number | string | null
  description?: ReactNode
  /** Right-aligned actions: primary button last. */
  actions?: ReactNode
  /** Optional tabs row under the title. */
  tabs?: ReactNode
  /** Optional filter / search toolbar row. */
  toolbar?: ReactNode
  className?: string
}

/**
 * Standard page header: 22px title (+ count), optional description, actions on the right,
 * then optional tabs and toolbar rows. Horizontal / top padding comes from the shell's
 * content area (24px / 20px), so pages line up with the top bar.
 */
export function PageHeader({ title, count, description, actions, tabs, toolbar, className }: PageHeaderProps) {
  return (
    <header className={cn("feature-page-header hash-page-header", className)}>
      <div className="feature-page-header-row hash-page-header-row">
        <div className="min-w-0">
          <h1 className="hash-page-title">
            <span className="truncate">{title}</span>
            {count !== undefined && count !== null && count !== "" && <span className="hash-page-count">{count}</span>}
          </h1>
          {description && <p className="hash-page-description">{description}</p>}
        </div>
        {actions && <div className="page-header-actions hash-page-actions">{actions}</div>}
      </div>
      {tabs && <div className="hash-page-tabs">{tabs}</div>}
      {toolbar && <div className="hash-page-toolbar">{toolbar}</div>}
    </header>
  )
}
