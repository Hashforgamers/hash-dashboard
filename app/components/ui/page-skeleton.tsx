import { cn } from "@/lib/utils"

// Placeholder shapes that mirror each screen's real layout, so content fades in without the page jumping.
function Bone({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-lg bg-white/[0.06] motion-reduce:animate-none", className)} />
}

function Panel({ className, children }: { className?: string; children?: React.ReactNode }) {
  return <div aria-hidden="true" className={cn("rounded-[14px] border bg-card p-4", className)}>{children}</div>
}

function Status({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  )
}

function Rows({ count }: { count: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Bone className="h-8 w-8 shrink-0 rounded-full" />
          <Bone className="h-3.5 flex-1" />
          <Bone className="hidden h-3.5 w-24 sm:block" />
          <Bone className="h-7 w-16" />
        </div>
      ))}
    </div>
  )
}

export function RowsSkeleton({ rows = 4, label = "Loading", className }: { rows?: number; label?: string; className?: string }) {
  return <Status label={label} className={cn("p-1", className)}><Rows count={rows} /></Status>
}

export function DashboardSkeleton() {
  return (
    <Status label="Loading dashboard" className="flex h-full min-h-0 flex-col gap-3">
      <div className="grid gap-3 xl:grid-cols-12">
        <Panel className="xl:col-span-8 2xl:col-span-9">
          <Bone className="mb-4 h-4 w-28" />
          <div className="flex gap-2">{Array.from({ length: 4 }, (_, i) => <Bone key={i} className="h-12 w-20" />)}<Bone className="ml-auto h-9 w-20" /></div>
        </Panel>
        <Panel className="xl:col-span-4 2xl:col-span-3"><Bone className="mb-4 h-4 w-24" /><Bone className="h-12 w-full" /></Panel>
      </div>
      <div className="grid min-h-[360px] flex-1 gap-3 xl:grid-cols-12">
        <Panel className="xl:col-span-8 2xl:col-span-9"><Bone className="mb-4 h-4 w-32" /><Bone className="mb-5 h-9 w-full" /><Rows count={4} /></Panel>
        <Panel className="xl:col-span-4 2xl:col-span-3"><Bone className="mb-4 h-4 w-24" /><Bone className="h-9 w-full" /></Panel>
      </div>
    </Status>
  )
}

export function CardGridSkeleton({ count = 8, label = "Loading" }: { count?: number; label?: string }) {
  return (
    <Status label={label} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <Panel key={i} className="flex h-[242px] flex-col gap-3">
          <div className="flex items-start gap-3"><Bone className="h-10 w-10" /><div className="flex flex-1 flex-col gap-2"><Bone className="h-4 w-3/4" /><Bone className="h-3 w-8" /></div></div>
          <Bone className="mt-auto h-3 w-1/2" />
          <div className="flex gap-2"><Bone className="h-8 flex-1" /><Bone className="h-8 flex-1" /><Bone className="h-8 w-8" /></div>
        </Panel>
      ))}
    </Status>
  )
}

export function TableSkeleton({ rows = 6, stats = 0, label = "Loading" }: { rows?: number; stats?: number; label?: string }) {
  return (
    <Status label={label} className="flex flex-col gap-3">
      {stats > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: stats }, (_, i) => <Panel key={i} className="flex h-[91px] flex-col gap-3"><Bone className="h-3 w-24" /><Bone className="h-6 w-20" /></Panel>)}
        </div>
      )}
      <Bone className="h-9 w-full" />
      <Panel>
        <div className="mb-4 flex gap-4">{Array.from({ length: 5 }, (_, i) => <Bone key={i} className="h-3 flex-1" />)}</div>
        <div className="flex flex-col gap-4">{Array.from({ length: rows }, (_, i) => <Bone key={i} className="h-4 w-full" />)}</div>
      </Panel>
    </Status>
  )
}

export function SettingsSkeleton() {
  return (
    <Status label="Loading settings" className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
      <div className="flex flex-col gap-3">
        <Panel className="flex flex-col items-center gap-3"><Bone className="h-16 w-16 rounded-full" /><Bone className="h-4 w-32" /><Bone className="h-5 w-24 rounded-full" /></Panel>
        <Panel className="flex flex-col gap-2">{Array.from({ length: 8 }, (_, i) => <Bone key={i} className="h-7 w-full" />)}</Panel>
      </div>
      <Panel className="flex flex-col gap-3"><Bone className="h-4 w-28" /><Bone className="h-3 w-48" /><div className="flex gap-3"><Bone className="h-24 w-36" /><Bone className="h-24 w-36" /></div></Panel>
    </Status>
  )
}
