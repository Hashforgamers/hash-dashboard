# Cafe dashboard performance and reliability audit — 19 September 2026

## Outcome and scope

Local fixes cover the shared request/cache/socket infrastructure, dashboard refreshes, slots, transaction polling, pricing loading, reviews, credit, passes, extras, tournament reads, the booking expiry job, and the Store product query. They address concrete defects found in source; they are not a production latency certification.

The [route inventory](api-route-inventory.csv) catalogs 486 source-declared routes across dashboard (164), booking (87), onboarding (89), and user onboarding (146). It includes legacy/unmounted controllers and omits blueprint prefixes. This is an inventory, **not 486 executed API tests**. Payment writes, settlement, live bookings, production migrations and deployment were not performed.

## Changes

- **Request/cache infrastructure:** request identity includes authorization headers and response format; requests with independent cancellation no longer share cancellation. Permanent HTTP errors and cancelled requests do not retry. Writes are not automatically retried.
- **Module caches:** refresh callbacks remain stable when cache data changes, repeated refreshes coalesce, TTL is evaluated when refresh is called, and an invalidation during a request triggers one follow-up. Responses for a previous cafe/key are discarded. Vendor-dependent modules wait for vendor context.
- **Dashboard:** stable refresh callbacks and functional socket updates remove repeated subscriptions and stale-state overwrites. Event bursts batch invalidations for 150 ms. Duplicate event-driven optimistic revenue/bookings increments were removed; refreshed server totals are authoritative. Forced snapshot reads bypass the browser HTTP response cache.
- **Sockets:** joins are idempotent per vendor; switching vendor leaves the old local room. Reconnect produces one dashboard notification. Browser heartbeats tolerate hidden tabs. Backend connect/join/heartbeat paths no longer wait indefinitely for disconnection; one supervisor initiates connections. Backend snapshot caches invalidate before relevant booking events reach clients. A cache invalidation error does not drop the event.
- **Slots:** explicit refresh now bypasses the five-second backend cache. Legacy timestamp cache busters are also recognized. The fresh batch replaces stale browser data.
- **Transactions and gamers:** background polling skips hidden tabs. Transactions retain the visible table while refreshing, prevent overlapping polls, and abort on navigation/filter changes.
- **Pricing:** offers/controllers/squad/tax/game-catalog data loads when its tab is needed instead of eagerly loading every tab.
- **Reviews:** search is debounced by 300 ms; cached results correctly clear initial loading. Credit screens hydrate after cached data changes.
- **Tournaments:** existing render-loop regression remains covered. HTTP response caching was removed from event reads so refreshes after edits cannot replay a 7–10 second old response; page-level caching and in-flight deduplication remain.
- **Booking expiry:** lock the booking row, restore capacity and change status in one transaction, and skip already cancelled/paid/expired bookings. Missing slot rows and database failures are surfaced instead of silently succeeding. PC squad capacity is preserved.
- **Store:** eagerly load the product collaborator in the product query, removing one supplier lookup per product. Skip orphan products that cannot be ordered rather than failing the entire listing.

## Module coverage and outstanding measurements

| Requested area | Source paths reviewed / changes | Remaining runtime verification |
|---|---|---|
| Overview, schedule, booking, upcoming/current sessions | Shared snapshot provider, data bus, `newSlot.tsx`, booking/slot controllers, socket bridge | Two cafe devices; create/check-in/extend/cancel and verify synchronized capacity and totals |
| Add meal, extra services | Extras module cache, vendor-scoped categories/menu routes, booking flow | Stock/depletion and billing updates under concurrent cashiers |
| Gaming consoles add/list | Shared console provider, availability socket handling, existing console indexes | Busy/free transitions; add/edit then refresh; scoped access |
| Transactions | Abortable bounded polling and date-scoped reporting; existing report indexes | Large date-range response size, SQL plan, settlement totals |
| Gamers | Hidden-tab polling; gamer list/stats routes | High-volume customer list and search payload sizes |
| Slot rates, offers, controllers, squad | Lazy tab data and stable shared cache; pricing index migrations | Save each rule then quote/book, including squad pricing |
| Credit account/ledger/settlement/payments | Account/users/statement paths, cache hydration | Concurrent settlement idempotency, large ledgers, payment reconciliation |
| Gaming passes | Vendor gating/cache; pass endpoints and existing indexes | Redemption concurrency, expiry and balances |
| Store | Product/controller model path; collaborator N+1 fixed | Server pagination for large catalog; concurrent order stock locking |
| Tournaments | Cache/render regression, event list/detail/registrations reads | Server pagination: list currently loads all vendor events; large bracket performance |
| Cafe reviews | Debounced frontend list, internal/public review queries | Search query plans, rating/status filters, cross-worker public-cache freshness |
| Team access | Vendor-scoped staff routes and access context | PIN/role enforcement, revoked sessions and tenant isolation |

## Database/index checks

Existing SQL files cover transaction date/vendor filters, available games, controller pricing, offers, vendor slot/dashboard tables, passes, extras and tournament match ordering. Their presence in a repository does **not** establish deployment or planner use.

