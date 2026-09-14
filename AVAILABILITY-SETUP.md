# StayBaler availability integration

The existing room form now checks an external n8n workflow. Google Sheets stays behind n8n; GHL handles the actual reservation. No booking is created by this application. There is no mock availability mode and an unconfigured endpoint returns an error, never a false “available” or “unavailable” result.

## What changed

- `components/resort.tsx`: retains room cards and filters; passes search dates and guests into room links; re-exports the upgraded RoomBooking component.
- `components/room-availability.tsx`: existing booking card layout with validated fields, loading/duplicate-request protection, accessible native dialog, retry, and GHL navigation.
- `app/rooms/page.tsx` and `app/rooms/[slug]/page.tsx`: carry the search through listing → room → another room. Only the availability-related explanatory copy changes.
- `lib/availability.ts`: shared input/response validation, safe booking URLs, and date-query helpers. No booking overlap logic.
- `lib/availability-api.ts`: client POST service; default endpoint `/api/availability`.
- `app/api/availability/route.ts`: server validation and secret-bearing n8n forwarding. No Google or GHL SDK and no database access.
- `lib/room-booking-links.ts`: optional per-room public booking-link fallback.
- `app/globals.css`: scoped modal/availability styles using the existing colors, type, buttons, and responsive layout.
- `.env.example` and `tests/availability.test.ts`: configuration and contract checks.

## Vercel configuration

Add these variables in the StayBaler project's Environment settings, choosing Production (and Preview only if desired):

```env
N8N_AVAILABILITY_WEBHOOK_URL=https://YOUR-N8N-HOST/webhook/staybaler-availability
N8N_AVAILABILITY_WEBHOOK_SECRET=YOUR-PRIVATE-RANDOM-SECRET
GHL_BOOKING_ALLOWED_HOSTS=YOUR-EXACT-BOOKING-HOST
```

The URL is required. The secret is required if n8n Header Auth is enabled (recommended). The host allowlist is optional but recommended; enter hostnames only, comma-separated, without https or paths. Include any custom booking domains you actually use. Do not copy placeholder values into production. The server will only return HTTPS booking URLs with no embedded username/password. With an allowlist it also checks the hostname exactly. The webhook itself must use HTTPS and redirects are rejected; use its final production URL.

Leave `NEXT_PUBLIC_N8N_AVAILABILITY_WEBHOOK_URL` blank. The frontend calls the same-origin server route, which adds `X-Webhook-Secret` for n8n. Do not reuse or modify Surfy's existing chat environment variables: availability is a separate workflow.

Save and redeploy Vercel. Local development uses the same values in `.env.local` (never commit that file); restart the development server after changing them.

### Optional direct browser configuration

The client also supports `NEXT_PUBLIC_N8N_AVAILABILITY_WEBHOOK_URL` for an intentionally public, unauthenticated endpoint. It bypasses the server proxy. It must support POST/OPTIONS CORS from your website and perform its own validation and abuse protection. Never put a credential in that URL or a public variable. The server-only host allowlist does not protect this direct mode. Prefer the default proxy.

## n8n workflow

Create a separate workflow:

```text
POST Webhook → Validate input → Read bookings from Google Sheets
             → Calculate availability → Respond to Webhook (JSON)
```

Webhook path: `staybaler-availability`. Authentication: Header Auth, name `X-Webhook-Secret`, value matching `N8N_AVAILABILITY_WEBHOOK_SECRET`. Respond: Using Respond to Webhook node. Publish the workflow and copy its Production URL (not `/webhook-test/`). Google credentials belong only in n8n.

The website sends exactly:

```json
{
  "room": "Ocean Deluxe",
  "check_in": "2026-10-20",
  "check_out": "2026-10-22",
  "guests": 2
}
```

The selected room name is supplied automatically. Match these exact names in Sheets: Garden King, Ocean Deluxe, Poolside Twin, Family Suite, Beachfront Cabana, Barkada Loft. Use ISO dates (`YYYY-MM-DD`) without time components. Date validation uses the Baler calendar day, not the guest's timezone. Enforce the same room/capacity/date rules in n8n too, since a webhook may be called outside the site.

The Sheets booking columns can be: Booking ID, Guest Name, Room, Check-in, Check-out, Status. Only return availability information, never guest names or the raw sheet rows, to the browser.

