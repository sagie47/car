# LotPilot Marketplace Autofill Extension

Local Chrome Manifest V3 extension for assisted Facebook Marketplace posting.
It fetches a reviewed LotPilot listing, fills common title/price/description
fields in the active tab, tries to attach photos, and falls back to ordered
photo downloads when browser upload is blocked.

## Install locally

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select `apps/chrome-extension`.
5. Reload the unpacked extension after changing `manifest.json` or `background.js`.

## Use with Facebook Marketplace

1. Start the LotPilot backend. Use `http://127.0.0.1:3000` for the default backend, or `http://127.0.0.1:3100` if you are running the alternate local port.
2. Log in to Facebook manually and open the Marketplace vehicle creation form.
3. Open the LotPilot extension popup.
4. Set `API base URL`.
5. Paste the LotPilot `listing_...` ID.
6. Add a bearer token only when `LOT_PILOT_REQUIRE_AUTH=true`.
7. Click **Load**, then **Post Assist**.
8. Review the Facebook form manually before submitting.

## Actions

- **Post Assist** fills text, attempts photo upload, then downloads ordered photo files if upload fails.
- **Fill Text** only fills title, price, and description.
- **Auto Upload Photos** fetches up to 10 images / 15 MB total and tries to attach them to the active tab with a file input or drop event.
- **Download Photos** downloads all photo URLs into `Downloads/LotPilot/<listingId>/` with deterministic ordered filenames.

The extension records an `exported` listing activity when the backend accepts
the activity request. Metadata includes target, filled/missing fields, photo
mode, fetched/uploaded/downloaded counts, and photo errors.

## Local test page

Open `apps/chrome-extension/test-page.html` in Chrome after loading the
extension. It has Facebook-like `aria-label` fields and a multi-image file input
for checking text fill and photo payload handling without using a live site.

## Limits

- Facebook can change DOM structure or block synthetic upload events. Photo
  auto-upload is best effort; ordered downloads are the guaranteed fallback.
- Facebook login and final publish stay manual.
- Field matching is heuristic. It targets ARIA labels, labels, placeholders,
  names, common textbox shapes, and contenteditable fields.
- Supabase sessions are not shared with the extension yet. For authenticated
  beta environments, paste a short-lived access token or internal server token.
