# Scan & cafe-specific wallet: frontend integration contract

Source-verified: 24 September 2026. This describes the local backend implementation, not a verified production deployment. Examples use illustrative IDs and amounts. No live API or payment calls were made to prepare this document.

## 1. Hosts, credentials and common rules

| Alias | Frontend configuration | Routes |
|---|---|---|
| `BOOKING` | `NEXT_PUBLIC_BOOKING_URL` | `/api/cafe-checkout/*` gamer authentication |
| `DASHBOARD` | `NEXT_PUBLIC_DASHBOARD_URL` | `/api/cafe/*`, staff access and PC linking |
| PC Socket.IO | `ws_url` returned by PC linking | Path `/socket.io`, namespace `/cafe-agent` |

Use `Content-Type: application/json` for JSON writes. Send credentials as `Authorization: Bearer <token>`.

| Credential | Obtain from | Use for |
|---|---|---|
| Existing Hash gamer JWT | Existing gamer sign-in | Exchange for a cafe gamer token only |
| Cafe gamer token | Booking token exchange or email-code verification | Gamer checkout, session status, food |
| Named staff/owner access token | Dashboard access endpoints below | Cafe wallet operations, settings, shifts and reports |
| Linked PC `session_token` | Vendor PC link endpoint | Agent QR, recovery, acknowledgement and agent socket |

Do not interchange these credentials. A normal vendor login token alone does not authorize cafe wallet staff calls. Cafe gamer tokens have `scope=cafe_gamer`, audience `cafe-checkout`, and a 1,800-second lifetime. The PC credential remains valid while its link is active; do not put it in a QR, URL or browser gamer storage.

- Cafe money is **integer INR paise**: `10000` means ₹100.00. IDs and minute values are JSON integers, not numeric strings.
- Wallet identity is `(vendor_id, user_id)`. This balance is separate from Hash Wallet and cannot be spent at another cafe.
- Staff wallet available balance is `balance - reserved`; gamer checkout supplies `available_balance` directly.
- New cafe endpoints return plain JSON objects, arrays, or `null`, **not** `{status,data}` wrappers. Legacy kiosk endpoints have a different contract.
- Serialized cafe timestamps are UTC ISO strings ending in `Z`. Daily collection dates use Asia/Kolkata.
- Cafe writes that request `idempotency_key` use a JSON field of 8–100 characters. Generate a UUID for each new intent; persist/reuse it with the same operation on network retries. Do not generate a fresh key just because a response timed out.
- Do not infer a successful payment or session start from a scan, reservation, local countdown, or HTTP 202.

## 2. End-to-end gamer flow

1. PC displays `checkout_url` from its QR endpoint. The URL contains `?qr=<signed-token>`. One QR supports both existing bookings and wallet play.
2. Gamer scans, then exchanges their existing Hash login or signs in with email OTP.
3. Load `GET /api/cafe/checkout?qr=...`. Show cafe/PC, available cafe balance, existing bookings and enabled duration prices.
4. If `active_session_id` exists, recover that session. Otherwise show existing bookings first, respecting `can_start` and `reason`; offer a separate “Buy a new session” choice.
5. Submit the selected checkout and save its returned `id` immediately. A `reserved` session means “Waiting for PC”; wallet funds are only held.
6. PC acknowledges readiness. Only `active` means play is authorized and the wallet charge has been captured. Existing bookings have no second charge.
7. Recover using `GET /api/cafe/sessions/{id}` even when the original QR has expired. Display remaining time from `ends_at`. Stop session polling on terminal states.
8. If balance is insufficient, direct the gamer to the cafe desk. There is no online cafe-wallet top-up endpoint in this implementation.

## 3. Gamer authentication — BOOKING host

### POST `/api/cafe-checkout/token`

Auth: existing, unexpired Hash gamer bearer JWT. Body: none required. The backend uses the existing encrypted `uuid` gamer claim; do not send a user ID to choose the account.

Success 200:

```json
{"token":"<cafe-gamer-jwt>","expires_in":1800}
```

### POST `/api/cafe-checkout/login/request`

Auth: none.

```json
{"email":"gamer@example.com"}
```

Success 200:

```json
{"challenge_id":"<uuid>","message":"If this email belongs to a Hash gamer, a code has been sent."}
```

