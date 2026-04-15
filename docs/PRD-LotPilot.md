# PRD: LotPilot

Status: Draft
Last updated: 2026-04-15
Working title: LotPilot
Internal shorthand: Marketplace Reliability Engine for Dealers

## 1. Summary

LotPilot is a SaaS tool for independent dealers and small dealer groups. It
keeps retail-ready cars live, accurate, and working on Marketplace-first
promotion flows by syncing inventory, deciding which units are eligible,
generating listing assets, coordinating publish, update, and removal work, and
helping store teams react faster to leads.

The wedge is reliability, simplicity, and stale-unit turnover. The product is
not trying to become a full CRM, a broad social media suite, or an agency
replacement.

## 2. Contacts

| Role | Name | Comment |
| --- | --- | --- |
| Product owner | TBD | Owns scope, pricing, and release decisions. |
| Engineering lead | TBD | Owns architecture, delivery, and reliability. |
| Design lead | TBD | Owns dealer, ops, and rep surfaces. |
| Operations lead | TBD | Owns managed publish workflow and SLA policy. |
| GTM lead | TBD | Owns ICP fit, demo promise, and beta rollout. |

## 3. Background

### Context

Independent dealers and small dealer groups often depend on third-party sites,
Facebook, and manual staff work to keep vehicle promotion current. The usual
result is stale listings, sold cars left visible too long, weak rep follow-up,
and poor proof that the channel is worth the effort.

LotPilot is built around one main job:

> Keep my inventory live, accurate, and working on Marketplace without making
> my staff babysit it.

The secondary job is to help stores get more value from stale units and stop
missing the leads that the channel creates.

### Why now

Several market signals make a narrower, more reliable product timely:

- Meta's current Marketplace environment makes it risky to assume the old
  high-volume organic dealer listing playbook still works unchanged.
- Meta continues to add automation and AI features inside its own messaging
  surfaces, so an external product should start with assisted workflows instead
  of pretending it fully owns the inbox.
- Competitors already market broad automation, AI video, and multi-platform
  sync. A simpler and more reliable product can still win if it removes dealer
  busywork faster and with less setup.
- FTC enforcement remains active against deceptive vehicle advertising,
  including advertised prices and unavailable vehicles, which increases the
  value of accurate status updates and audit trails.

### Product thesis

LotPilot should be built as an inventory-state machine with channel execution
adapters.

Source of truth:

`vehicle status -> eligibility -> asset generation -> listing state -> issue queue -> reporting`

Not the source of truth:

`post composer -> social scheduler -> vanity analytics`

That distinction is the whole wedge.

## 4. Objective

### Product objective

Build the smallest sellable product that lets a dealer connect inventory, see
which units are eligible, keep Marketplace-oriented listing work current, boost
stale units with fresh assets, and handle resulting leads faster without heavy
setup.

### Why it matters

For dealers, the value is more working exposure, fewer stale or sold listing
issues, less manual busywork, and clearer proof of ROI.

For the company, the value is a demo-friendly promise, a lighter onboarding
motion than heavyweight merchandising suites, and a hybrid service model that
can work before deep native integrations are finished.

### Business goals

- Close dealers with a simple promise in one demo.
- Reduce dependence on one-off custom integrations.
- Support a hybrid manual and automated operating model early.
- Feel safer and simpler than broader competitors.

### Product goals

- Inventory sync that works out of the box.
- Clear listing coverage and health.
- Reliable sold-unit removal.
- Simple stale-inventory booster.
- Lightweight lead-assist workflow.
- Minimal dealer setup burden.

### Key Results

1. Dealers can complete setup and first sync in under 20 minutes without
   engineer help.
2. New or changed inventory appears within 15 minutes of a scheduled sync for
   beta rooftops.
3. At least 80% of eligible inventory is live or queued through a supported
   executor mode within 24 hours of onboarding.
4. At least 95% of sold units are queued for removal within 5 minutes of sold
   detection.
5. At least 90% of sold-unit removals are completed within 4 hours in
   supported managed or assisted flows.
6. Overlay image generation succeeds for at least 95% of valid vehicles, and
   stale-unit video renders in under 90 seconds for a standard 10-photo unit.