For a single rentable unit, a confirmed booking overlaps when:

```text
existing.check_in < requested.check_out
AND existing.check_out > requested.check_in
```

This treats checkout as exclusive, allowing a new guest to arrive on the previous guest's checkout date. Define exactly which statuses block inventory (for example Confirmed and an unexpired Hold); cancelled records should not block it. Do not treat a Sheets read error or malformed row as an empty sheet. Return an error response if the availability result cannot be trusted. Ensure your empty-sheet path still reaches Respond to Webhook; an n8n read producing zero items must not silently skip the response.

### Room type versus physical room

The site's six records represent room TYPES. If each type has multiple physical units, a single overlap does not necessarily mean sold out. Add a room inventory table and unit IDs, or calculate remaining inventory for every night using the type's capacity. A single-unit overlap rule is only valid if one unit exists per name. This decision belongs in n8n/Sheets, not the website.

### Response contract

Available:

```json
{
  "available": true,
  "room": "Ocean Deluxe",
  "message": "Room is available",
  "booking_url": "https://YOUR-BOOKING-HOST/YOUR-OCEAN-DELUXE-LINK"
}
```

Unavailable:

```json
{
  "available": false,
  "room": "Ocean Deluxe",
  "message": "Room is not available"
}
```

Return one JSON object, not an array. `available` must be a boolean, not a string. `room` must equal the requested room name. `message` is optional and does not control the UI. Do not set available=false when a technical failure happens; return an HTTP error such as 503 instead. The frontend displays a retry state.

Keep n8n execution below 20 seconds; the server aborts at 20 seconds and the client at 25 seconds. No AI agent is needed to calculate availability.

## GHL booking links and synchronization

Recommended: store one booking_url per room in a separate n8n mapping or Sheets Rooms tab and return it with the result. Alternatively, populate `lib/room-booking-links.ts` using existing room slugs. A valid n8n URL takes precedence; missing or invalid URLs fall back to the configured room link, otherwise the modal explains that booking is unavailable and offers retry.

Book Now navigates to the returned HTTPS URL in the same tab. The website does not guess GHL prefill parameter names or append dates automatically. Configure the specific GHL form's supported prefill parameters in n8n if required. Guests must reconfirm dates, guest count, and pricing in GHL.

GHL must send successful bookings, cancellations, and date changes back to n8n to update the Google Sheet. Use the unique GHL booking ID for idempotent updates so retries don't add duplicate rows. Handle rejected/failed syncs and periodically reconcile GHL against Sheets.

An availability check is a snapshot, not an inventory hold. Two people can see the same availability. A generic GHL contact form alone does not enforce hotel inventory. Your GHL booking flow or its connected reservation automation must recheck and reserve inventory safely at final confirmation; otherwise double bookings remain possible. Sheets should not be represented as strongly consistent real-time inventory until this synchronization and final confirmation process are in place.

## Guest flow and validation

Invalid or past dates, impossible dates, checkout on/before check-in, missing room, fractional/zero guests, and guests above capacity are rejected. While checking, inputs and submission are disabled and a synchronous lock prevents double clicks. Component removal aborts the request. Errors offer retry using the same submitted details.

The dialog supports keyboard focus containment, Escape, a visible close button, focus return, background scroll locking, and mobile overflow. Unavailable → Choose Another Room uses client navigation to `/rooms` with preserved dates/guests and a room-selection anchor. Room links pass those values to the next room form. No availability result is cached or reused across rooms.

## Verify before enabling live bookings

Run `npm test`, `npm run typecheck`, and `npm run build`. In a preview deployment, verify available, unavailable, missing link, incorrect secret, timeout, and malformed-response cases using a separate test workflow (not real guest reservations). Test keyboard navigation and a narrow phone screen.

Configure rate limiting on the public `/api/availability` endpoint using your hosting firewall/gateway before exposing a costly or high-traffic workflow. The server's origin check and input limits are not a distributed rate limiter. Do not expose Google credentials, webhook secrets, or GHL private API keys in browser code.

This delivery implements the website side and documents n8n/GHL setup. It does not create a Google Sheet, n8n workflow, GHL booking system, or synchronization automation because their URLs, accounts, inventory model, and booking links have not been supplied. Existing unrelated fictional/demo text and Surfy's behavior are retained; update those separately when the complete reservation process is operational.