Only an existing Hash account receives a code; this does not register an account. Code lifetime: 10 minutes. At most five challenge requests matching the email or source IP within 15 minutes. Validation: 400; rate limit: 429; mail delivery failure: 503. Preserve the generic message rather than claiming the account exists.

### POST `/api/cafe-checkout/login/verify`

Auth: none.

```json
{"challenge_id":"<uuid>","code":"012345"}
```

Success 200: the same `{token,expires_in}` as token exchange. Keep the code a string to preserve leading zeroes. Codes are single-use with at most five verification attempts. Invalid, used, exhausted or expired challenges return 401. No cafe-token refresh endpoint exists; reauthenticate/re-exchange after expiry and retain the session ID for recovery.

## 4. Gamer scan and session APIs — DASHBOARD host

All endpoints in this section require the cafe gamer bearer token.

### GET `/api/cafe/checkout?qr=<URL-encoded-token>`

Success 200, example:

```json
{
  "cafe_name":"Example Cafe",
  "console_number":10,
  "vendor_id":1,
  "console_id":42,
  "policy":{
    "gaming_methods":["cafe_wallet"],
    "topup_channels":["desk"],
    "desk_methods":["cash","cafe_upi"],
    "hash_online_collection":false,
    "self_service":true,
    "food_ordering":true,
    "food_collection":"vendor",
    "durations":[{"minutes":60,"amount":10000}]
  },
  "available_balance":25000,
  "bookings":[{
    "booking_id":1025,
    "booking_ids":[1025,1026],
    "game_name":"PC Gaming",
    "starts_at":"2026-09-24T06:30:00Z",
    "ends_at":"2026-09-24T08:30:00Z",
    "can_start":true,
    "reason":null,
    "payment_required":false
  }],
  "active_session_id":null
}
```

`booking_id` is the group anchor to submit. Contiguous slots purchased under one access code may be grouped. Eligibility checks include ownership, cafe, confirmed/upcoming state, verified payment, booked time, console compatibility and assignment. Squad bookings require desk assignment. `payment_required:false` does not override `can_start:false`; show the supplied reason. The server rechecks eligibility and PC availability on submission.

### POST `/api/cafe/checkout` — buy wallet time

```json
{
  "qr":"<signed-qr-token>",
  "minutes":60,
  "expected_amount":10000,
  "payment_method":"cafe_wallet",
  "idempotency_key":"<uuid>"
}
```

Choose `minutes` and `expected_amount` from the current policy. Changed price returns 409: reload the quote and ask the gamer to confirm the changed price. Do not silently accept a higher amount. A new wallet reservation increases `reserved`; capture happens only after successful PC acknowledgement.

### POST `/api/cafe/checkout` — start an existing paid booking

```json
{
  "qr":"<signed-qr-token>",
  "booking_id":1025,
  "payment_method":"existing_booking",
  "idempotency_key":"<uuid>"
}
```

Do not add `minutes`, `expected_amount` or meals to this flow. No extra wallet payment is made. Late arrival uses only the original booking's remaining time; acknowledgement does not extend its end time.

Both checkout variants return **202 when reserved**, otherwise **200** when replaying an existing non-reserved result. Body: a `Session` plus `checkout` (schema below). QR validity is checked before idempotent replay, so an expired QR can still produce 410; use a saved session ID to recover an already-created session.

### GET `/api/cafe/sessions/{session_id}`

Success 200: `Session` plus `checkout`. Only the owning gamer can read it; missing or another gamer's session returns 404. Does not require the original QR. The embedded `checkout` contains cafe/PC/policy/available balance, but omits `bookings` and `active_session_id`.

### Session schema

| Field | Type / meaning |
|---|---|
| `id` | UUID string; persist for recovery |
| `vendor_id`, `user_id`, `console_id`, `link_id` | Integer IDs |
| `idempotency_key` | Original request key |
| `state` | `reserved`, `active`, `failed`, `completed`; existing bookings can also become `cancelled` |
| `kind` | `wallet` or `existing_booking` |
| `booking_ids` | Integer array; empty for wallet play |
| `booking_end` | UTC timestamp or null |
| `amount` | Integer paise; zero for existing bookings |
| `minutes` | Purchased duration, or rounded remaining booking minutes at reservation |
| `deadline` | PC acknowledgement deadline, at most 45 seconds after reservation |
| `started_at`, `ends_at` | UTC timestamps or null before activation |
| `created_at` | UTC timestamp |
| `checkout` | Only added by gamer checkout/session routes |