7. Managers can assign a captured lead and reps can update lead status in under
   3 clicks.

## 5. Market Segment(s)

### Primary ICP

Independent used-car dealers and small dealer groups with 1 to 5 rooftops and
roughly 40 to 250 retail units.

Common traits:

- Weak or inconsistent Marketplace process.
- No dedicated social team.
- No strong internal BDC.
- High dependence on third-party sites and or Facebook.
- Low patience for setup burden and vendor complexity.

### Secondary ICP

Small franchise stores or small franchise groups that want a narrow
Marketplace and stale-inventory tool without buying a full merchandising
platform.

### Not the ICP for MVP

- Large dealer groups needing enterprise controls.
- Stores already committed to heavy merchandising suites.
- OEM-driven rooftops with deep approval workflows.
- Dealers asking for a full CRM replacement.

### User groups

**Dealer principal / GM**

Wants more exposure, fewer stale and sold listing issues, and simple proof that
the tool pays for itself.

**Sales manager / internet manager**

Wants inventory to stay current, reps assigned correctly, fewer missed
inquiries, and less manual work.

**Sales rep**

Wants listings assigned to them, faster reply help, simple ready-to-use
content, and more reachable shoppers.

**Internal ops user**

Used only in managed or hybrid execution modes. Wants a task queue, exception
visibility, and SLA tracking.

## 6. Value Proposition(s)

### Core promise

> Connect your inventory. We keep your retail-ready cars active and accurate on
> Marketplace, help your team respond faster, and automatically boost stale
> units with fresh content.

### Customer jobs

- Keep inventory exposure current without daily babysitting.
- Remove sold or blocked vehicles fast.
- Refresh stale units without turning staff into content creators.
- Route lead work to reps quickly with enough context to reply.
- Prove whether the channel is worth paying for.

### Pains removed

- Manual posting and reposting.
- Sold units left live too long.
- Price and photo changes not reflected fast enough.
- Missed or slow lead follow-up.
- Confusing vendor setup and unclear accountability.

### Gains created

- Better listing coverage.
- Faster stale-unit refresh cycles.
- Cleaner manager visibility into issues and SLAs.
- Simple reporting on freshness, coverage, and captured activity.
- A safer operating model with audit trails and clear states.

### Why this is better than broad competitors

LotPilot should not try to out-feature big merchandising or social tools in V1.
It wins by being:

- More reliable.
- Easier to set up.
- Better at stale-unit turnover.
- Better at tracking inventory-state changes.
- Better at explaining what happened and what needs attention.

## 7. Solution

### 7.1 UX and key workflows

#### Onboarding workflow

1. Dealer signs up.
2. Dealer chooses an inventory source: XML, JSON, CSV, website scrape
   fallback, or manual one-off import.
3. Dealer enters rooftop basics: name, location, phone, logo, disclaimer text.
4. Dealer chooses default rep assignment logic.
5. Dealer sets rules such as minimum photo count, excluded statuses, and stale
   threshold.
6. System imports inventory and shows an inventory health report.
7. Dealer approves the first batch.
8. System starts publish, update, and removal execution.

#### Vehicle eligibility workflow

For each vehicle, the system checks:

- In stock and retail available.
- Price present.
- Required photo count met.
- VIN present.
- Year, make, and model present.
- Not sold, reserved, wholesale, or blocked by a compliance issue.

Output state:

- `eligible`
- `eligible_with_warning`
- `blocked`

Blocked and warning states must show the exact reason.

#### Listing generation workflow

For each eligible unit, the system generates:

- Listing title.
- Short description.
- Long description.
- CTA block.
- Photo order recommendation.
- Branded hero overlay.
- Optional short video for stale or manually requested units.

Dealer controls:

- Auto-approve by rule.
- Review flagged vehicles only.
- Lock custom edits on specific units.

#### Publishing workflow

Publishing is abstracted behind a `Listing Executor` with three modes:

- **Mode A: Assisted publish.** System prepares the draft and supports a
  dealer-authorized one-tap or guided publish flow.
- **Mode B: Managed ops publish.** Internal ops handles execution from a task
  queue and marks completion.
- **Mode C: Paid catalog export.** Later mode for structured export into Meta
  catalog and lead-gen flows.

