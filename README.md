# LotPilot

LotPilot is a Marketplace-first inventory reliability tool for independent
dealers and small dealer groups.

It syncs inventory, decides which units are eligible for promotion, generates
listing assets, coordinates publish/update/remove work, boosts stale units with
fresh content, and gives store teams a lightweight way to handle resulting
leads faster.

The product wedge is reliability, stale-unit workflow, and low setup burden.
LotPilot is not trying to be a full CRM, a broad social suite, or an agency
replacement.

## Core promise

Connect your inventory. LotPilot keeps your retail-ready cars active and
accurate on Marketplace-first promotion flows, helps your team respond faster,
and refreshes stale units with new content.

## Primary deliverable

- Product requirements document: [docs/PRD-LotPilot.md](docs/PRD-LotPilot.md)

## Current implementation

The current implementation is a Prisma-backed Node service that covers the core
product wedge:

- Dealer and rooftop creation.
- Inventory ingest with durable vehicle upsert by rooftop plus VIN.
- Eligibility evaluation and rooftop health scoring.
- Listing draft generation and listing-state transitions.
- Basic lead creation, assignment, and status tracking.
- JSON API for local development.
- Postgres persistence for dealers, rooftops, sync runs, vehicles, snapshots,
  listings, listing events, leads, and lead events.

## Local setup

```bash
npm run db:up
npm run prisma:migrate
npm test
npm run test:integration
npm start
```

The server starts on `http://localhost:3000`.

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
- `POST /api/rooftops`
- `POST /api/ingest`
- `GET /api/vehicles?rooftopId=...`
- `GET /api/rooftops/:rooftopId/health`
- `GET /api/rooftops/:rooftopId/stale-vehicles`
- `GET /api/listings?rooftopId=...`
- `POST /api/listings/:listingId/transitions`
- `POST /api/leads`
- `PATCH /api/leads/:leadId/assign`
- `PATCH /api/leads/:leadId/status`

## Persistence notes

- Runtime storage uses Prisma with PostgreSQL.
- The main schema uses the `public` schema in the `lotpilot` database.
- Integration tests use the `test` schema in the same database.
- Vehicle snapshots, listing events, and lead events are stored as append-only
  records.

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
