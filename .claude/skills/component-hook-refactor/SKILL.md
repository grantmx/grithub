---
name: component-hook-refactor
description: Standard for splitting bloated page/section components in apps/web into custom hooks and helpers. Use when a component's useEffects, handlers, or derived state have grown large enough to obscure the JSX, or when asked to refactor a component "into hooks".
---

# Component → hooks refactor standard

Applies to `apps/web` (React/Next.js). Goal: keep the component function down to state wiring + JSX. Move logic out, don't just reformat it in place.

## When a component qualifies

- More than one `useEffect` doing unrelated things (data init, syncing to context, derived calculations).
- Event handlers / mutators (`onChange` handlers, "update this slice of state" functions) that don't reference JSX directly.
- A pure helper function defined inline (no closure over component state/props) mixed in with the component body.

## Where things go

- **Custom hook** (`components/<feature>/hooks/use<Thing>.js`) — for anything stateful or effectful that's specific to this feature: an effect that seeds/derives state, a group of related `dispatch`/context-mutating handlers, a computed value with its own `useState`/`useEffect`. One hook per *responsibility*, not one hook per effect — e.g. a cost-calculation effect and the effect that syncs its result back into context belong in the same hook if one only exists to serve the other.
- **Plain helper** (`lib/utils/<thing>.js`) — for pure functions with no React state/hooks/context dependency (date math, formatting, pricing math). If it doesn't call `useX`, it's not a hook.
- Hooks call their own `useContext`/`useRouter`/etc. internally rather than taking those as parameters — a hook should be a self-contained unit you can call with no arguments (or only the arguments that are genuinely per-call variables), not a function stripped out of the component and handed its dependencies as props.
- The component keeps only: hook calls for state it needs to render, and the JSX. If a value is only needed by a handler and never rendered, it doesn't need to come back out of the hook.

## Naming

- Hooks: `use<Feature><Responsibility>` (e.g. `useBookingCost`, `useBookingDefaults`, `useBookingActions`) — name for what it's responsible for, not for "the effect that used to be at line N".
- Keep the original variable/function names when moving code (`handelControl`, `total`, etc.) unless the name is actively wrong — a refactor is not the place to also rename things, that's a separate change.

## Non-goals

- Don't fix unrelated bugs uncovered while moving code (stale conditionals, mismatched switch cases, etc.) — note them, but leave the behavior identical unless the user asked for a fix too.
- Don't switch derived-state-via-effect to `useMemo`/plain computation *unless* the effect has no real dependency on anything but static/imported data (in which case the effect was never necessary and removing it is part of the same cleanup, not scope creep).
- Don't introduce new abstractions (generic hook factories, shared reducer patterns) beyond extracting what's already there.

## Reference example

`apps/web/components/bookings/BookingDetails.jsx` was split into:
- `hooks/useBookingOptions.js` — static dropdown ranges (people/hours), no effect needed.
- `hooks/useBookingDefaults.js` — one-time effect seeding booking data from query params or defaults.
- `hooks/useBookingCost.js` — cost-calculation effect + the effect syncing the result into `StepperContext`.
- `hooks/useBookingActions.js` — all the `dispatch`-based form handlers (`handelControl`, `updateData`, `addDay`, `updateDay`, `removeDay`, `submitForm`).
- `lib/utils/getMinBookingDate.js` — pure date helper, had no business being a hook or living in the component file.