Every publish action creates an audit record.

#### Update workflow

When inventory changes:

- Price changed -> queue content and listing update.
- Photos changed -> regenerate assets if configured.
- Vehicle sold or reserved -> queue remove action immediately.
- Vehicle no longer eligible -> suppress or remove.
- Stale threshold crossed -> queue booster content.

Target SLAs:

- Import change detection within 15 minutes.
- Price-change action queued within 15 minutes.
- Sold-unit remove action queued within 5 minutes.
- Sold-unit removal completed within 4 hours in supported flows.

#### Stale inventory booster workflow

Trigger when:

- Unit age exceeds threshold, default 45 days.
- No recent price drop or repost within a configurable window.
- At least 8 photos are available.

System generates:

- 15s, 20s, or 30s vertical slideshow video.
- Refreshed description variant.
- Approved badges such as price drop or fresh trade when structured fields
  support them.
- Optional refreshed repost task.

This is a turnover feature, not a general social strategy product.

#### Lead-assist workflow

Lead handling in MVP is assisted, not fully autonomous.

MVP includes:

- Tracked phone number overlay assets.
- Tracked CTA blocks.
- Optional landing-page or VDP deep links with UTM parameters for paid or
  exported placements.
- Suggested replies for common questions.
- Rep assignment.
- Lead log.
- Manual hot, warm, and cold classification.
- Response SLA timer.

Optional experimental inputs:

- Forwarded email notifications.
- Pasted conversation text.
- Screenshot or text ingestion for reply suggestions.

Not in MVP:

- Guaranteed two-way sync for all Marketplace messages.
- Full autonomous messaging bot.

### 7.2 Key features

#### Inventory ingestion

Must support:

- XML feed URL.
- JSON feed URL.
- CSV upload.
- Website scrape fallback.
- Manual one-off vehicle import.

Required normalized fields:

- VIN
- stock number
- year
- make
- model
- trim
- condition
- mileage
- price
- body style
- exterior color
- interior color when present
- photo URLs
- vehicle status
- VDP URL when present
- rooftop
- salesperson assignment when present

Optional fields:

- CARFAX or AutoCheck URL
- options list
- drivetrain
- transmission
- fuel type
- engine
- days in inventory
- featured flag
- price history

Rules:

- Imports are idempotent.
- Duplicate VINs are flagged, not silently duplicated.
- Raw source payloads are stored for debugging.
- Import errors are visible in the dashboard.

#### Inventory health scoring

Each rooftop gets a health score based on:

- Percent of vehicles with required fields.
- Percent eligible.
- Percent missing price.
- Percent with too few photos.
- Percent stale.
- Percent with unresolved sync issues.

The score is shown during onboarding and daily after that.

#### Content generation

The system generates:

- Listing title.
- Listing description.
- Short ad copy variant.
- Captions for stale-unit asset use.
- Reply snippets for FAQs.

Generation rules:

- Use authoritative structured data only.
- Never invent packages, features, accident history, or ownership history.
- Mention financing, warranty, clean CARFAX, or one-owner only when an approved
  field exists.
- Support tone presets such as straightforward, value-focused, and premium.
- Preserve reviewability and version history.

Each generated asset stores:

- model used
- prompt version
- created_at
- approved_by or auto-approved flag

#### Media pipeline

For images:

- Reorder by usefulness and quality.
- Detect duplicates.
- Detect low resolution.
- Generate branded overlay variants.
- Preserve original archive.

For video:

- Create 9:16 vertical video.
- Support 15s, 20s, and 30s versions.
- Use dealership logo outro.
- Overlay key facts such as year, make/model, price, and mileage.
- Make background music optional.
- Export MP4.

#### Listing execution state machine

Each listing record supports:

- `draft_created`
- `queued_for_publish`
- `publish_in_progress`
- `published`
- `publish_failed`
- `queued_for_update`
- `update_in_progress`
- `updated`
- `queued_for_remove`
- `remove_in_progress`
- `removed`
- `removal_failed`
- `suppressed_unknown`
- `needs_manual_review`

Every transition must be logged.

#### Exception handling

Exceptions include:

