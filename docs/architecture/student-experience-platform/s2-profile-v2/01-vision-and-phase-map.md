# 01 — Vision and phase map

[Index](./README.md) · Previous: [Findings](./00-inspection-findings.md) · Next: [Wireframes](./02-ux-wireframes.md)

---

## 1. Product vision (unchanged heart)

Student (or parent) logs in **once** with existing portal OTP. They land in **My Profile** — the center of StarOS. Every service is reachable from one Hub. Staff keep `/admin`.

The Hub is a **premium personal Super App**, Persian RTL, mobile-first (Telegram speed, Apple density). It is **not** a Bootstrap card dump and **not** a second CRM.

---

## 2. Auto-appear contract (mandatory)

A future module appears in the Hub **if and only if**:

1. It appends `DomainEventOutbox` (or a documented synthetic source like SENT SMS) with `organizationId` + resolvable identity.
2. Experience Engine has a catalog entry + handler(s).
3. A Hub surface reads the resulting projection / widget snapshot.

```text
Module write  ──► DomainEventOutbox
                      │
                      ▼
              sxp:experience-engine-once
              (private ExperienceEngineInbox)
                      │
                      ▼
         Timeline / Widgets / Card / Files / …
                      │
                      ▼
              Hub UI  (projections only)
```

**Forbidden forever in Hub HTTP:** `bookingReservation.findMany`, commerce/order/wallet ledger SQL, CRM lead lists, live inventory.

**Allowed:** Identity already in `PortalContext` (name, org, authorized students, portrait URL). Worker-only resolution of mobile → `User` (S1 pattern).

If a module has no publisher yet, the Hub shows a **calm empty state** (`publisher_missing` / `phase_locked`), never a live ERP query.

---

## 3. Dual-run (do not replace academic خانه)

| Surface | URL | Source | S2 action |
|---------|-----|--------|-----------|
| Academic home | `/portal/student`, `/portal/parent` | Live school ERP | **Keep.** Learning later *also* projects into Hub. |
| Experience Hub | `/portal/student/experience` (and parent) | Engine | Premium shell + card + files |
| Existing profile / assessments / achievements | current routes | School ERP + CMS | Keep; Hub links to them until Learning phase |

`/portal` default redirect stays academic until a later flag `sxp.hubAsDefault` (not S2). Replacing **خانه** in S2 would hide grades and multi-child parent overview.

---

## 4. Frozen roadmap — do not collapse

Parent [12](../12-roadmap-migration-risks.md) stays the sequence. Super App **screens** map onto phases. **S2 is not “build everything.”**