`command_token`, `fingerprint` and `console_claim` are omitted from public session responses.

State transitions: `reserved → active → completed`; reservation failure/timeout gives `failed`; an existing active booking may become `cancelled`. Wallet failure releases the hold without capture. The backend reconciler runs every five seconds when enabled. Session reads themselves do not force reconciliation, so terminal state can lag the deadline. The PC must still lock at `ends_at`.

## 5. Staff authentication and wallet APIs — DASHBOARD host

Obtain a named access session using an existing access endpoint:

| Method / path | Auth / body | Response |
|---|---|---|
| POST `/api/vendor/{vendor_id}/access/session/owner` | Owner vendor login bearer; no required body | `{token,vendor_id,staff:{id,name,role,permissions}}` |
| POST `/api/vendor/{vendor_id}/access/session/refresh` | Current unexpired staff/owner access bearer; no body | Same session object; extends the existing session and reloads permissions |
| POST `/api/vendor/{vendor_id}/access/unlock` | Staff PIN: `{"pin":"1234"}` | Same session object |

Use the returned token for all routes below. It must have scope `vendor_access`, the matching cafe, a named staff claim and a live server-side staff session. Re-unlock on 401. UI permissions are hints; backend permissions are rechecked.

All paths in this table start with **`/api/cafe`**. All successful responses are **200**.

| Method / suffix | Permission | Input | Response |
|---|---|---|---|
| GET `/{vendor_id}/gamers?q=...` | `wallet.topup` | URL-encoded name, gamer tag, email, phone or numeric ID | Up to 20 `{id,name,game_username,email,phone}` objects |
| GET `/{vendor_id}/wallets/{user_id}` | `wallet.topup` | None | `{balance,reserved,ledger:LedgerEntry[]}`; latest 100 entries |
| POST `/{vendor_id}/wallets/{user_id}/topups` | `wallet.topup` | `{amount,method,idempotency_key}` | `LedgerEntry` |
| POST `/{vendor_id}/wallets/{user_id}/adjustments` | `wallet.adjust` | `{amount,reason,idempotency_key}` | `LedgerEntry` |
| POST `/{vendor_id}/ledger/{entry_id}/refund` | `wallet.refund` | `{reason,idempotency_key}` | Reversal `LedgerEntry` |
| GET `/{vendor_id}/shifts` | `wallet.topup` | None | Current actor's latest 50 `Shift` objects |
| POST `/{vendor_id}/shifts/open` | `wallet.topup` | `{opening_cash}` | New or already-open `Shift` |
| POST `/{vendor_id}/shifts/{shift_id}/close` | `wallet.topup` | `{counted_cash}` | Closed `Shift`; repeated close returns existing result |
| GET `/{vendor_id}/policy` | `wallet.topup` OR `account.manage` | None | `Policy` |
| PUT `/{vendor_id}/policy` | `account.manage` | Complete `Policy` object | Saved `Policy` |
| GET `/{vendor_id}/collections?date=YYYY-MM-DD` | `transactions.view` | Optional date; defaults to today in IST | Daily collection totals below |
| GET `/{vendor_id}/audit?before=123` | `transactions.view` | Optional exclusive audit ID cursor | Latest 100 matching `Audit` objects |
| GET `/{vendor_id}/activity` | `transactions.view` | None | Latest 100 merged audit/payment activities |
| GET `/{vendor_id}/report` | `transactions.view` | None | `{totals:{[ledgerKind]:signedPaise},sessions:Session[]}` |
| POST `/{vendor_id}/logout` | `dashboard.view` | No required body | `{"ok":true}`; closes this server staff session |

Gamer search is across Hash gamers, not only customers already holding this cafe's wallet. Query requires at least two characters unless numeric; the server truncates it to 100 characters. Missing wallet returns zero balance/reserved and an empty ledger.

### Top-up example

Open a shift first, then collect cash/cafe UPI and submit:

```json
{"amount":50000,"method":"cash","idempotency_key":"<uuid>"}
```

