# LotPilot

LotPilot is a Marketplace-first inventory reliability tool for independent
dealers and small dealer groups.

It syncs inventory, decides which units are eligible for promotion, generates
listing assets, coordinates publish/update/remove work, boosts stale units with
fresh content, and gives store teams a lightweight way to handle resulting
leads faster.

The product wedge is fast, cheap, dealer-safe inventory distribution with low setup burden.
LotPilot is not trying to be a full CRM, a broad social suite, or an agency
replacement.

## Core promise

Connect your inventory. LotPilot keeps your retail-ready cars active and
accurate on Marketplace-first promotion flows, helps your team respond faster,
and refreshes stale units with new content.

## Primary deliverable

- Product requirements document: [docs/PRD-LotPilot.md](docs/PRD-LotPilot.md)
- Phase 0 validation sprint plan: [docs/phase-0-validation-sprint.md](docs/phase-0-validation-sprint.md)

## Current implementation

The current implementation is a Prisma-backed Node service that covers the core
product wedge:

- Dealer and rooftop creation.
- Inventory ingest with durable vehicle upsert by rooftop plus VIN.
- Inventory source persistence and manual XML, CSV, and public inventory URL sync.
- Separate Next.js dealer app for setup, health, vehicles, listings, leads,
  reports, settings, stale-unit review, and assignment management.
- Eligibility evaluation and rooftop health scoring.
- Listing draft generation, Marketplace review/copy, browser autofill helper,
  and listing-state transitions.
- Basic lead creation, assignment, alert delivery, reply templates, and status tracking.
- JSON API for local development.
- Postgres persistence for dealers, rooftops, sync runs, vehicles, snapshots,
  listings, listing events, leads, and lead events.

## Local setup

```bash
npm run db:up
npm run prisma:migrate
npm run prisma:generate
npm test
npm run test:integration
npm start
npm run app:dev
```

The backend server starts on `http://localhost:3000`.
The dealer app starts on `http://localhost:3001`.

Copy [.env.example](.env.example) to `.env` if you want explicit connection
configuration. The checked-in defaults target local Postgres at `127.0.0.1`.

If Docker is available and running, `npm run db:up` starts Postgres via
Compose. If you already have a local PostgreSQL service, create a database
named `lotpilot` and use the same connection URLs from `.env.example`.

## Test layers

- `npm test`: unit tests against the in-memory store.
- `npm run prisma:push:test`: syncs the Prisma test schema.
- `npm run test:integration`: Prisma-backed integration tests plus HTTP smoke.
- `npm run test:all`: unit plus integration coverage.

## API surfaces

- `POST /api/dealers`
- `GET /api/dealers`
- `GET /api/dealers/:dealerId`
- `POST /api/rooftops`
- `GET /api/rooftops?dealerId=...`
- `GET /api/rooftops/:rooftopId`
- `GET /api/rooftops/:rooftopId/dashboard`
- `GET /api/rooftops/:rooftopId/notification-recipients`
- `POST /api/rooftops/:rooftopId/notification-recipients`
- `PATCH /api/notification-recipients/:recipientId`
- `POST /api/inventory-sources`
- `GET /api/inventory-sources?rooftopId=...`
- `GET /api/inventory-sources/:inventorySourceId`
- `POST /api/inventory-sources/:inventorySourceId/sync`
- `POST /api/ingest`
- `GET /api/sync-runs?rooftopId=...&inventorySourceId=...`
- `GET /api/sync-runs/:syncRunId`
- `GET /api/vehicles?rooftopId=...`
- `GET /api/rooftops/:rooftopId/health`
- `GET /api/rooftops/:rooftopId/stale-vehicles`
- `GET /api/listings?rooftopId=...`
- `POST /api/listings/:listingId/transitions`
- `POST /api/leads`
- `GET /api/leads/:leadId`
- `PATCH /api/leads/:leadId/assign`
- `PATCH /api/leads/:leadId/status`
- `GET /api/leads/:leadId/notification-deliveries`
- `POST /api/leads/:leadId/notifications/retry`
- `POST /api/leads/:leadId/events`
- `POST /api/webhooks/resend/inbound`

## Dealer app surfaces

- `/` overview with setup branching and current rooftop summary
- `/setup` setup wizard
- `/vehicles` and `/vehicles/:vehicleId`
- `/listings` and `/listings/:listingId`
- `/stale`
- `/leads` and `/leads/:leadId`
- `/reports`
- `/settings`
- `/assignments`

Lead alert recipients, inbound lead alias guidance, and manual lead capture are
available from `/settings` and `/leads`. Lead detail pages show alert delivery
history, retry failed alerts, and copyable response templates.

## Chrome autofill extension

The local extension in [apps/chrome-extension](apps/chrome-extension) can fetch
a reviewed listing and autofill common Marketplace-style title, price, and
description fields on the active tab.

Load it from `chrome://extensions` with Developer mode enabled and select
`apps/chrome-extension` as an unpacked extension. In local auth-disabled dev,
use `http://127.0.0.1:3000` as the API base URL and paste a `listing_...` ID
from the dealer app. If auth is enabled, paste a short-lived bearer token or
the configured `LOT_PILOT_SERVER_API_TOKEN`.

Photo upload remains manual because Chrome extensions cannot set file input
values from remote image URLs. The extension can copy the ordered photo URLs.

## Persistence notes

- Runtime storage uses Prisma with PostgreSQL.
- The main schema uses the `public` schema in the `lotpilot` database.
- Integration tests use the `test` schema in the same database.
- Inventory sources and sync runs are persisted alongside vehicles and leads.
- Vehicle snapshots, listing events, and lead events are stored as append-only
  records.

## Feed notes

- The first real adapter is `xml_feed_url` with `generic_xml_v1`.
- Manual `sync now` is supported through the API.
- Recurring polling, CSV URL ingest, and website scrape fallback are not
  implemented yet.

## MVP shape

- Inventory ingestion from feeds, CSV, or website scrape fallback.
- Eligibility engine for retail-ready vehicles.
- Listing copy, image overlays, and optional stale-unit video assets.
- Listing executor with publish, update, and remove workflows.
- Health dashboard, issue queue, and audit trail.
- Lightweight lead-assist workflow for reps and managers.

## Non-goals

- Full CRM replacement.
- Full omnichannel inbox replacement.
- Generic social scheduler.
- Enterprise permissions matrix before demand proves it out.
- Autonomous AI sales agent.
