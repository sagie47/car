# Phase 0 Validation Sprint: Marketplace Posting Wedge

Status: Ready for discovery
Sprint length: 2 weeks
Owner: Product
Last updated: 2026-06-24

## Objective

Validate the smallest sellable wedge before expanding LotPilot beyond the first
Marketplace posting workflow: small independent dealers should be able to paste
an inventory URL, review imported vehicles, create Marketplace-ready posts, and
understand how lead alerts will help them respond faster.

## Hypothesis

Independent used-car dealers with 10 to 75 retail units will pay for a cheap,
fast, dealer-safe posting assistant if it reduces repetitive Facebook
Marketplace posting work and provides immediate lead alerts without a setup fee,
manager approval process, desktop software, or dealership-level contract.

## Target customer

### Primary beta profile

- Independent used-car dealer with 10 to 75 vehicles.
- Owner/operator, GM, sales manager, or internet manager owns posting work.
- Already posts manually to Facebook Marketplace.
- Sells a meaningful share of inventory under $15,000.
- Has low tolerance for setup fees, annual contracts, or demo-gated software.
- Wants a safer assisted workflow instead of brittle black-box automation.

### Exclusions for this sprint

- Franchise stores with OEM approval workflows.
- Large dealer groups needing enterprise permissions.
- Dealers asking for a full CRM replacement.
- Sellers who only want AI-generated descriptions and do not care about posting
  speed.

## Validation questions

1. Will dealers paste a public inventory URL into the product as the first setup
   step?
2. Which inventory sources must the MVP support first: dealer website, hosted
   inventory page, XML feed, CSV, or manual upload?
3. Is a Facebook Marketplace-first workflow enough to start, or is Craigslist a
   launch blocker?
4. What level of posting assistance feels useful while still feeling safe and
   platform-compliant?
5. Do dealers value SMS lead alerts enough for them to be part of the first paid
   plan?
6. Which price feels like an easy yes: $29, $49, $79, or $99 per month?
7. What proof would make a dealer believe the product paid for itself?

## Dealer interview script

### Opening

- "Walk me through how you get a car from your inventory system or website onto
  Facebook Marketplace today."
- "Who usually does this work, and how often?"
- "How long does one vehicle take from start to finish?"

### Current workflow

- "Where do you copy vehicle details from?"
- "How do you choose photos?"
- "What do you do when a vehicle sells or the price changes?"
- "How do you track what is posted and what is stale?"

### Pain and urgency

- "What is the most annoying part of posting inventory?"
- "What breaks most often?"
- "What happens when leads come in after hours or to the wrong person?"
- "Have you paid for any posting, syndication, or automation tools before? Why
  did you keep or cancel them?"

### Concept test

Show the concept as a four-step flow:

1. Paste inventory URL.
2. Pick vehicles.
3. Review Marketplace-ready posts.
4. Send lead alerts to a phone.

Ask:

- "Would this save time in your current process?"
- "What would stop you from using it?"
- "Would you expect it to post automatically, or is copy-and-approve enough?"
- "Where does this feel risky or non-compliant?"

### Pricing test

- "If this saved your team a few hours per week, what monthly price would feel
  obvious?"
- "Would a setup fee kill the deal?"
- "Would you prefer a vehicle-count plan or a flat monthly plan?"

### Close

- "Can we test this with your real inventory URL?"
- "Would you join a beta if the first version only supports Facebook
  Marketplace-ready posts and SMS/email lead alerts?"
- "Who else at the dealership would need to approve this?"

## Prototype requirements

The discovery prototype does not need full automation. It needs to make the
promise tangible.

### Required screens

1. URL intake screen with one primary field: inventory URL.
2. Imported vehicle preview with photo, year, make, model, mileage, price, and
   source URL.
3. Vehicle selection step for choosing units to prepare.
4. Marketplace-ready post preview with title, price, description, photos, and
   copy buttons.
5. Lead alert setup screen for phone and email recipients.

### Required copy principles

- Lead with speed, simplicity, and price sensitivity.
- Describe AI as auto-fill or listing cleanup, not as the headline.
- Use dealer-safe language: assisted, reviewable, approval-based, and under the
  dealer's control.
- Avoid claims that imply bypassing Facebook Marketplace rules.

## Minimum evidence to exit Phase 0

The team can move to Phase 1 only when the sprint produces:

- 10 completed dealer interviews.
- 5 dealers who say the concept solves a current posting pain.
- 3 dealers willing to test with real inventory.
- 2 dealers willing to pay for the beta if it works with their inventory source.
- A ranked list of the first three inventory source formats or providers.
- A pricing recommendation for the first paid plan.
- A clear decision on whether the MVP should be copy-and-approve or deeper
  browser-assisted posting.

## Phase 1 handoff

Phase 1 should start with the validated version of this workflow:

1. Dealer enters an inventory URL or upload source.
2. LotPilot imports normalized vehicle records.
3. Dealer selects vehicles to prepare.
4. LotPilot generates Marketplace-ready listing drafts.
5. Dealer copies or approves the post content.
6. LotPilot captures or routes lead alerts to SMS/email.

The handoff should include interview notes, prototype feedback, beta dealer
inventory examples, pricing findings, and a final MVP scope decision.
