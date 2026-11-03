# Staff guide · desk bookings and historical Excel imports

## Book a live session

Open New Gaming Session from Schedule, or Book from Quick Booking. A preselected slot carries into the form. Session Time shows the current selection first. Choose **From** to start a new range, then **To** to extend it. Changes apply immediately. For example, on a 30-minute schedule, choose 18:00–19:30 to reserve three slots. An unavailable slot ends the list of offered end times. For manual input, open Enter times manually. With available half-hour slots, typing 18:11–19:13 offers **Use 18:00–19:30**. Staff see and accept the reserved interval before checkout. Use Individual slots for a nonconsecutive selection. Confirm the device, rate, player details and payment in Bill Summary. Availability is checked again when submitting.

Live desk bookings use the existing booking endpoint, slot capacity and PC confirmation flow. Historical imports use a separate archive.

## Collect at the end of play

In New Gaming Session → Payment Method, choose **Pay After Session** and confirm the booking. The café must accept Pay at Cafe. The player can start with an unpaid balance. At session checkout, review the amount due and collect it using the actual payment method. Choose **Monthly Credit** only when posting to a player’s monthly credit account.

## Configure pricing

In Console Pricing → Dashboard rate cards, choose the actual bookable device and a profile, edit the amounts, then save. For separate 55″ and 65″ inventory, assign the matching card to each bookable device group. A price label on a shared group cannot reserve a particular physical screen. Staff select the applicable rate card in New Gaming Session. Standard pricing remains available.

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

1. Open Transaction Report → Import Excel, or use Import Excel in Booking records. Upload an .xlsx workbook with headers in the first populated row. Choose the worksheet.
2. Review the suggested column mapping for player, device, date, start time, end time and amount paid. Choose a different source column wherever necessary.
3. Select Preview mapped rows. The preview trims whitespace, formats Excel dates and times, converts 12-hour times and removes supported rupee symbols and amount separators. Ambiguous text dates such as 03/04/2026 require an explicit YYYY-MM-DD date. Changed cells show their original value.
4. Edit flagged cells. Only completed sessions can be imported. Times are café times (IST); an earlier end time means the session ended the next day. Check the amounts before selecting Import.
5. Use View imported history to browse records and save corrections to individual rows. Each imported amount appears as a completed historical payment in Transaction Report on the date the session ended. Payment method is unspecified. Edits update the same transaction. To post older archive-only rows, reimport the original workbook with the same row identity.

Each sheet supports up to 10,000 rows and 150 columns in a workbook under 8 MB. Imports save in transactions of up to 500 rows. If interrupted, retry the same unchanged workbook and worksheet. The file fingerprint, sheet and row position identify rows already imported. When the source has a stable booking ID, map it under Duplicate check to skip that booking even across re-exports. Without a stable ID an edited or re-exported workbook has a different fingerprint; use the imported-history editor for corrections.

## Release

Apply hfg-booking/sql/20261103_desk_rates_and_history.sql followed by hfg-booking/sql/20261103_imported_transactions.sql to the booking database, deploy the booking and dashboard services, then deploy hash-dashboard with its updated dependencies. Configure cards per café before using them. Verify one dashboard booking against the app schedule and a connected test kiosk.
