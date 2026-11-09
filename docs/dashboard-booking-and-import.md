# Staff guide · desk bookings and historical Excel imports

## Book a live session

Open New Gaming Session from Schedule, or Book from Quick Booking. A preselected slot carries into the form. Session Time shows the current selection first. Choose **From** to start a new range, then **To** to extend it. Changes apply immediately. For example, on a 30-minute schedule, choose 18:00–19:30 to reserve three slots. An unavailable slot ends the list of offered end times. For manual input, open Enter times manually. With available half-hour slots, typing 18:11–19:13 offers **Use 18:00–19:30**. Staff see and accept the reserved interval before checkout. Use Individual slots for a nonconsecutive selection. Confirm the device, rate, player details and payment in Bill Summary. Availability is checked again when submitting.

Live desk bookings use the existing booking endpoint, slot capacity and PC confirmation flow. Historical imports use a separate archive.

## Collect at the end of play

In New Gaming Session → Payment Method, choose **Pay After Session** and confirm the booking. The café must accept Pay at Cafe. The player can start with an unpaid balance. At session checkout, review the amount due and collect it using the actual payment method. Choose **Monthly Credit** only when posting to a player’s monthly credit account.

## Configure pricing

In **Console Pricing → Pricing**, select a device. There is one editor with an explicit **Dashboard pricing** rule:

- **Same price per slot:** the shared slot rate applies. Change the amount and choose **Save slot rates**.
- **Duration / screen / player rates:** saved variants replace the slot rate for dashboard bookings. Save a rate to activate it. Switching back to slot pricing retains the variants for later use. Changes to the rule apply immediately and show a saved status.

For PlayStation, choose the TV size and game variant, then enter per-player hourly prices. The app and kiosk's default rate is in a collapsed, labelled section inside the same editor. This preserves their existing booking contracts. New Gaming Session automatically uses the sole active variant, or requires a selection when several variants are active. There is no per-booking fallback to generic pricing. The server rejects outdated or missing variants rather than charging the wrong rate.

In **Manage Gaming Console**, add or edit a PlayStation and set **TV screen size (inches)**. Existing consoles are left unset; staff must enter their actual size. The size is displayed alongside the console model. Screen-size metadata does not change shared slot capacity or automatically reserve a particular physical TV: staff still assign the appropriate console. Rates currently support the 55-inch and 65-inch presets.

| Profile | Suggested charge |
| --- | --- |
| PC | Under 2 hours ₹100/hr, 2 through 3 hours ₹90/hr, above 3 hours ₹80/hr |
| PS5 55″ | ₹125 / ₹100 / ₹90 / ₹90 per player per hour for 1–4 players |
| PS5 65″ | ₹150 / ₹125 / ₹100 / ₹100 per player per hour for 1–4 players |
| GTA6 55″ / 65″ | One player, ₹180 / ₹200 per hour |
| Racing Sim | ₹100 for 30 minutes or ₹150 for 60 minutes |

The PC tier applies to the entire selected duration. Three hours costs ₹270 at the suggested rates. Select Squad Play for multiple players. The backend calculates the desk subtotal again at checkout. A changed subtotal requires staff to review the price. PS5 player rates include controllers. Food and other selected extras appear separately in Bill Summary. Staff can adjust an elapsed-time Auto Discount or reset it to the suggestion.

In Passes → New Pass, select a template, review its editable price, hours, pass type and validity, and save. The suggested day pass is ₹700 for 10 hours with one day of validity. Weekly is ₹3,500 for 50 hours over seven days. Monthly is ₹14,000 for 250 hours over 30 days. Templates use the existing café pass purchase and redemption flow. PC sessions only is enabled for these templates. A restricted pass must be redeemed against a PC booking. Clear this option before saving to make the pass available for other devices.

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

Existing saved variants remain active. Slot-only devices remain on their existing slot rate. Switching a device to slot pricing disables its variants without deleting them. No existing bookings or receipts are repriced. New desk bookings record the applied pricing profile in their booking metadata. Older desk forms without variant support receive a clear instruction to use New Gaming Session when a device has active variants.

The console API accepts and returns nullable `screenSizeInches` (integer 20–120). Omitted values on update preserve the saved size; explicit null clears it. Rate-card responses include `is_active`; `PUT /api/vendor/{vendor}/desk-rates/mode` accepts `game_id` and `mode` (`slot` or `variants`). Staff pricing permission and cafe scope apply to this action.