`amount`: 1–100,000,000 paise. `method`: `cash` or `cafe_upi`, enabled by policy. This records a desk collection; it does not initiate or independently verify a UPI transfer. Do not credit before desk confirmation.

### Adjustments and refunds

Adjustment `amount` is signed, nonzero, between -100,000,000 and 100,000,000 paise. Adjustment/refund `reason` must be 3–500 trimmed characters. Adjustments cannot reduce balance below reserved funds.

Refund reverses the **entire** original entry; no partial-refund amount is accepted. Only `topup` or `capture` entries can be reversed, once. Reversing a top-up removes available wallet funds and needs an open shift to record the desk return. Reversing a gaming capture restores wallet funds; it does not itself stop an active session. The returned ledger entry has `kind=refund` and `reversal_of` pointing to the original.

### Shifts and reports

`opening_cash` and `counted_cash` are required nonnegative integer paise, maximum 100,000,000. A staff actor has one open shift per cafe. Closing calculates `expected_cash = opening_cash + signed cash ledger amounts`; discrepancy is `counted_cash - expected_cash`. UPI receipts are separate. Logout does not automatically close the shift.

Collections response example:

```json
{
  "date":"2026-09-24",
  "timezone":"Asia/Kolkata",
  "methods":{
    "cash":{"received":50000,"returned":10000,"net":40000},
    "cafe_upi":{"received":20000,"returned":0,"net":20000}
  },
  "net":60000
}
```

Collections include desk top-ups, food collections and method-associated refunds within the selected IST day. `report.totals` is all-time grouped ledger totals, with signed amounts; it is not a daily revenue total. `report.sessions` is the latest 100 sessions. Only audit has a `before` cursor; the other list endpoints have fixed limits.

### Shared staff response schemas

- `LedgerEntry`: `id`, `vendor_id`, `user_id`, `kind`, `amount`, `balance_after`, `reserved_after`, `actor_id`, `actor_name`, `method`, `shift_id`, `session_id`, `reversal_of`, `reason`, `idempotency_key`, `created_at`. Method/link IDs can be null. Kinds include `topup`, `reserve`, `capture`, `release`, `refund`, `adjustment`, `food_collection`. Reserve/release entries have zero amount; captures are negative. `fingerprint` is omitted.
- `Shift`: `id`, `vendor_id`, `actor_id`, `actor_name`, `open_key`, `opening_cash`, `counted_cash`, `expected_cash`, `upi_receipts`, `opened_at`, `closed_at`. Closing fields are null while open; `open_key` becomes null on close.
- `Audit`: `id`, `vendor_id`, `actor_id`, `actor_name`, `action`, `details`, `created_at`.
- Activity audit records use string IDs `audit-{id}`. Payment records use `payment-{id}`, `actor_name`, `action` (ledger kind), `created_at`, and `details:{user_id,amount,method,reason,transaction_id}`. Treat the list as a union; not every record has all audit fields.

## 6. Cafe payment policy

Use the complete policy object shown in the checkout example. PUT requires exactly these fields; partial updates and extra fields fail validation.

| Field | Current supported values |
|---|---|
| `gaming_methods` | Exactly `["cafe_wallet"]` |
| `topup_channels` | Exactly `["desk"]` |
| `desk_methods` | Nonempty unique selection of `cash`, `cafe_upi` |
| `hash_online_collection` | Must be `false` |
| `self_service` | Boolean; gates both wallet and existing-booking QR starts |
| `food_ordering` | Boolean |
| `food_collection` | `cafe` or `vendor` |
| `durations` | 1–12 unique minute options; each exactly `{minutes,amount}` |

Each duration is 5–720 minutes; price is 1–10,000,000 paise. Default policy has self-service disabled, food enabled with vendor collection, and 60 minutes for 10000 paise. Saving a policy opts that cafe into wallet-only gaming enforcement; a returned default policy does not by itself mean one has been saved.

Existing payment gateway/order/link/capture clients must supply cafe context through `vendor_id`, `game_id` or `booking_id` so the booking service can enforce policy. Wallet-only cafes use this cafe checkout flow, not legacy payment checkout.

## 7. Food APIs (separate from gaming money)

All paths start `/api/cafe` on DASHBOARD.

