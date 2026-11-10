# Staff guide · desk bookings and historical Excel imports

## Book a live session

Open New Gaming Session from Schedule, or Book from Quick Booking. A preselected slot carries into the form. Session Time shows the current selection first. Choose **From** to start a new range, then **To** to extend it. Changes apply immediately. For example, on a 30-minute schedule, choose 18:00–19:30 to reserve three slots. An unavailable slot ends the list of offered end times. For manual input, open Enter times manually. With available half-hour slots, typing 18:11–19:13 offers **Use 18:00–19:30**. Staff see and accept the reserved interval before checkout. Use Individual slots for a nonconsecutive selection. Confirm the device, rate, player details and payment in Bill Summary. Availability is checked again when submitting.

Live desk bookings use the existing booking endpoint, slot capacity and PC confirmation flow. Historical imports use a separate archive.

## Collect at the end of play

In New Gaming Session → Payment Method, choose **Pay After Session** and confirm the booking. The café must accept Pay at Cafe. The player can start with an unpaid balance. At session checkout, review the amount due and collect it using the actual payment method. Choose **Monthly Credit** only when posting to a player’s monthly credit account.

## Configure and maintain custom pricing

Open **Console Pricing → Pricing**, select the device, then choose **Same price per slot** or **Custom rate cards**. Slot pricing uses the shared default. Custom pricing uses enabled café-defined cards. Switching modes retains each card's enabled/disabled state.

Choose **New rate card**. Enter any rate name and pricing-model name, an optional TV size in whole inches, and any game variant/title/edition. TV sizes and game names are free-entry values, not preset lists. Set whether controllers are included to prevent duplicate controller fees.

Add price rules with duration and player-count ranges, amount, whole-group or per-player charging, and either a fixed session price or a custom time unit. Time-unit prices are prorated. All range boundaries are inclusive. For example, PC tiers may use 1–119, 120–180, and 181+ minutes. Rules can share times when their player ranges differ, but cannot overlap on both axes. Gaps are allowed; uncovered sessions cannot be booked against that card.

Use **Test price** before saving. It shows gaming charges before discounts and extras. Validation limits are 100 rules/card, 1–1,000 players, configured duration bounds/time units up to 10,080 minutes, and amounts up to ₹99,999,999 with two decimals. These limits do not replace the café's configured device capacity: maintain multiplayer support and capacity in console/squad settings.

**Save & enable** creates a card. **Edit**, **Duplicate**, **Enable/Disable**, **Archive**, and **Restore** maintain it. Restoring leaves a card disabled until enabled explicitly. Archived cards remain accessible under **Show archived** and are excluded from new bookings. Duplicate copies the complete model/rules; sharing a model name alone does not link edits across cards. Concurrent edits require reloading the latest version.

In **New Gaming Session**, staff see the custom card name, screen size and game variant. The form automatically selects the enabled card matching session duration and player count, and recalculates when either changes. Only matching cards are offered. If multiple cards match (for example different TV sizes or games), staff choose the variant; its duration/player tier still applies automatically. If no rule matches, booking is blocked. The backend checks its version and price again. If custom mode has no enabled cards, booking stops instead of falling back to a different charge. Existing bookings keep their recorded prices.

### Screen sizes and the PC kiosk

In **Manage Gaming Console**, add or edit a PlayStation and enter **TV screen size (inches)**. Any whole size from 1–1,000 is supported. Existing sizes are preserved; unset sizes remain unset. Link physical consoles under **Compatible consoles** in each rate card, or use **Rate cards** while editing a console. Links certify support for the card’s game variant and player configuration; TV size is checked against saved console hardware. A custom booking now requires mapped consoles. The booking form checks the full selected session and lets staff choose available matching consoles. PC squads reserve one PC per player. The selected assignment is retained when starting the session; a different-priced variant requires changing/rebooking the session rather than silently substituting hardware.

The **kiosk is PC client software**, not a PlayStation device or separate console-pricing channel. Dashboard-created PC bookings retain the existing slot/PC confirmation flow. This work does not change kiosk software, slot durations, or customer-app checkout. The customer app's existing default slot rate remains separately labelled within the unified editor; desk-only custom prices do not silently replace it.

Existing PC, PS5, GTA6 and racing cards retain their configured amounts and are presented as equivalent editable rule definitions. Saving converts them to stored custom definitions. New cards have no preset identity restriction; past bookings are not recalculated.

## Migrate past bookings

1. Open Transaction Report → Import Excel, or use Import Excel in Booking records. Upload an .xlsx workbook with headers within the first 20 populated rows. Choose the worksheet.
2. Review the suggested column mapping for player, device, date, start time, end time and amount received. Booking Total is recognized; Payment Status is mapped separately and never used as money. Choose a different source column wherever necessary.
3. Select Preview mapped rows. The preview trims whitespace, formats Excel dates and times, converts 12-hour times and removes supported rupee symbols and amount separators. Ambiguous text dates such as 03/04/2026 require choosing the workbook date order or entering an explicit YYYY-MM-DD date. Changed cells show their original value.
4. Edit flagged cells or exclude rows from the import. Payment statuses other than Paid/Completed/Settled/Success are flagged; verify amounts received before importing. Only completed sessions can be imported. Times are café times (IST); an earlier end time means the session ended the next day. Check the amounts before selecting Import.
5. Use View imported history to browse records and save corrections to individual rows. Each imported amount appears as a completed historical payment in Transaction Report on the date the session ended. Payment method is unspecified. Edits update the same transaction. To post older archive-only rows, apply the backfill migration below, or reimport the original workbook with the same row identity. Unpaid history is not imported as paid revenue.

