# 05 — Risks, flags, performance, mobile, a11y, tests, rollout, commits

[Index](./README.md) · Previous: [Contracts](./04-events-projections-contracts.md)

---

## 1. Risks

| Risk | Mitigation |
|------|------------|
| Collapsing Super App into one S2 PR | Frozen [12](../12-roadmap-migration-risks.md) stands. This pack maps screens; S2 code slice is card + files + shell. |
| Hub SQL into booking/commerce | Forbidden. Reviewers reject any `prisma.bookingReservation` in `lib/sxp/hub`. |
| Replacing academic خانه | Dual-run. No `sxp.hubAsDefault` in S2. |
| 20-item `PortalNav` overflow | Bottom bar + «بیشتر»; long IA stays in [05](../05-profile-hub.md) for later. |
| NextAuth / second User | Forbidden. |
| Engine marks shared outbox PROCESSED | Forbidden. Inbox per handler. |
| FILE_READY enum with no writer | Idle indexer + empty vault, or ship writer in the same PR. |
| Guardian sees certificate PDFs | Index visibility + relation flags. |
| QR is a national ID | Opaque `SXP_CARD` token only. |
| Parent timeline ≠ child life | Documented S1 limitation; S3 fan-out. Card **does** list authorized children. |
| Book ERP / commerce not on master | Empty order widgets until S5–S6. |
| Message threads | Q9: notifications only until a later pack. |
| AI auto-execute | S12 recommend-only. |
| Worker ignores org `sxp` flag | Keep. Hub 404s. Optional later: skip inbox for flag-off orgs — not required for S2. |
| Tab bar vs existing horizontal nav | Desktop keeps chips; mobile bar additive. Visual QA both. |

---

## 2. Feature flag strategy

```text
STAROS_SXP_HARD_OFF=true     → everything off
OrganizationFeatureFlag sxp  → Hub chrome (S1)
sxp.files                    → Files tab + download routes
sxp.wallet / loyalty / …     → unchanged, later
sxp.hubAsDefault             → forbidden in S2
```

Rollback: flags off. Tables remain. Academic portal untouched.

Operator: existing `sxp:set-flag`. Add `sxp.files` the same way (same table, different key).

---

## 3. Migration strategy

1. Merge S2 **docs** only (this PR). Wait for approval.
2. Implementation base: **`origin/master` + S1** (PR #8 must be merged or the branch based on it).
3. Additive migration: card + file tables; optional `ExperienceProfile.coverMediaId`.
4. Register handlers in `sxp:experience-engine-once`.
5. Backfill card snapshots for existing portal links (batch script, once).
6. Do not move cookies. Do not change `/book` login (Q3 still off).
7. Dual-run academic routes.

---

## 4. Performance strategy

- Hub Home: **one** profile ensure, **one** widget snapshot query, **one** feed query, **one** card snapshot, **one** files count. No N+1 per widget.
- Timeline: keyset `(occurredAt DESC, id DESC)`, page 30–50. Day grouping in memory per page.
- Search: bounded `take`, org+user index. No `pg_trgm` required for S2; add later if needed.
- WidgetSnapshotter: keep S1 cap (e.g. 200 timeline rows) for snapshot rebuild.
- Files download: constant-time index lookup, then stream; no directory listing.
- No Hub join to booking/commerce.

---

## 5. Mobile strategy

- Mobile-first Hub shell; thumb-reach bottom bar.
- Target: feel like Telegram (instant tabs, no full reload chrome). App Router server pages + small client tabs are enough; **no React Native in S2**.
- Safe-area padding; 44px min hit targets.
- Horizontal `PortalNav` can hide below `sm` when the tab bar is on to avoid double nav.

---

## 6. Accessibility checklist

- `lang="fa"` `dir="rtl"` inherited.
- Tab bar: `nav` + `aria-label` + `aria-current="page"`.
- Contrast: existing primary/muted; do not put gold text on gold cover without overlay.
- QR: adjacent text alternative (name + org).
- Skeletons: `aria-busy` on main.
- Filters: native buttons, not icon-only without labels.
- Focus rings on OTP-unrelated Hub controls.
- Reduced motion: honor `prefers-reduced-motion`.

---

## 7. Testing strategy

| Layer | S2 |
|-------|----|
| Unit (no DB) | Catalog, skip reasons, card completion ratio, file visibility vs guardian flags, flag matrix, timeline day grouping, search/filter pure helpers |
| Existing | Keep `test:sxp`, `test:portal-auth` green |
| Integration (when DB) | Worker: FILE_READY → file row idempotent; card refresh; Hub 404 when `sxp` off |
| HTTP | Unauthenticated new routes → same login redirect as S1 |
| Browser | Flag off: production nav identical. Flag on: hero + card + empty files; academic خانه still works |
| Forbidden test | Any test that teaches Hub to `findMany` booking |

---

## 8. Rollout plan

1. Merge S1 to production if not already; `sxp` off.
2. Approve this architecture.
3. Implement S2 on a branch from master+S1; flag off.
4. Staging org: `sxp=true`, `sxp.files=true`.
5. Production migrate; flags still off.
6. Enable `sxp` per org; files when a `FILE_READY` publisher exists.
7. Do not enable `sxp.hubAsDefault`.
8. S3+ only after S2 approval of **that** phase.

---

## 9. Future git commits (implementation — **not this PR**)

When S2 code is approved, suggested production-quality commits:

1. `feat(sxp): add student card and file index tables`
2. `feat(sxp): add StudentCardRefresher and DownloadIndexer`
3. `feat(sxp): add hub card and files loaders`
4. `feat(sxp): add premium hub hero and mobile tab bar`
5. `feat(sxp): group and search timeline projections`
6. `test(sxp): card visibility, files flags, hub 404 when sxp off`

Each commit: build + `tsc` + `test:sxp` + `test:portal-auth`.

**This documentation PR** is a single docs commit. No application code.

---

## 10. Approval gate (repeat)

> Approved to implement SXP Phase S2 (Downloads + Digital Student Card + Hub shell v2) from `docs/architecture/student-experience-platform/s2-profile-v2/` on `master`, extending S1 without redesigning it.

Until then: **no Prisma, no pages, no handlers.**
