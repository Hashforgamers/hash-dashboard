"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "../../(layout)/dashboard-layout"
import { PageHeader } from "../../components/page-header"
import { SHORTCUTS, isMacPlatform, type Shortcut } from "@/lib/shortcuts"

const GROUPS: { title: Shortcut["group"]; note: string }[] = [
  { title: "General", note: "Work anywhere in the dashboard, except while you're typing in a field." },
  { title: "Go to", note: "Press G, let go, then the second key within a second." },
  { title: "In popups", note: "Inside the command palette and other popups." },
]

function Keys({ keys, mac, sequence, either }: { keys: string[]; mac: boolean; sequence?: boolean; either?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {keys.map((k, i) => (
        <span key={k + i} className="inline-flex items-center gap-1.5">
          {i > 0 && <span className="text-xs text-muted-foreground">{sequence ? "then" : either ? "or" : "+"}</span>}
          <kbd className="inline-flex h-7 min-w-7 items-center justify-center rounded-md border border-white/10 bg-white/[0.06] px-2 font-sans text-xs font-medium text-foreground shadow-[0_1px_0_rgba(255,255,255,0.06)]">
            {k === "Mod" ? (mac ? "⌘" : "Ctrl") : k}
          </kbd>
        </span>
      ))}
    </span>
  )
}

export default function ShortcutsPage() {
  const [mac, setMac] = useState(false)
  useEffect(() => setMac(isMacPlatform()), [])

  return (
    <DashboardLayout>
      <div className="feature-page-shell">
        <PageHeader title="Keyboard Shortcuts" />
        <p className="max-w-2xl text-sm text-muted-foreground">
          Move around the dashboard without the mouse. Press <Keys keys={["?"]} mac={mac} /> from any page to come back here.
        </p>
        <div className="grid gap-4 lg:grid-cols-2">
          {GROUPS.map(({ title, note }) => (
            <section key={title} className="dashboard-module-panel flex flex-col gap-3 border p-5" aria-labelledby={`sc-${title}`}>
              <div>
                <h2 id={`sc-${title}`} className="section-title">{title}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{note}</p>
              </div>
              <dl className="divide-y divide-white/[0.06]">
                {SHORTCUTS.filter((s) => s.group === title).map((s) => (
                  <div key={s.label} className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-sm">{s.label}</dt>
                    <dd className="shrink-0"><Keys keys={s.keys} mac={mac} sequence={Boolean(s.sequence)} either={s.either} /></dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