- Missing required photos.
- Invalid price.
- Sold vehicle still live.
- Publish failure.
- Duplicate live listing.
- Unauthorized account or expired session.
- Content blocked by policy rule.
- Vehicle removed from source unexpectedly.

The system must:

- Surface exceptions in queues.
- Assign severity.
- Allow resolve, snooze, and retry.
- Notify managers for critical failures.

#### Rep assignment and lead records

Assignment logic:

- Use source-assigned salesperson when available.
- Else use rooftop-level round robin.
- Allow manager reassignment.
- Escalate stale leads.

Lead object fields:

- source channel
- source subchannel
- vehicle_id
- rooftop_id
- assigned_rep_id
- created_at
- first_response_at
- status
- disposition
- appointment_set flag
- sold flag
- attributed_value optional

Lead statuses:

- `new`
- `acknowledged`
- `responded`
- `appointment_set`
- `no_show`
- `dead`
- `sold`
- `lost`

#### Reporting

Dealer dashboard shows:

- Total active eligible vehicles.
- Total vehicles live.
- Listing coverage percent.
- Sold vehicles removed on time percent.
- Average time from feed change to action.
- Stale inventory count.
- Stale units boosted this month.
- Calls, text clicks, or leads by vehicle where trackable.
- Manual sold attribution.
- Top-performing units.
- Units with issues.

Manager digest shows:

- Daily listing health.
- Yesterday's changes.
- Failures needing action.
- Stale units not boosted.
- Unresponded leads.

### 7.3 Technology recommendation

Recommended stack:

- Frontend: Next.js, React, TypeScript.
- Backend: Node.js with TypeScript, or Python where job orchestration or media
  tooling benefits.
- Database: Postgres.
- ORM: Prisma or SQLAlchemy.
- Queue and jobs: BullMQ or Temporal.
- Cache: Redis.
- File storage: S3-compatible object storage.
- Video rendering: FFmpeg plus Remotion.
- Auth: Clerk, Auth0, or Supabase Auth.
- Observability: Sentry, structured logs, and job monitoring.

Service boundaries:

- auth service
- dealer/account service
- inventory ingestion service
- normalization service
- content generation service
- media processing service
- listing executor service
- lead service
- reporting service
- internal ops service

Architecture rules:

- Multi-tenant from day one.
- All external actions idempotent.
- Retain raw source snapshots.
- Keep an event log for all critical state changes.
- Use feature flags for executor modes.
- Support dealer-level config overrides.
- Use retry queues with dead-letter handling.

### 7.4 Assumptions, constraints, and open questions

#### Product constraints

- MVP must not assume old business-Page-based vehicle listing behavior still
  scales for dealers.
- MVP must treat lead messaging as assisted because Meta controls the primary
  messaging surfaces and is adding more native automation.
- MVP must differentiate on reliability, stale-unit workflow, and lighter
  onboarding instead of matching every competitor feature.
- Every price and status change must be auditable.

#### AI requirements

AI is allowed for:

- Copy generation.
- Photo QA.
- Description variants.
- FAQ extraction.
- Reply suggestions.
- Stale-unit video assembly prompts.

AI is not allowed to:

- Invent vehicle facts.
- Quote financing terms without an approved template.
- Make unavailable-vehicle claims.
- Send autonomous customer messages without explicit workflow approval.
- Rewrite dealer-set pricing.

All AI outputs must be reviewable, regenerable, versioned, and attributable to
model plus prompt version.

#### Security and compliance requirements

- Encrypt dealer credentials and tokens at rest.
- Use role-based permissions.
- Keep an audit log for publish, update, and remove actions.
- Store the minimum necessary PII.
- Define a retention policy for lead data.
- Separate internal notes from dealer-visible logs.
- Make all dealer content changes traceable.

#### Open questions to validate during alpha

- Which executor mode reaches value fastest: assisted publish, managed ops, or
  both?
- Which inventory sources cover the most dealer demand with the least support
  overhead?
- What dealer actions need hard approval instead of rule-based auto-approval?
- What minimum lead ingestion path creates real response improvement without
  claiming full inbox ownership?
- Which stale-unit triggers actually move aged inventory?

## 8. Release

### MVP release definition

MVP is complete when a dealer can:

- Connect inventory.
- See which units are eligible.
- Auto-generate compliant listing assets.
- Publish, update, and remove through at least one supported executor mode.
- See failures and health issues.
- Generate stale-unit video for aged units.
- Assign leads and use assisted response tools.
- View simple ROI and coverage reporting.

### Release phases

#### Phase 1: Internal alpha

- One inventory source.
- Manual CSV fallback.
- Internal ops queue only.
- No extension yet.
- One dealer and one rooftop.

#### Phase 2: MVP beta

- Feed URL onboarding.
- Rules engine.
- Content generation.
- Stale-unit video.
- Dealer dashboard.
- Manual or hybrid execution.
- Basic lead log.

#### Phase 3: Sellable MVP

- Assisted publish surface.
- Tracked call and text assets.
- Daily digest.
- Coverage reporting.
- Rep assignment.
- Polished onboarding.

### What to fake or run manually first

- Hard DMS edge cases.
- Exception-based publish execution.
- Sold attribution confirmation.
- Advanced lead classification.
- Odd dealer inventory formats.
- Custom video styling per dealer.

### What not to overbuild

- Full Marketplace inbox sync.
- Generic social scheduler.
- AI chatbot that claims to replace staff.
- Perfect attribution.
- Enterprise permissions before demand proves it out.
- Native mobile app before web helper or extension demand is real.

---

## Appendix A: Scope

### In scope for MVP

- Inventory ingestion.
- Normalization and eligibility rules.
- Listing content generation.
- Image QA and overlay generation.
- Optional stale-unit short video generation.
- Publish, update, and remove orchestration.
- Listing health dashboard.
- Lightweight lead capture and response assist.
- Rep assignment and alerts.
- Reporting on coverage, freshness, and attributed activity.
- Internal ops queue.

### In scope for V1.5

- Export to Meta catalog ads and Advantage+ catalog lead-gen paths.
- Downloadable or auto-publish-ready vertical videos for Reels and Shorts.
- Better lead attribution and appointment tracking.

### Out of scope until validation

- Full bi-directional Marketplace inbox sync.
- Full automated negotiation.
- Custom AI agents acting autonomously without guardrails.

### Non-goals for MVP

- Full CRM.
- Full omnichannel inbox replacement.
- Ad budget optimizer.
- Multi-channel social scheduler for all content types.
- Advanced attribution modeling.
- Enterprise permissions matrix.
- AI voice sales agent.
- Custom video editor.
- Reputation management suite.
- Desking, F&I, or pencil tools.

## Appendix B: Screen inventory

### Dealer app screens

- Setup wizard.
- Inventory health overview.
- Vehicles list.
- Vehicle detail.
- Listing status panel.
- Stale inventory booster queue.
- Lead log.
- Reports dashboard.
- Settings.
- User and rep assignments.

### Internal ops screens

- Task queue.
- Failed publish, update, and remove queue.
- Account and session issue queue.
- Dealer notes.
- Audit log.

### Rep assistant surfaces

- Browser extension or lightweight web helper.
- Vehicle quick facts panel.
- Suggested response module.
- Fast actions for hot, appointment, and sold.

## Appendix C: Integrations

### Must-have early integrations

- Generic XML, CSV, and JSON inventory feeds.
- Website scrape fallback.
- Email notification ingest.
- Twilio or similar tracked number provider.
- Cloud storage for media.
- Authentication provider.
- Analytics and event tracking.

### First dealer-system targets

Use a feed-first strategy before deep native integrations.

Suggested order:

1. HomeNet or generic feed.
2. DealerCenter.
3. Frazer.
4. vAuto export.
5. Website scrape fallback.
6. Deeper native integrations later.

## Appendix D: Data model

Core entities:

- Dealer
- Rooftop
- User
- RepProfile
- InventorySource
- InventorySyncRun
- Vehicle
- VehicleSnapshot
- MediaAsset
- ListingDraft
- ListingExecution
- ListingEvent
- Lead
- LeadEvent
- AssignmentRule
- ComplianceIssue
- BoosterCampaign
- BoosterAsset
- DailyDigest
- AuditLog

## Appendix E: Acceptance criteria

### Onboarding

