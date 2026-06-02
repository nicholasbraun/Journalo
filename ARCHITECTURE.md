# Architecture: Journal

> **Status:** Design. Living document.

A personal bullet-journal app. A single user records short, structured entries
each day. **Mobile-only, single-device, local.** No sync, no server. A new phone
is handled by platform backup, not by us.

This is the local form of "local-first": the device is the source of truth, the
app works fully offline, and there is no network dependency at all.

---

## 1. Scope

Scope was deliberately narrowed to **single-device, mobile-only, local**. The
following were considered and cut, so they aren't re-litigated: a **browser
client** (forced a fat web client, a device rendezvous, and an entitlement
check), **multi-device sync** (and with it all conflict-resolution / rendezvous
machinery), any **server** (relay or BYO-storage), **at-rest encryption**
(reduces to a device-security question with no server to hide from — possible
later hardening), and a **manual data export** (platform backup covers migration
for v1; export is the weaker-on-"own-your-data" tradeoff accepted here, §6).

## 2. What survives, and why

- **Event-sourced model + a standalone core package** (§4). Cheap, gives history
  and undo, keeps the domain clean, and is the one thing that leaves the door open
  to real sync later without a rewrite. Justified, not premature.
- **One-time paid app via the stores** (§7).
- **Local store placed where the platform backs it up** (§6) — the new
  load-bearing detail.

## 3. Functionality

The app tracks **topics** over time and visualizes them as a year-grid heatmap.

**Topics.** The user creates topics (e.g. "IBS", "Mood", "Slept well"). Each
topic has a name, a color, and an **ordered scale**. All values are ordered
ranks internally; any labels are display only. This is what makes both
color-intensity ("darker = more") and the overlay (below) well-defined —
unordered categories would break both.

- **Default scale:** a 5-level ordered scale (ranks 0–4) with generic labels the
  user can rename but doesn't have to, so a topic can be created and logged in two
  taps. Customization (level count, labels, color) is hidden behind a tap, never
  on the path to first log.
- **Scale granularity differs per topic** (a 5-level intensity topic alongside a
  binary yes/no topic). Granularity is **fixed at topic creation** — see the
  domain-setting note in §5. Color is freely changeable (display only).

**Daily values.** Each day, the user records a rank for some or all topics via a
**quick-log screen**: a single list of all topics with their value selectors
inline, loggable without navigating away. Re-tapping edits (a later value event
wins by timestamp).

- **Missing is missing.** A topic not logged on a day is genuinely absent —
  rendered greyed-out, never colored. **Rank 0 and "missing" must never collapse**
  into the same thing, in storage or on screen: "no issues" (rank 0) and "didn't
  log" are different facts, and the overlay must skip days where either topic is
  absent. The quick-log screen therefore shows no pre-selected value — empty until
  tapped.

**Year-grid view.** Per topic, a grid of months (columns) × days (cells), each
cell colored by that day's rank as an intensity of the topic's color; absent days
greyed out. This is the payoff view — it surfaces seasonal/cyclical patterns.

**Overlay (correlation) — visual, not statistical, for v1.** The user overlays
two or more topics to eyeball whether they move together. Deliberately *not* a
computed correlation coefficient: the data is thin and self-reported, spurious
correlations are easy, and lag effects (bad sleep today → symptom tomorrow) make
naive same-day stats misleading. The human eye spotting "these columns darken
together" delivers most of the value with none of the false precision. Because
scales differ per topic, ranks are **normalized to a 0–1 fraction**
(`rank ÷ max_rank`) for the overlay so different granularities map onto a
comparable intensity. Computed statistics (Spearman, lagged) are a possible
*careful* later addition, or never.

**Notification.** A daily local notification at a user-set time (§5) acts only as
a **prompt** — its single action opens the quick-log screen. It deliberately does
**not** try to log values via notification quick-actions: notification action
slots are limited and don't scale to many topics or to 5-level scales, so the
quick-log screen is the one logging surface. This keeps the notification dumb and
keeps logging logic out of the platform layer.

## 4. Data Model & Core Package