Run `../hfg-dashboard-service/sql/20260919_performance_audit_read_only.sql` on each service database with a monitoring/read-only role. It reports installed/invalid indexes, table scans, dead tuples, statistics age, connection waits and index sizes without exposing query text or changing data. It uses a read-only transaction and a 15-second statement timeout.

Next, obtain actual slow normalized queries and staging `EXPLAIN (ANALYZE, BUFFERS)` plans. Check vendor/date ordering on transactions and slots, vendor/status/date on reviews, vendor/date on events, and account/user/date on credit ledgers. Check duplicate indexes before proposing new ones. Do not apply all historical index migrations blindly during trading hours; some use ordinary CREATE INDEX inside a transaction and may block writes. No index DDL was run in this task.

## Deployment items that still block a production-readiness claim

1. **Cross-process events and cache:** caches are process-local and the Socket.IO setup reviewed has no shared message queue. An RQ worker's local emit does not by itself reach web-process connections. Confirm/configure Redis Socket.IO fan-out, bridge ownership and cache invalidation across workers before increasing worker count. Existing frontend refresh behavior does not guarantee delivery of every job event.
2. **Job supervision:** the booking container starts web, RQ and scheduler together. Verify worker/scheduler liveness, scheduled-job lateness, failure queue, retries and restart behavior independently. The separate Celery background processor appears to be a legacy path; its active deployment/dispatch was not established, so it was not changed on assumption.
3. **Authorization:** reviewed socket join handlers trust a supplied vendor ID and include an admin tap. Confirm server-side authenticated room authorization and gateway/internal-service restrictions before onboarding unrelated cafes. Tenant-isolated browser cache keys are not a substitute for backend authorization.
4. **Unbounded reads:** event lists and Store catalogs still return complete collections. Large gamer/report/ledger payloads need measured pagination and query-plan work. Avoid hiding this with longer TTLs.
5. **Type/lint baseline:** Next configuration skips type validation and lint during builds. Standalone TypeScript still reports pre-existing errors, including `master/page.tsx`, booking components and `components/ui/chart.tsx`. Comparison with the pre-change baseline found no additional diagnostic locations/types from this patch; the compiler's displayed union ordering varies. A successful build alone is not a clean typecheck.
6. **Live evidence:** no authenticated end-to-end cafe session, production database inspection, load test, payment reconciliation, network-loss soak test or release was executed. Do not promise a measured p95 or cafe capacity based on this source audit.

## Reproducible verification

Completed locally:

- `hash-dashboard`: `node --test tests/*.test.cjs` — 9 passing tests covering request identity, retry/cancellation, cache TTL/coalescing, in-flight invalidation, cafe changes and the tournament render loop.
- `hash-dashboard`: `npm run build` — passed (type/lint skips noted above).
- `hfg-booking`: `python3 -m unittest discover -s tests -v` — 7 passing tests covering duplicate expiry jobs, cancelled/paid states, PC squads, rollback/error reporting and slot cache bypass.
- `hfg-dashboard-service`: `python3 -m unittest discover -s tests -p 'test_websocket_bridge.py' -v` — 4 passing tests covering nonblocking joins/connect, continued heartbeat, one supervisor and invalidate-before-emit.
- Changed Python files compile. Backend unit tests compile the actual functions from source with mocked DB/network boundaries; they do not prove PostgreSQL lock behavior or live Socket.IO delivery.
- The latency probe was checked against local successful and failing HTTP endpoints. It is not a production measurement.
- Required `graphify query`/`graphify update .` commands could not run because `graphify` is not installed; graph output was not refreshed.

### API latency probe

Create a private manifest using actual **read-only staging** endpoints:

```json
[
  {"name":"landing", "url":"https://YOUR-DASHBOARD/api/getLandingPage/vendor/YOUR_VENDOR_ID", "tokenEnv":"CAFE_TEST_TOKEN"},
  {"name":"consoles", "url":"https://YOUR-DASHBOARD/api/getConsoles/vendor/YOUR_VENDOR_ID", "tokenEnv":"CAFE_TEST_TOKEN"}
]
```

Supply a valid token through the named environment variable, not in the manifest or command output. Then, from `hash-dashboard`:

```sh
node scripts/api-latency-probe.mjs /path/to/private-manifest.json 20 2
```

Only GET is issued, redirects are rejected, concurrency is bounded to 1–5 and samples to 1–100 per endpoint. Output contains labels, counts, statuses and p50/p95 timing; no tokens, response bodies or URLs. Nonzero exit means at least one failed request. Include representative lists for all modules and compare cold/warm runs; this probe is not a distributed load generator or a replacement for interactive browser measurement.

Suggested acceptance targets to validate, not measured results: zero request loops or duplicated writes; no click-blocking UI after opening tournaments; stable navigation during a 30-minute two-device session; synchronized booking/console state after reconnect; no capacity inflation when expiry jobs repeat; agreed endpoint latency budgets on representative cafe-sized data.
