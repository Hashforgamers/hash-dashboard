import type { ReactNode } from "react"

export function PageHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <header className="feature-page-header">
      <div className="feature-page-header-row">
        <h1 className="premium-heading">{title}</h1>
        {actions && <div className="page-header-actions">{actions}</div>}
      </div>
    </header>
  )
}
