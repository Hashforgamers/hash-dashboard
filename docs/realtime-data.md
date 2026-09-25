# Dashboard live data

The existing DashboardDataProvider is the in-memory, cafe-scoped snapshot cache.
DashboardDataBus applies booking/current-slot/console socket payloads immediately.
Repeated booking IDs merge into existing records, so updated fields are visible
without waiting for a snapshot. No new service or dependency is required.

Slot inventory uses a separate 100 ms Set-backed batch to coalesce the bridge's
related booking events. Its refresh reuses the console catalog and fetches slot
availability directly. Slower aggregate and other-module reconciliation uses a
fixed five-second window. The first event starts the timer; later events do not postpone it. The
slow batch invalidates non-booking modules once and reconciles landing/consoles once
when bookings changed. This retains server-authoritative totals and details that
are missing from partial event payloads. Continuous activity can still cause one
snapshot pair every five seconds. This is reduced-request realtime, not zero-API.

Initial loads and explicit refreshes still fetch. Refreshes retain existing data
without setting the provider's initial-loading flags. Empty console snapshots are
cached too. HTTP-level in-flight deduplication continues to combine identical reads.
The cache stays in memory and resets on cafe changes.

Reconnect reconciliation lives in the data bus, including reconnects before React
has installed event listeners. A visible, online dashboard falls back to snapshots
every minute while disconnected. Returning to a visible tab checks the existing
60-second snapshot TTL. Pending-notification polling also runs only while
 disconnected, visible and online; its event and panel-open refreshes remain.

Scope: landing/consoles event reconciliation and notification fallback. Other
feature-specific polling (reports, gamer stats and play sessions) remains. Removing
all reconciliation requires server events carrying complete/versioned snapshots
or replayable deltas, including aggregate totals.

Validation: `node --test tests/event-batch.test.cjs` covers duplicate event storms,
fixed-window follow-up batches and cancellation on cleanup.

Grid single-click selection waits 250 ms to distinguish it from a double-click.
Double-click cancels the pending toggle, then selects and opens the form in one
update. The open form's slot picker still toggles immediately. The booking dialog
opens at its final size without nested fades, scaling or backdrop blur, and slot
labels disable native double-click text selection.
Late slot-booking reads and superseded snapshots are ignored, and background
snapshots preserve the current console filter. Live counts still depend on socket
delivery and the slot API response; no client-side count is guessed.

Interaction regression checks: `node --test tests/slot-interaction.test.cjs tests/event-batch.test.cjs`.
