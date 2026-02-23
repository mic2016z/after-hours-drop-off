# After-Hours Drop-Off Defender

This demo captures after-hours return evidence (plate, timestamp, GPS, and 4 photos) and provides a staff-only admin panel.

## Security model

- Customer submissions require a valid `bookingToken` + matching `licensePlate`.
- Admin data access requires `STAFF_ADMIN_TOKEN`.
- Evidence image endpoint (`/getImage`) also requires `staffToken`.
- Reports and tokens are purged after 5 years via daily Convex cron.

## Required environment variables

Create `.env.local` with:

```bash
CONVEX_DEPLOYMENT=...
NEXT_PUBLIC_CONVEX_URL=...
NEXT_PUBLIC_CONVEX_SITE_URL=...
STAFF_ADMIN_TOKEN=your-strong-staff-token
```

## Run locally

```bash
npm install
npx convex dev
npm run dev
```

## Staff workflow

1. Open `/admin`.
2. Enter `STAFF_ADMIN_TOKEN`.
3. Issue a booking token using booking reference + plate.
4. Send that booking token to customer (SMS/email/check-in flow).
5. Review submitted reports, maps, and photos in `/admin`.

## Customer workflow

1. Open `/` (QR code recommended).
2. Enter booking token and license plate.
3. Capture all 4 required photos.
4. Allow geolocation and submit.

## Retention

- Reports and expired booking tokens older than 5 years are deleted daily by Convex cron (`convex/crons.ts`).
