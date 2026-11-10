# Operations dashboard and Gamer Credit

## Staff workflow

The sidebar groups existing modules into Overview, Café Operations, Gamers, Management and Administration. The café switcher stays above the independently scrolling navigation. Gaming Stations replaces Manage Gaming Console; existing routes, feature permissions and icon-collapse behaviour remain available. Bookings & Sessions opens the dashboard Schedule tab.

Overview, Schedule and Wallet Top-up remain top-level dashboard tabs. Owner analytics are collapsed until Show analytics is selected. Quick Booking scrolls horizontally with the booking action outside the scroll area. Live sessions are ordered by overdue status, then unpaid balance. Pay at Café uses Accept and Decline. Empty upcoming lists use a compact panel.

The PC confirmation indicator means a start was recorded but the PC software has not acknowledged it. A small clock or failure indicator exposes an explanation on hover/focus and through its accessible label. It is only shown for PC sessions; payment status does not count as device acknowledgement. These UI changes do not mark pending sessions as successfully started or release occupied PCs.

## Gamer Credit

- **Credit Accounts:** searchable table showing Gamer, Credit limit, Outstanding, Available and Status. View opens transactions; Edit opens the account wizard.
- **Transactions:** choose an account, review charges, payments, adjustments and limit changes with date and staff attribution. Record a payment or an explicitly confirmed balance adjustment with a reason.
- **Settings:** explains account-specific billing controls, access and audit behaviour; edit billing day, grace days, limit and account status through the account wizard.

Account creation starts with existing-gamer search. Only if no suitable gamer exists should staff choose Create new gamer. Contact details, notes and optional administrator-only identity/address details are progressively disclosed. The final review displays the proposed credit limit and current balance before saving.

Credit limit is the maximum allowed balance. Outstanding is the unpaid balance. Available is max(limit minus outstanding, zero). Amount due is the outstanding portion whose ledger due date has arrived, with payments applied to the oldest due charges. The due value is capped by current outstanding. Existing ledger data is authoritative; incomplete historical ledgers require reconciliation rather than fabricated due dates.

## Validation and permissions

All credit endpoints require `credit.manage` and authenticated café scope. Address and ID fields in the account response are hidden unless the caller has `staff.manage` (or an authorized legacy owner session). Requests attempting to edit those fields without that permission are rejected. The statement API no longer returns address or ID fields.

Credit limits and money must be finite, non-negative, within ₹99,999,999 and have at most two decimal places. Billing days are 1–28; grace days are 0–90. Limits cannot be lowered below outstanding. Payments cannot exceed outstanding. Adjustments require a 5–200 character reason and must leave the balance between zero and the credit limit. Adjustments change the ledger balance; they are not cash receipts. Account and balance operations lock the account row, including booking charges, to avoid simultaneous changes bypassing limits.

Account updates, payments and adjustments require `confirmed: true`. Limit changes are recorded as zero-amount `limit_change` ledger entries; payments and adjustments retain staff attribution. Booking forms show available credit and the amount by which a proposed booking exceeds it before confirmation.

## Release and verification

Deploy booking-service and dashboard-service with the dashboard together, then reload existing staff tabs. Old clients without explicit confirmation will receive a validation response when writing credit changes. No new credit columns are required.

Console-to-rate mapping requires the separate SQL migration and configuration steps in [dashboard-booking-and-import.md](dashboard-booking-and-import.md). It remains necessary to configure rate-card console links before creating linked custom-rate bookings.

Local verification: pricing/reservation PostgreSQL tests, credit validation and rejected-write route tests, frontend rate/console-picker/import tests, Python compilation and changed-file TypeScript syntax checks. A static preview of the actual Credit Accounts component was visually checked with sample data. Production sessions and payments were not created during verification. A repository-wide TypeScript check reports existing errors in older components; a clean full build is not claimed. Graphify refresh was attempted, but the command is unavailable in this environment.

## Live session row layout

Live Sessions uses Gamer, Console, Session Time, Duration, Status and Action. Session Time is a single start–end range. Duration shows elapsed play once (MM:SS under one hour, H:MM:SS thereafter, retaining hours beyond 24). Status shows Active, Overtime or Starting for a pending QR session; an unpaid amount remains beneath the badge. The previous percentage/progress bar, remaining-time text and separate overtime counter are removed from the operational rows, including mobile. Payment, release and settlement behaviour is unchanged.
