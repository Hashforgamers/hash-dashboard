"use client";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, Monitor, Play, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
export interface SessionConsole { consoleId: number; consoleModelNumber: string; brand: string; }
export function SessionConsoleDialog({ open, onClose, consoles, selectedIds, requiredCount, system, loading, submitting, error, onSelect, onRetry, onStart }: {
  open: boolean; onClose: () => void; consoles: SessionConsole[]; selectedIds: number[]; requiredCount: number; system: string; loading: boolean; submitting: boolean; error: string; onSelect: (id: number) => void; onRetry: () => void; onStart: () => void;
}) {
  return <Dialog open={open} onOpenChange={(next) => { if (!next && !submitting) onClose(); }}>
    <DialogContent data-workspace-dialog={undefined} className="flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl flex-col gap-0 overflow-hidden rounded-lg p-0 border-border bg-card text-foreground">
      <div className="border-b p-4 border-border">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-emerald-400">Session setup</p>
        <DialogTitle>Select {requiredCount > 1 ? `${requiredCount} consoles` : "a console"}</DialogTitle>
        <DialogDescription className="mt-2 text-sm text-muted-foreground">Choose {requiredCount > 1 ? "a station for each player" : "an available station"} to start your {system || "gaming"} session.</DialogDescription>
      </div>
      <div className="min-h-0 overflow-y-auto p-6" aria-busy={loading}>
        {loading ? <div role="status" className="flex items-center justify-center gap-3 py-12 text-sm text-muted-foreground"><RefreshCw className="h-4 w-4 animate-spin" />Loading consoles…</div> : <>
          <div className="mb-3 flex justify-between text-xs font-medium text-muted-foreground"><span>{consoles.length} available</span><span aria-live="polite">{selectedIds.length} of {requiredCount} selected</span></div>
          {consoles.length ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" aria-label="Available consoles">{consoles.map((console) => {
            const selected = selectedIds.includes(console.consoleId);
            return <button type="button" key={console.consoleId} aria-pressed={selected} disabled={submitting || (!selected && requiredCount > 1 && selectedIds.length >= requiredCount)} onClick={() => onSelect(console.consoleId)} className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 ${selected ? "border-emerald-500 bg-emerald-500/10" : "border-border hover:border-border"}`}>
              <Monitor className={`mt-1 h-5 w-5 shrink-0 ${selected ? "text-emerald-500" : "text-muted-foreground"}`} />
              <span className="min-w-0 flex-1"><span className="block break-words text-sm font-semibold">{console.consoleModelNumber || `Console ${console.consoleId}`}</span><span className="mt-1 block text-xs text-muted-foreground">{console.brand || system} · #{console.consoleId}</span></span>
              <span className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${selected ? "border-emerald-500 bg-emerald-500 text-white" : "border-border"}`}>{selected && <Check className="h-3 w-3" />}</span>
            </button>;
          })}</div> : <div className="py-8 text-center"><Monitor className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><p className="text-sm font-medium">{error ? "Consoles could not be loaded" : "No consoles available"}</p><p className="mt-1 text-sm text-muted-foreground">{error ? "Retry to check availability." : "A station must be free before you can start."}</p></div>}
        </>}
        {error && <p role="alert" className="mt-4 rounded-lg border p-3 text-sm border-red-900 bg-red-950/30 text-red-300">{error}</p>}
      </div>
      <div className="flex gap-3 border-t p-4 border-border bg-muted/30">
        <button type="button" onClick={onRetry} disabled={loading || submitting} className="rounded-lg border px-4 py-3 text-sm font-medium disabled:opacity-50 border-border hover:bg-muted">Refresh</button>
        <button type="button" onClick={onStart} disabled={selectedIds.length !== requiredCount || loading || submitting} className={cn(buttonVariants({ variant: "success", size: "lg" }), "flex-1 disabled:cursor-not-allowed")}>{submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}{submitting ? "Starting session…" : "Start session"}</button>
      </div>
    </DialogContent>
  </Dialog>;
}