Each sheet supports up to 10,000 rows and 150 columns in a workbook under 8 MB. Imports save in transactions of up to 500 rows. If interrupted, retry the same unchanged workbook and worksheet. The file fingerprint, sheet and row position identify rows already imported. When the source has a stable booking ID, map it under Duplicate check to skip that booking even across re-exports. Without a stable ID an edited or re-exported workbook has a different fingerprint; use the imported-history editor for corrections.

## Release

Apply hfg-booking/sql/20261103_desk_rates_and_history.sql followed by hfg-booking/sql/20261103_imported_transactions.sql to the booking database, deploy the booking and dashboard services, then deploy hash-dashboard with its updated dependencies. Configure cards per café before using them. Verify one dashboard booking against the app schedule and a connected test kiosk.

### November 8 repair

After the two migrations above, run `hfg-booking/sql/20261108_backfill_imported_history.sql` in the **booking database** to post existing archive-only records. It can be rerun safely: existing import receipts are updated by their original reference, without creating live sessions, slot reservations, kiosk commands, or customer messages. Review existing imported amounts before applying the backfill. The script treats existing archive rows as verified payments, matching the original importer contract.

Frontend changes are in `desk-rate-card.tsx`, `newSlot.tsx`, and `history-import.tsx`. The existing rate-card API remains compatible; the history API additionally validates optional `paymentStatus`. Deploy the booking service before the dashboard. Database setup errors now return a readable message rather than an HTML error. App and kiosk booking endpoints and slot durations remain unchanged.

### Unified pricing and console screen-size release

Apply these additive migrations before deploying the corresponding services:

1. `hfg-dashboard-service/sql/20261108_console_screen_size.sql` in the console/dashboard database (the shared booking database if this deployment uses one database).
2. `hfg-booking/sql/20261108_unified_pricing.sql` in the booking database, after the existing desk-rate migration.
3. Deploy dashboard-service and booking-service, then hash-dashboard.

Existing saved variants remain active. Slot-only devices remain on their existing slot rate. Switching a device to slot pricing preserves its cards and their individual enabled states. No existing bookings or receipts are repriced. New desk bookings record the applied pricing profile in their booking metadata. Older desk forms without variant support receive a clear instruction to use New Gaming Session when a device has active variants.

The console API accepts and returns nullable `screenSizeInches` (integer 1–1,000). Omitted values on update preserve the saved size; explicit null clears it. Rate-card responses include `is_active`; `PUT /api/vendor/{vendor}/desk-rates/mode` accepts `game_id` and `mode` (`slot` or `variants`). Staff pricing permission and cafe scope apply to this action.

### November 9 custom-pricing release

After the earlier desk-rate and unified-pricing migrations:

1. Apply `hfg-booking/sql/20261109_custom_desk_pricing.sql` to the booking database. It adds editable definitions, archive/version fields, and independent per-device mode. It is safe to rerun.
2. Apply `hfg-dashboard-service/sql/20261109_custom_screen_sizes.sql` after the screen-size column migration in the dashboard/console database.
3. Deploy booking-service and dashboard-service, then hash-dashboard. Reload open dashboard tabs.

`GET /api/vendor/{vendor}/desk-rates` includes `definition`, `revision`, `archived`, `is_active`, and `pricing_mode`. Create with a unique `profile` and a validated definition; update with the current revision. `PATCH` changes archival/enable state with the current revision. Pricing-management permission and café scope apply. Booking requests include `deskProfile`, `deskRevision`, and the displayed subtotal. The server recalculates and records the applied name, model, screen, game variant, version and slot amount.

Rule JSON fields: `min_minutes`, nullable `max_minutes`, `min_players`, `max_players`, decimal-string `amount`, `unit_minutes` (0 = fixed session), and boolean `per_player`. Pricing models use these configurable arithmetic rules; executable formulas are not accepted.

### November 10 console-to-rate mapping release

Apply `hfg-booking/sql/20261110_desk_console_assignment.sql` in the shared booking/dashboard database before deploying booking-service, dashboard-service, and the dashboard. The migration installs assignment guards on existing café dashboard tables. Rerun it after provisioning new café tables; linked bookings fail safely if their guard is missing. Existing bookings without a console reservation are not retroactively assigned.

Configure TV sizes first, then link physical consoles to custom rate cards. Existing cards without links must be configured before creating new custom-rate bookings. `definition.console_ids` is a café-scoped list; mismatched TV sizes and other cafés’ consoles are rejected. Rate-card links can be maintained in Console Pricing or the console edit dialog. Console-edit links save independently of the hardware form.

`GET /api/vendor/{vendor}/desk-consoles/{game}` lists physical consoles. `POST .../available` accepts `profile`, `date` (YYYY-MM-DD), and `slot_ids`. Booking requests pass `deskConsoleIds`; the backend locks consoles, rechecks compatibility and full-window availability, and records `desk_console_ids` plus `assigned_console_ids` in booking metadata. Current sessions, QR claims, maintenance, and overlapping upcoming assignments are excluded. No partial reservation is committed on failure.

Start controls preselect reserved consoles. Server checks and database guards reject a different console, including a conflicting assignment from another channel. The PC kiosk retains its existing device identity and start/acknowledgement flow. No PlayStation command is sent to a PC kiosk. Existing app pricing and dated slot capacity remain unchanged.
