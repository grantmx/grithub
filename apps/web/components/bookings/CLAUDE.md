# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This directory implements the co-working space booking flow rendered at `/cowork/book` (`app/(pages)/cowork/book/page.js`). See the root `CLAUDE.md` and `apps/web/CLAUDE.md` for monorepo/app-wide context.

## Two entry points, not one flow

- **`BookingWidget.jsx`** — the rate-quote form shown on the `/cowork` landing page (`app/(pages)/cowork/page.js`). It's self-contained: picks a workspace/rate from `lib/constants.js`'s `bookingSettings`, then hands off straight to a WhatsApp deep link (`wa.me/...`). It does **not** feed into the stepper below — the `<Link href="/cowork/book">` that would continue into the booking flow is commented out.
- **`index.jsx` (`Bookings`)** — the actual multi-step booking flow, mounted at `/cowork/book` inside a `StepperContextProvider` (`components/navigation/Stepper/context`).

## Step state has two sources of truth

The stepper is driven by **both**:
1. The `?step=` URL query param, read via `useSearchParams()` in `index.jsx` — this is what actually decides which step component renders (`queryStep === "1"` → `BookingDetails`, `"2"` → `CustomerDetails`).
2. `globalBook.current` in `StepperContext` (a plain `useReducer` context, `components/navigation/Stepper/context/StepperReducer.js`, actions `nextStep`/`setData`/`setName`) — set by each step's submit handler.

Each step component guards itself by comparing `globalBook.current` against its own step number and `router.push`-ing back if they don't match (e.g. `BookingDetails` expects `current === 1`, `CustomerDetails` expects `current === 2`). Keep both in sync when touching this flow — advancing one without the other re-triggers the redirect guard.

## Router hook inconsistency (pre-existing, easy to trip on)

- `BookingDetails.jsx` imports `useRouter` from **`next/navigation`** (App Router) but calls it with Pages-Router-only shapes — `router.query`, `router.asPath`, `router.push({ href, query })` — none of which exist on the App Router hook.
- `CustomerDetails.jsx` instead imports `useRouter` from **`next/router`** (Pages Router).

These two sibling step components use different, incompatible router APIs. Don't copy either pattern as "the" convention for this directory — check which hook a given file actually imports before extending it, and expect `router.query`/`router.asPath` reads in `BookingDetails.jsx` to be unreliable under the App Router.

## Step 3 (`PayDetails.jsx`) is unwired and incomplete

`index.jsx` only renders `queryStep === "1"` and `"2"` — `PayDetails.jsx` (step 3) is never imported or rendered by `Bookings`. It's also missing its `Style` and `StepperContext` imports outright, and hard-codes PayFast **sandbox** test merchant credentials with a commented-out call to `pages/api/payfast/generatePayId` (the real flow used elsewhere for programs/other bookings — see root `CLAUDE.md`). Treat this file as a stub, not a working reference for wiring PayFast into a booking step.

## Pricing config

Workspace types, rates (hourly/daily/monthly), and caps (`hours`, `people`) are hardcoded in `lib/constants.js`'s `bookingSettings` — not fetched from Sanity or any API. Current workspaces: `hot_desk`, `board_room`, `training_room`.

`BookingDetails.jsx`'s cost calculation (in a `useEffect` keyed on `globalBook?.data`) switches on workspace `id`, and its `case` labels don't fully match `bookingSettings.workSpaces` any more:

- `training_room` has hourly and daily rates in `bookingSettings.rates` but **no matching `case` in either cost-calc switch** — selecting it silently falls to `default: return`, so `total` never gets set and the Continue button (which requires `total`) stays disabled.
- The `id !== "dedicated_office"` guest-count check further down the same file is now stale — `dedicated_office` was removed from `bookingSettings.workSpaces` (and dropped from the switch) when `board_room`/`training_room` were introduced, so that comparison never matches anything.

When adding a new workspace type to `bookingSettings`, also add its `case` to *both* switches (hourly and daily) in `BookingDetails.jsx` — the config and the cost logic are maintained separately and don't validate against each other.