| Requested Super App surface | Engine surface | First phase that may fill it | Publisher must exist |
|-----------------------------|----------------|------------------------------|----------------------|
| Hero: avatar, name, school, branch, grade, year | Identity + `ExperienceProfile` + StudentCard | **S2** (card + profile fields) | `User`, `Student`, `PortalContext` |
| Cover, membership chip, profile completion | `ExperienceProfile` + card snapshot | **S2** | MediaAsset (cover) |
| QR + Digital Student Card | StudentCardRefresher | **S2** | Identity; QR token `SXP_CARD` |
| Dashboard: upcoming booking | Widget `UPCOMING_RESERVATION` | **S1** (from timeline), refine **S3** HubReservation | `BOOKING_*` |
| Dashboard: current orders, ready pickup | Widgets | **S5/S6** | Booklet/book events |
| Waiting payments, wallet balance | Wallet views | **S4/S7** | Treasury / wallet ledger (not on master) |
| Unread messages / notifications inbox | Notifications | **S9** (v1 = notifications, Q9) | Engine NotificationFanout |
| Downloads | DownloadIndexer | **S2** | `FILE_READY` (new additive type when a module can emit it) |
| Assignments, upcoming exams, performance | Learning projections | After school ERP publishes `ASSESSMENT_*` / `HOMEWORK_*` (not before S1 catalog) | School ERP events — **new types, later phase** |
| Coupons, referral, teacher/consultant rewards | Marketing + wallet views | **S4** + Book ERP partner | Ledgers not on master |
| Timeline (all event kinds) | TimelineAppender | **S1** for booking/form/SMS; other kinds when catalog grows | Each module |
| Timeline UX: day groups, keyset, filters, search | Hub on `ExperienceTimelineEvent` | **S2 shell** (query Engine only) | — |
| Unified orders (books, booklets, courses, consults, reservations) | HubOrder / HubReservation snapshots | **S3** reservations; **S5–S6** commerce; courses when `CLASS_*` exists | — |
| Booking reschedule / directions / calendar | Deep-link to owning module | **S3** | Booking service actions; Hub does not UPDATE reservations |
| Loyalty Bronze–Diamond | LoyaltyAccountView | **S4** | Loyalty ledger (treasury) |
| Achievements / badges / certificates | AchievementProjector + CMS projection + files | CMS tab exists on academic pages; Engine **S4/S2 files** | Do not overload CMS `Achievement` |
| Files vault | ExperienceFile index | **S2** | `FILE_READY` |
| Messages (teacher/consultant/school threads) | **Out of v1** (Q9) | After S9 | Do not invent a messenger in S2 |
| Referral center | Referral tools | **S4** | `sxp.referral` flag |
| Settings (photo, OTP, sessions, theme) | Identity + ExperienceProfile prefs | Photo: reuse MediaAsset **S2**; sessions: existing logout; theme/language: later prefs row | Do not replace OTP |
| Universal search | Search Engine index of projections | **S10+** (or a thin S2 search of timeline+files only) | Never search booking SQL |
| AI assistant | Read-only recommendations | **S12** | Never execute |

---

## 5. S2 implementation slice (approval-gated)

When S2 is approved, ship **only**:

1. **Digital Student Card** — presentation snapshot + QR (`SXP_CARD`). Parent sees authorized children’s cards. Not a government ID. Not a new `Student` row.
2. **Downloads index** — `ExperienceFile` (or equivalent Engine table) filled by `DownloadIndexer` on `FILE_READY`. Enforce guardian `canViewCertificates` / academic flags. Bytes stay on `STAROS_MEDIA_ROOT`.
3. **Hub shell v2** — premium hero (avatar, optional cover, identity chips from `PortalContext` + card snapshot), dashboard **slots** with S1 widgets + honest empty states for locked phases, timeline page: group by Tehran day, keyset pagination, filter by `eventType` / search `title+summary` **on timeline projection**.
4. **Mobile nav** — see [03](./03-navigation-and-components.md). Do not add 20 `PortalNav` tabs.
5. **Additive Engine handlers (no-ops until events exist):** `StudentCardRefresher`, `DownloadIndexer`. Do not activate wallet/loyalty/notification handlers.

**Explicitly out of S2 code:** wallet/loyalty ledgers, commerce, messages, AI execute, replacing خانه, booking table reads, NextAuth, Book ERP.

---

## 6. Sub-flags (still default off)

| Key | S2 |
|-----|-----|
| `sxp` | Master. Still required for Hub chrome. |
| `sxp.files` | Downloads vault UI |
| `sxp.card` | Optional; may ride on `sxp` if we want fewer keys — **default: ship card with `sxp`, vault with `sxp.files`** |
| `sxp.hubAsDefault` | **Not S2.** Do not change `/portal` redirect. |
| `sxp.wallet` / `loyalty` / `referral` / `partnerPortals` | Unchanged, later phases |
| `STAROS_SXP_HARD_OFF` | Unchanged emergency |

---

## 7. Learning / exams without lying

Academic assessments **already** have portal pages. S2 Hub may **link** to `/portal/student/assessments` as a Learning shortcut. Projecting exam events into Timeline requires new `DomainEventType` values published by school ERP — that is **not** S2 unless staff also ships those publishers. Empty “Upcoming exams” card is honest until then.