| Method / suffix | Auth | Input | Response |
|---|---|---|---|
| GET `/food/menu?qr=...` OR `?session_id=...` | Gamer | Valid QR or owned reserved/active session | 200 `{collector,items:[{id,name,amount,stock}]}` |
| POST `/food/orders` | Gamer | Body below | 201 `FoodOrder`; idempotent replay 200 |
| GET `/{vendor_id}/food/orders` | Staff, `store.manage` | None | 200 latest 100 `FoodOrder` objects |
| POST `/{vendor_id}/food/orders/{order_id}/collect` | Staff, `wallet.topup` | `{"method":"cash"}` or `cafe_upi` | 200 `FoodOrder` |

Order body:

```json
{
  "session_id":"<owned-session-uuid>",
  "items":[{"id":12,"quantity":2}],
  "idempotency_key":"<uuid>"
}
```

Before a session exists, replace `session_id` with `qr`. If both are present, session context takes precedence. Select 1–30 distinct menu items, quantity 1–50 each. Stock can be null for unbounded availability. The server snapshots prices/names and decrements stock transactionally; unavailable stock returns 409.

`FoodOrder`: `id`, `vendor_id`, `user_id`, `items:[{id,name,quantity,unit_amount}]`, `amount`, `collector`, `state`, `idempotency_key`, `created_at`. Initially `state=pay_at_store`; cafe collection sets `paid`.

If `collector=vendor`, pay the food store directly: the cafe collect endpoint returns 403. Cafe collection requires an open shift and an enabled desk method, records a separate `food_collection` ledger entry, and does not debit or credit gamer wallet funds. A repeated collection of a paid cafe order returns the same order. There is no gamer order-history, food cancellation or food refund endpoint in this controller.

## 8. PC setup and agent integration

These calls belong to the PC/native-agent integration, not the gamer browser.

### Setup — DASHBOARD, vendor credential

| Method / path | Body | Success |
|---|---|---|
| GET `/api/vendors/{vendor_id}/pcs` | None | 200 `{plan_limit,active_links,remaining_capacity,pcs:[{id,number,brand,model,linked}]}` |
| POST `/api/vendors/{vendor_id}/pcs/link` | `{console_id,kiosk_id?}` | 201 link object below |
| POST `/api/vendors/{vendor_id}/pcs/unlink` | `{console_id}` or `{session_id}` (link row ID) | 200 `{closed:...}` |

Use an authorized vendor JWT matching the vendor for setup. `kiosk_id` is an optional installation identifier string, not a console ID. A conflicting link returns 409.

```json
{
  "session_token":"<secret-device-token>",
  "ws_url":"https://configured-socket-host.example",
  "socket_path":"/socket.io",
  "session_expires_in":null,
  "console_id":42,
  "vendor_id":1
}
```

### Runtime — DASHBOARD, linked PC bearer

| Method / path | Body | Success |
|---|---|---|
| POST `/api/cafe/agent/qr` | None required | 200 `{token,checkout_url,expires_in:120,console_id,vendor_id}` |
| GET `/api/cafe/agent/session` | None | 200 live `Session + command_token`, or JSON `null` |
| POST `/api/cafe/agent/ack` | `{session_id,command_token,success:true}` | 200 `Session` without command token |

Refresh the displayed QR every 60–90 seconds. The QR is a short-lived signed context, not a payment credential. If `CAFE_CHECKOUT_URL` is unconfigured the QR endpoint returns 503.

Socket.IO:

```ts
const socket = io(`${ws_url}/cafe-agent`, {
  path: socket_path,
  auth: { token: session_token }
});
socket.on('session.prepare', command => {
  // Persist command.id and command.command_token; prepare idempotently.
  // Acknowledge through HTTP. Only an active result authorizes unlock.
});
```

`session.prepare` carries serialized `Session` fields plus `command_token` (no embedded gamer checkout). The server selects the private link room. Recover with agent session GET on reconnect/restart and periodically: there is no guaranteed event replay or gamer-session socket subscription in this new flow.

`success` must be a JSON boolean. A failed or late acknowledgement fails the reservation. Duplicate acknowledgements return the existing session state. Wallet time begins on successful acknowledgement; existing-booking time ends at the booked deadline. Keep the PC locked for null/failed/cancelled/completed states, and after `ends_at` even offline. A browser must not fake PC readiness. Native lock/unlock remains an agent responsibility.