- Dealer can connect a feed and complete setup in under 20 minutes.
- First inventory sync finishes without engineer intervention.
- Health report is visible right after import.

### Inventory sync

- New or changed vehicles appear within 15 minutes of scheduled sync.
- Duplicate VINs are flagged, not silently duplicated.
- Invalid rows are logged with visible error reasons.

### Eligibility engine

- Blocked vehicles show the exact reason.
- Manager can override a block manually.
- Rules can be set per rooftop.

### Content generation

- Title and description generate in under 10 seconds per vehicle.
- No generated copy includes unsupported vehicle facts.
- Asset regeneration is available on demand.

### Media

- Overlay image generation succeeds for 95% or more of valid vehicles.
- Stale-unit video renders in under 90 seconds for a standard 10-photo unit.
- Failed media jobs retry automatically.

### Listing execution

- Every publish, update, and remove request creates an audit event.
- Sold vehicle removal is queued within 5 minutes of sold detection.
- Failures are visible in the internal ops queue and dealer dashboard.

### Lead assist

- Manager can assign a rep to a lead.
- Rep can view vehicle context and suggested response.
- Lead status can be updated manually in under 3 clicks.

### Reporting

- Dashboard loads in under 3 seconds for stores under 500 vehicles.
- Listing coverage and issue counts are accurate to current sync state.
- Daily digest sends once per rooftop per day.

## Appendix F: Validated external notes

These notes were validated on 2026-04-15 and are meant to keep the PRD honest
about platform and compliance constraints.

### Meta platform notes

- Meta's Marketplace help says that, in supported regions, dealerships can
  create up to five vehicle listings per calendar month, and older dealer
  vehicle listings were renewed only until 2025-03-13. LotPilot should not
  depend on manual native Marketplace listing as the main scalable dealer
  workflow.
- Meta Business Suite Inbox is Meta's own center for reading and replying to
  business messages across Messenger, Instagram, and WhatsApp, and it supports
  message automations.
- Meta's Messenger help says some Pages can use AI-generated responses, which
  reinforces the decision to treat external response automation as assisted
  rather than full inbox replacement.
- Meta for Business currently markets lead ads and Advantage+ catalog ads for
  lead generation, including vehicle inventory, which makes paid catalog export
  a credible V1.5 path.

### Competitive note

- CARVID publicly markets dealership inventory sync, AI video generation, lead
  tracking, and multi-platform automation. LotPilot should not copy that
  breadth in V1. Its wedge should stay reliability, stale-unit turnover, setup
  speed, and auditability.

### Compliance note

- The FTC warned 97 auto dealership groups in March 2026 about deceptive
  pricing and specifically cited advertising unavailable or non-existent
  vehicles.
- The FTC and Maryland Attorney General also announced a 2026 settlement with
  Lindsay Automotive Group that included allegations around false low prices
  and misrepresentations about whether vehicles were available at advertised
  prices.

Implication: fast status updates, sold-unit removal, and audit trails are not
nice-to-have features. They are part of the product's trust and compliance
story.

### Source links

- Meta Marketplace help: https://www.facebook.com/help/153832041692242
- Meta Business Suite Inbox:
  https://www.facebook.com/help/messenger-app/294426838452244/
- Meta automated and AI chats:
  https://www.facebook.com/help/messenger-app/1127097651266653/Automated%2Band%2BAI%2Bchats%2Bwith%2BPages%2Bon%2BMessenger
- Meta lead ads:
  https://www.facebook.com/business/ads/ad-objectives/lead-generation
- Meta Advantage+ leads with catalog inventory:
  https://www.facebook.com/business/ads/meta-advantage-plus/leads
- CARVID Marketplace posting tool:
  https://www.carvidapp.com/facebook-marketplace-posting-tool/
- FTC warning letters to 97 dealer groups:
  https://www.ftc.gov/news-events/news/press-releases/2026/03/ftc-warns-97-auto-dealership-groups-about-deceptive-pricing
- FTC and Maryland action against Lindsay Automotive Group:
  https://www.ftc.gov/news-events/news/press-releases/2026/04/ftc-maryland-attorney-general-secure-full-refunds-additional-penalties-against-lindsay-auto-group
