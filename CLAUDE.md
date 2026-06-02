# CLAUDE.md

Guidance for AI coding agents working in this repository. This file is the
**authority on project-wide rules**. `mobile/` carries its own Expo-specific
guidance (`mobile/AGENTS.md`: read the versioned Expo docs before writing native
code) — that is supplementary and applies only to Expo/native specifics; the
rules here govern the whole repo.

`ARCHITECTURE.md` at the repo root is the source of truth for _what_ this project
is and _why_ it is shaped this way. Read it before non-trivial work. This file is
the operational distillation: the rules that must hold in code.

## Project Overview

A native mobile app (iOS + Android, React Native + Expo) for personal daily
tracking. A single user defines **topics**, records an ordered-scale **value**
for each most days, and views the year as a color heatmap to spot patterns.
**Single-device, local, offline. No server, no accounts, no sync.**

Two-package npm-workspace monorepo:

```
/core    @journal/core — platform-agnostic TypeScript: event types, fold, domain rules
/mobile  Expo shell — UI + local storage adapter, depends on core
```

## Build / Run / Test Commands

> Confirm these against `package.json`; adjust if script names differ.

```bash
npm install                 # link workspaces
npm test                    # run core unit tests (Vitest)
npm run typecheck           # type-check both packages
npm run lint:deps           # dependency-cruiser: enforce the core/mobile boundary
npx expo start              # run the mobile app (from /mobile or via workspace)
```

Run `npm run lint:deps` and `npm run typecheck` before considering any change
done — they are the two guards that keep the architecture honest.

## The Boundary (non-negotiable)

The dependency direction is strict and **one-way**:

- `mobile` imports from `core`.
- `core` imports from `mobile`: **never.**
- `core` imports platform code (`react`, `react-native`, `expo`, `window`,
  `document`, `fetch`, any DOM/native API): **never.**

This is enforced two ways and both must stay green: `dependency-cruiser`
(`lint:deps`) and `core`'s `tsconfig` omitting the DOM lib (so platform globals
are compile errors). Do not weaken either guard to make code compile — if `core`
seems to need a platform API, the design is wrong: declare a **port**
(interface) in `core` and implement the **adapter** in `mobile`.

`core` is pure domain logic and must be fully testable with no device, no UI, no
platform. If a change makes `core` need a simulator to test, stop.

## Data-Semantics Invariants (looks fine, is actually a bug)

These are correctness rules that ordinary review and "it compiles / it renders"
will NOT catch. Violating them silently corrupts user data or the visualization.
Treat any change touching these areas as requiring a test that pins the rule.

1. **Missing is not zero.** A topic not logged on a day is genuinely _absent_. It
   is a distinct state from "logged the lowest rank (0)". Never coerce missing to
   0, never default-fill, never render an absent day in a topic color (absent =
   neutral/grey). Storage, fold, and UI must all keep the two distinct. The
   overlay/correlation view must **skip** days where either topic is absent, never
   treat absent as a value.

2. **No pre-selected value.** On the quick-log screen, an un-logged topic shows
   nothing selected — no default rank highlighted. Empty until the user taps.
   (This is the UI face of rule 1; pre-selecting silently manufactures fake data.)

3. **`logging_date` is computed-and-stored at log time, never re-derived.** A
   value's logging date is decided once, by `loggingDateFor(ts, boundary)` in
   `core`, and frozen into the event. The fold must read the stored
   `logging_date`, never recompute it from `ts`. Re-deriving would let a later
   change to the logging-day-boundary setting silently rewrite history.

4. **The fold is the single source of truth for state.** UI state is a
   left-reduce over the append-only event log. Do not maintain a parallel mutable
   "current state" that can drift from the log. Editing a day = appending a later
   `DayValueSet` for the same `(topic_id, logging_date)` key; latest `ts` wins.
   Returning a cell to missing = appending `DayValueClear`. Never mutate or
   delete past events to represent an edit.

5. **Scale granularity is fixed at topic creation.** There is no event that
   changes a topic's number of levels; `TopicEdited` covers color and labels only.
   Do not add a path that mutates an existing topic's scale granularity — it would
   invalidate the meaning of every value already recorded against the old scale.

## Settings: two categories

Before adding or changing any setting, classify it:

- **Display / behavior** (notification time, topic color, labels) — freely
  changeable, retroactive, no data consequence. Lives in `mobile`.
- **Domain** (the logging-day boundary) — changes what stored data _means_.
  Requires an explicit rule for data already recorded under the old value. The
  logging-day boundary uses **freeze semantics**: a change affects only future
  logging; past values keep their stored `logging_date`.

**Rule:** if a setting would change the meaning of already-recorded data, it is a
domain setting — stop and define the past-data behavior before implementing.
Keep the set of domain settings as small as possible.

## Code Style & Conventions

- Standard formatting via the project's configured formatter/linter; no bespoke
  rules beyond what's set up.
- `core` is plain TypeScript with strict settings; keep it dependency-light and
  platform-free.
- Domain types are explicit; prefer making illegal states unrepresentable in the
  type system (e.g. "missing" is a distinct variant, not a nullable rank that
  invites coercion to 0).
- Constructors/factories and interfaces named by role, not prefixed with `I`.

## Testing Conventions

- **Test-first for domain logic.** For a bug fix, write the failing test first,
  then the fix (two commits: failing test, then fix). For new `core` logic, the
  test encodes the rule before the implementation satisfies it.
- **`core` is tested in isolation** — no device, no UI, no platform mocks needed.
- **Pin the invariants above with tests**, specifically:
  - `loggingDateFor`: assert a timestamp just before vs. just after the boundary
    yields _different_ dates (e.g. 03:59 vs 04:01 with a 04:00 boundary).
  - Fold convergence: applying the same set of events in different orders yields
    identical state (the deterministic-resolution property).
  - Missing vs. rank-0: assert these produce distinct fold output and distinct
    render state; assert the overlay skips absent days.
- Standard-library / framework-native test tooling (Vitest); no heavyweight
  mocking frameworks unless there's a clear need.

## Comments

When adding or reviewing comments, use the **`/commenting` skill** (per
Ousterhout's _A Philosophy of Software Design_): comment the _why_ and the
non-obvious, not the _what_ the code already states. Document interfaces and the
intent behind the data-semantics invariants above at their definition sites, so
the next reader (or agent) understands why "missing ≠ 0" and "freeze
`logging_date`" matter before they're tempted to "simplify" them away.

## Commit Messages

Conventional Commits: `type: description` (lowercase, imperative).
Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`. Scoped variants
allowed: `feat(core): add loggingDateFor`. Atomic commits — one logical change
each. The two-commit pattern for bug fixes (failing test, then fix) is the norm.

## Session Discipline

- Work in tightly-scoped sessions with explicit scope. State the plan before
  large or structural changes and wait for confirmation.
- Do not pull in libraries (state management, navigation, notification libs,
  storage engines) until the session that genuinely needs them — and name the
  choice explicitly when you do.
- Do not invent structure beyond `ARCHITECTURE.md`. If the spec is silent on
  something structural, ask rather than improvise.
- Verify fast-moving platform/tooling details (Expo SDK, RN, native APIs) against
  current docs rather than memory — see `mobile/AGENTS.md`.
