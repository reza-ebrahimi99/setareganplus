# 03 — Navigation, component tree, folders

[Index](./README.md) · Previous: [Wireframes](./02-ux-wireframes.md) · Next: [Contracts](./04-events-projections-contracts.md)

---

## 1. Navigation map

### 1.1 Dual-run (S2)

Keep `PortalShell` academic tabs. Add Hub **primary destinations** only:

| Persian | Student href | Parent href | Gate |
|---------|--------------|-------------|------|
| تجربه | `/portal/student/experience` | `/portal/parent/experience` | `sxp` |
| روند | `/portal/student/timeline` | `/portal/parent/timeline` | `sxp` |
| کارت | `/portal/student/card` | `/portal/parent/card` | `sxp` |
| فایل‌ها | `/portal/student/files` | `/portal/parent/files` | `sxp` + `sxp.files` |

Academic خانه / پروفایل / آزمون‌ها / افتخارات **stay**. «بیشتر» opens those plus Settings later.

Do **not** put سفارش‌ها، کیف پول، پیام‌ها، معرفی into the tab bar until their phase + flag.

### 1.2 Mobile bottom bar (additive)

When `sxp` on and viewport `< sm`:

`تجربه · روند · فایل‌ها · کارت · بیشتر`

`بیشتر` = sheet linking academic routes + profile. File tab hidden if `sxp.files` off (4-item bar).

Implementation: new client `SxpMobileTabBar` rendered from student/parent layouts **in addition to** existing `PortalNav`, or replace `PortalNav` **only below `sm`** when sxp on. Desktop keeps horizontal chips. No middleware change.

### 1.3 Future IA (S4+)

Frozen [05](../05-profile-hub.md) list remains the long-term sitemap. Access via «بیشتر» or Hub Home modules — **not** twenty always-visible tabs.

---

## 2. Component tree (S2)

```text
PortalShell                          (existing; extraNavItems)
  PortalNav                          (existing desktop chips)
  SxpMobileTabBar                    (NEW, sxp on, sm breakpoint)
  page
    ExperienceHero                   (NEW — cover, avatar, chips, completion)
      ExperienceStudentCardStrip     (NEW — open full card)
    ExperienceQuickActions           (S1 home already has links; extract)
    ExperienceWidgetGrid             (extract from ExperienceHomeView)
      WidgetSnapshotCard             (S1 keys + FILES_COUNT empty)
    ExperienceFeedList               (extract)
    ExperienceTimelineView           (extend: DayGroup, search, filters)
    ExperienceFilesList              (NEW)
    ExperienceCardPage               (NEW)
    ExperienceProfileStrip           (S1, keep)
    PortalEmptyState                 (reuse)
```

**Do not** fork `PortalEmptyState`. **Do not** restyle academic assessment cards in this phase.

---

## 3. Folder structure (additive)

```text
lib/sxp/
  flags.ts, nav.ts, profile.ts, constants.ts     # S1 — keep
  engine/
    processor.ts, inbox.ts, catalog.ts           # S1 — extend catalog only
    handlers/
      timeline-appender.ts                       # S1
      feed-curator.ts                            # S1
      widget-snapshotter.ts                      # S1 — extra keys later
      student-card-refresher.ts                  # S2 NEW
      download-indexer.ts                        # S2 NEW
  hub/
    load-home.ts, load-timeline.ts, load-profile.ts  # S1 — extend DTOs
    load-card.ts, load-files.ts                  # S2 NEW
    require.ts                                   # S1
components/sxp/                                  # S1 + new hero/card/files
app/portal/student/card/page.tsx                 # S2 NEW
app/portal/student/files/page.tsx                # S2 NEW
app/portal/parent/card/page.tsx
app/portal/parent/files/page.tsx
scripts/sxp-experience-engine-once.ts            # S1 worker; register new handlers
scripts/sxp-unit-tests.ts                        # extend
```

No `lib/booking` copies. No `app/hub`. No NextAuth routes.

---

## 4. Who owns UI mutations

| Action | Owner |
|--------|--------|
| Edit display name / interests / cover | Engine `ExperienceProfile` (self) |
| Portrait bytes | Existing MediaAsset pipeline |
| Cancel/reschedule booking | Booking Server Action; Hub **deep-links** |
| Download file | Route handler checks Engine index + guardian flags; streams from media root |
| OTP / sessions | Existing portal auth |
| Apply coupon / pay | Treasury/commerce — **not S2** |