State is an append-only log of events, not mutable rows. The two event
*categories* are distinct: events that define **structure** (topics) and events
that record an **observation** (a day's value).

```
TopicCreated { topic_id, name, color, scale, ts }
TopicEdited  { topic_id, ...changed fields, ts }      # color/labels; not granularity
TopicDeleted { topic_id, ts }

DayValueSet  { topic_id, logging_date, rank, ts }     # keyed by (topic_id, logging_date)
DayValueClear{ topic_id, logging_date, ts }           # return a cell to "missing"
```

Current state shown in the UI is a **fold** (left-reduce) over the log.
`DayValueSet` is keyed by `(topic_id, logging_date)`; editing a day is just a
later event for the same key, resolved by latest `ts`.

**`logging_date` is computed-and-stored at log time, never re-derived.** The
"logging day" boundary (§5) is a domain function `loggingDateFor(ts, boundary)`
living in the core; the shell hands it a wall-clock `ts`, the core decides which
date the value belongs to, and that date is **frozen into the event**. Deriving
the date on-the-fly during the fold would mean a later change to the boundary
setting silently rewrites history and shuffles past grid cells. Storing it also
makes timezone travel mostly self-correcting (each value carries the day it was
the day it was logged).

Why event sourcing for a single-device app: history and undo fall out for free,
the domain stays clean, edit-by-append is trivial, and "export" / "future sync"
both become simple (dump the log / merge logs) if ever needed. The append-only
log is also what makes adding sync later a non-rewrite.

The logic lives in **`@journal/core`** — a standalone, platform-agnostic
TypeScript package: event types, the fold, and the domain rules.

> **Invariant:** the core has no UI and no platform dependencies (no React
> import, no `window`, no direct storage access). Storage is a **port** the core
> declares; the React Native shell supplies the **adapter**. This keeps the core
> testable in isolation and keeps a future second shell cheap.

Layout:

```
/core    @journal/core — platform-agnostic TS: events, fold, domain rules
/mobile  React Native shell — UI + local storage adapter
```

## 5. Settings

Settings fall into two categories, and the distinction is load-bearing — it is
the test to apply to every future setting.

- **Display / behavior settings** — freely changeable, retroactive by nature, no
  data consequences. Live in the shell.
  - *Notification time* — when the daily prompt fires. Changing it requires the
    shell to cancel and re-schedule the OS notification (easy to forget; silent
    failure mode). Touches the core not at all.
  - *Topic color and labels* — pure display.

- **Domain settings** — affect what stored data *means*, so changing one needs an
  explicit rule for data already recorded under the old value.
  - *Logging-day boundary* (default 04:00–04:00, adjustable) — determines which
    `logging_date` a value gets. **Freeze semantics:** changing it affects only
    *future* logging; past values keep their stored `logging_date` (§4). This is
    the only domain-affecting setting, and the freeze rule is the price of having
    it. *Topic scale granularity* is domain-ish too, which is exactly why it is
    fixed at creation rather than a mutable setting.

> **Rule for future settings:** if a setting would change the meaning of already
> recorded data, it is a domain setting — stop and define what happens to past
> data before adding it. Keep the domain-setting set as small as possible.

## 6. Device Migration (new phone)

Handled by **platform backup** — iOS device-to-device / iCloud backup, Android
backup. The OS already performs the one-shot transfer; we build nothing.

The only requirement on us: **the local store must live in the
platform-backed-up location.** This is a placement decision to verify against
current OS docs (§8), not engineering.

Tradeoff, recorded honestly: platform backup is opaque and provider-locked. It is
a restore mechanism, not a user-controlled export, so it is weaker than the
original "you own your data" goal. Accepted for v1; a manual export would recover
it later for little code if that goal resurfaces.

## 7. Distribution & Monetization

**One-time paid app**, sold through the App Store / Play Store. The stores gate
the download, handle billing, and act as merchant of record for EU VAT and
refunds — burden we do not carry (relevant given the developer is in Germany).

No free tier, no in-app unlock, no entitlement check: payment is acquisition.
Because there is no server and sync is out of scope, none of the earlier
cross-platform-entitlement complexity applies.

## 8. Local Store (decided)

**Engine: `expo-sqlite`** — the maintained first-party SQLite binding for Expo
SDK 56, New-Architecture compatible (the New Architecture is mandatory and the
default from SDK 55 on, and all `expo-*` packages support it). It backs the core
`EventStore` port from the `mobile` shell; the append-only log is stored as one
JSON row per event and read back in append order via a monotonic sequence column.

**Backup-safe placement (§6 holds):** the database is opened with no `directory`
override, so it lives in expo-sqlite's default — the **application documents
directory**. That directory is included in **iCloud backup / device transfer on
iOS** (`NSDocumentDirectory`; files are excluded only via `isExcludedFromBackup`,
which we do not set) and in **Android Auto Backup** (which covers `getFilesDir()` /
`getDatabasePath()`). So a new phone restores the journal through platform backup
with no extra work. Choosing a cache or shared-container directory would silently
break this, so the default is kept deliberately.

Verified against the versioned SDK 56 docs at build time, not memory:

- expo-sqlite (SDK 56): <https://docs.expo.dev/versions/v56.0.0/sdk/sqlite/>
- New Architecture (mandatory since SDK 55): <https://docs.expo.dev/guides/new-architecture/>
- iOS backup default (Documents backed up unless excluded) and Android Auto Backup
  coverage of `getFilesDir()`/`getDatabasePath()`:
  <https://developer.android.com/identity/data/autobackup>

> Re-verify against current docs if the SDK is upgraded — these touch fast-moving
> platform/library details.

## 9. Door Left Open

The event-sourced log + platform-agnostic core mean that if multi-device or a
second client ever becomes a real requirement, sync is an additive change (a
transport adapter + merge logic), not a rewrite. Until then, it stays cut.