The legacy access-code `/api/bookingQueue`, `/api/bookings/{id}/remaining` and `unlock_request` flow is separate. Do not combine its envelopes/events with `session.prepare`. See the existing kiosk contract for clients still using access codes.

## 9. Errors, retries and UI recovery

Cafe application errors use non-2xx statuses and `{"error":"message"}`. Auth middleware can instead return `message` or `msg`; gateways can return non-JSON. Check HTTP status before treating a parsed body as success.

| Status | Typical case | Frontend response |
|---|---|---|
| 400 | Invalid integer, policy, duration, key, reason or selection | Correct input; show error |
| 401 | Gamer token expired, staff session closed/expired, invalid PC token/code | Reauthenticate the correct actor |
| 403 | Wrong cafe/permission, disabled self-service/method/food, invalid ACK | Show restriction; do not retry unchanged |
| 404 | Session/gamer/booking/shift/order not found | Clear invalid selection or recover with correct identity |
| 409 | PC busy, insufficient funds, price changed, missing shift, idempotency conflict, stock unavailable | Show message and reload relevant state; do not blanket-retry every conflict |
| 410 | QR expired or PC unlinked | Scan fresh QR; use saved session ID if already created |
| 429 | OTP request rate limit | Wait before retrying |
| 503 | Email unavailable or checkout URL missing | Show temporary/setup failure |

These APIs do not currently provide stable machine-readable error codes. Avoid treating all 409s as insufficient balance. A transport timeout is an unknown outcome: retain the key and recover/retry safely. Food order idempotency keys are scoped to cafe + gamer; session keys to cafe + gamer; ledger keys to cafe. Use fresh UUIDs across different write types.

## 10. Fetching and integration checklist

Current `/play` polls owned live sessions every two seconds. This is existing frontend behavior, not a server requirement. For a lower-request client, use a local display timer, short polling while reserved, slower visible-tab polling while active, and immediate reads after reconnect/focus. Do not overlap reads; stop on terminal states. The new cafe flow currently has no public gamer/staff wallet-change socket event, so fully push-only wallet/session UI needs additional backend support.

After a desk write, update the UI from the returned entry and revalidate the selected wallet/shift/report as needed. Scope all cached data and request keys to the authenticated gamer/staff and cafe; clear private cached data on sign-out or cafe change.

Before release verify:

- Required SQL migrations: dashboard `20260922_cafe_wallet.sql`, `20260923_unified_kiosk_qr.sql`, kiosk runtime migration; booking `20260922_cafe_login.sql`.
- Matching strong JWT configuration, mail delivery, configured checkout/socket origins, active PC links and running cafe reconciler.
- Staff unlock, shift open, search gamer, cash/UPI top-up and repeated retry without duplicate credit.
- Scan → auth → existing booking OR wallet duration → reservation → genuine PC acknowledgement → active → completion.
- Insufficient funds, occupied PC, expired QR/token, price change, cancelled existing booking, ACK timeout, offline PC and lost HTTP response recovery.
- Cafe isolation, permission denial, reservation-protected balance, reversal and shift discrepancy.

Production configuration/deployment and native-agent readiness have not been verified by this documentation task.

## 11. Source references

Paths are relative to this document:

- [Cafe controllers](../../hfg-dashboard-service/app/controllers/cafe_wallet_controller.py)
- [Wallet rules and serialization](../../hfg-dashboard-service/app/services/cafe_wallet_service.py)
- [Existing booking eligibility and starts](../../hfg-dashboard-service/app/services/cafe_booking_service.py)
- [Response models](../../hfg-dashboard-service/app/models/cafe_wallet.py)
- [Gamer authentication](../../hfg-booking/controllers/cafe_checkout_controller.py)
- [PC setup](../../hfg-dashboard-service/app/controllers/vendor_pc_controller.py)
- [Staff access](../../hfg-dashboard-service/app/controllers/access_controller.py)
- [Existing gamer frontend](../app/play/page.tsx)
- [Existing staff workspace](../app/components/cafe-wallet-workspace.tsx)
- [Existing frontend API helper](../lib/cafe-api.ts)
- [Deployment guide](../../hfg-dashboard-service/docs/cafe-wallet-rollout.md)
- [Legacy kiosk contract](../../hfg-dashboard-service/docs/kiosk-api-2026-09-22.md)
