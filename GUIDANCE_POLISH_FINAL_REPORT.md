# Guidance Polish — Final Report

**Date:** 2026-09-03
**Branch:** `feat/admin-crm-ui-foundation`
**Production deployment executed:** **NO**
**Counselor OS migration executed:** **NO**

---

## Headline finding

The previous deploy looked unchanged because the installer skipped the sensitive
sections. This round exposed a second, larger reason:

> **This repository runs the V1 journey. Production additionally runs V2.**
> `components/guidance/journey-v2/**`, `PackagePaymentV2Step.tsx`, the
> `START`/`SMART`/`SPECIALIZED`/`PREMIUM` package catalog, the real discount
> server logic, and `app/entekhab/page.tsx` **do not exist in this repo at all.**

Three of the ten issues (6, 9, and the V2 half of 8) therefore cannot be completed
from this repository. They are marked **BLOCKED** with exact production patches
rather than being falsely reported as done.

---

## Issue table

| # | Issue | Active production path | Active component | Change | Verification | Status |
|---|-------|------------------------|------------------|--------|--------------|--------|
| 1 | Final transcript / file upload | `/portal/.../guidance/steps/1`, `/steps/5`, `/guidance/grades`, `/ms/transcript` | `GuidanceFileUploadField.tsx`, `GradesUploadForm.tsx` | Added «فایلی انتخاب نشده است» / «فایل انتخاب‌شده: …»; added `gp-upload-field__input` to the grades input so hiding no longer depends solely on `styles/chamber.css` | Traced route → page → component. Native input hidden by both `.chamber-deed input` and `.gp-upload-field__input` | **DONE** |
| 2 | Yellow guidance dashboard | `/portal/student/services/guidance` | `GuidanceStudentDashboardPanels.tsx` (confirmed default view) | CSS only: equal-height cards, checks rendered as a card grid, hero top row alignment, 420px account-row handling | `page.tsx` line ~130 renders this component for the default view; `GuidancePlatformDashboard` confirmed **dead code** (zero imports) | **DONE** |
| 3 | معرفی دانشگاه‌ها | `/portal/student/services/guidance?view=universities` | `GuidanceUniversitiesHub.tsx` + new `GuidanceUniversitiesBrowser.tsx` | Replaced the 6-item teaser with a searchable, tabbed index over **all** 8 `DISCOVER_SYSTEMS` + institution/admission `DISCOVER_PROGRAMS`; real counts, empty state, no invented universities | `page.tsx` `view === "universities"` branch renders the hub; dashboard card points at that URL | **DONE** |
| 4 | Major + university discovery polish | `/discover/majors` | `MajorEncyclopediaExplorer.tsx` | CSS only: 44px search/filter targets, single-column grid ≤560px, CTA touch target. **Dataset untouched** | Explorer already had search/filters/empty state; only presentation changed. `DISCOVER_MAJORS` not modified | **DONE** |
| 5 | Public «سامانه جامع انتخاب رشته» entry | public nav, `/discover` conversion, `/guidance` | `content/public-nav.ts`, `DiscoverConversion.tsx`, `GuidanceEntryAuth.tsx` | **No change needed** — all already resolve to `GUIDANCE_PORTAL_LOGIN` = `/portal/login?next=%2Fportal%2Fstudent%2Fservices%2Fguidance` | Audited every `/ms`, `/portal/login`, `journey/steps/1` occurrence. No stale guidance entry link found; `/ms` root already redirects to the yellow dashboard | **DONE (verified, no edit)** |
| 6 | START free-plan benefit «چیدمان اولیه انتخاب‌ها» | production V2 package catalog | *(not in this repo)* | None | This repo has only `ESSENTIAL`/`PREMIUM` in `lib/guidance/journey/packages.ts`; no `START` code and no such string in runtime source. Adding one here would invent a plan | **BLOCKED** → `deploy/production-package-start-benefit.patch.md` |
| 7 | «آشنایی با انواع دوره‌ها» → `/discover/programs` | `/portal/.../steps/6`, universities hub | `EducationPreferencesStep.tsx`, `GuidanceUniversitiesHub.tsx` | Step 6 already correct (verified); added the same labelled link to the universities hub footer | Only runtime occurrence of the string was step 6, already `/discover/programs`; build confirms the route exists | **DONE** |
| 8 | Journey bottom-button consistency | `/portal/.../guidance/steps/[step]` | `GuidanceStepActions.tsx`, `InterestAssessmentStep.tsx`, `FinalApprovalStep.tsx` | Shared 44px min-height / radius / inline-flex for `__continue`, `__draft`, `__back`; new `.gpj-actions--inline` and `.gpj-actions__group`; mobile full-width stacking with primary first; step 2 «بخش قبلی» moved from `__draft` to `__back`; removed inline `position:static` hacks | V1 steps only. No handler, server action, validation, or progression touched | **PARTIAL** — V1 done; V2 needs `deploy/production-journey-v2-nav.patch.md` |
| 9 | Discount code UI | production V2 payment step | *(not in this repo)* | None | Active local payment step `RegistrationPaymentStep.tsx` has **no** discount field and `startGuidanceCheckoutAction` takes no discount param. `GuidanceDiscountCodeField.tsx` is dead code with fake client-side validation — deliberately left unrendered | **BLOCKED** → `deploy/production-discount-ui-merge.md` |
| 10 | Visible logout | `/portal/student/services/guidance` | `OfficeAccountMenu.tsx` | Already rendered in the dashboard hero via `POST /portal/logout` with `next=/guidance`. Added weight/nowrap and a full-width account row ≤420px | Confirmed present in `GuidanceStudentDashboardPanels` hero; no new auth logic | **DONE** |

**Score: 7 DONE · 1 PARTIAL · 2 BLOCKED** (all 3 non-DONE are production-V2-only).

---

## COUNSELOR_OS_PRESERVE_COMMITS

Intact, unmodified, **not deployed**:

```
76ee734  feat(counselor): add counselor domain foundation
8c8a3cb  feat(student): add counseling appointment booking on guidance dashboard
76f6095  feat(counselor): add counselor OS dashboard, cases, and sessions UI
ce8b1ab  feat(counselor): complete counselor OS pages and student booking UI
212f5dc  docs(counselor): update morning handoff report with commit refs
```

## GUIDANCE_POLISH_COMMITS

Committed **after** the Counselor OS commits, with a distinct prefix:

```
f040eca  fix(guidance-polish): persian upload copy, universities index, journey button consistency
da2a882  chore(guidance-polish): add isolated guidance deployment package and final report
```

---

## Files changed

| File | Type |
|------|------|
| `components/guidance/platform/GuidanceUniversitiesBrowser.tsx` | new (client) |
| `components/guidance/platform/GuidanceUniversitiesHub.tsx` | rewritten (server) |
| `components/guidance/GradesUploadForm.tsx` | copy + defensive class |
| `components/guidance/shared/GuidanceFileUploadField.tsx` | copy |
| `components/guidance/steps/step2/InterestAssessmentStep.tsx` | class names only |
| `components/guidance/steps/step12/FinalApprovalStep.tsx` | class names only |
| `app/globals.css` | 5 scoped additive blocks |
| `deploy/guidance-polish-final/**` | new package |
| `GUIDANCE_POLISH_FINAL_REPORT.md` | this file |

### Safe for whole-file production transfer

The six `components/guidance/**` files above — no Counselor OS code (enforced by a
grep guard in the applier script).

### Requiring production surgical merge

- `app/globals.css` — append only the five Guidance blocks; **exclude** `cos-*` and
  `guidance-counseling-*`.

### Counselor OS collision files — DO NOT transfer this round

- `app/portal/student/services/guidance/page.tsx` (has `view=appointments` + counseling card)
- `components/guidance/office/GuidanceStudentDashboardPanels.tsx` (has `counselingCard` prop)
- `middleware.ts` (has `isCounselorHost`)
- `prisma/schema.prisma`, `prisma/migrations/20260903120000_counselor_os_foundation/**`

None of these carry a Guidance Polish change this round, so excluding them costs nothing.

### Payment-sensitive files inspected, logic untouched

`lib/guidance/journey/packages.ts`, `lib/guidance/journey/payment.ts`,
`components/guidance/steps/step3/RegistrationPaymentStep.tsx`,
`components/guidance/steps/step3/GuidanceDiscountCodeField.tsx`.

### Journey-sensitive files changed — presentation only

`InterestAssessmentStep.tsx`, `FinalApprovalStep.tsx` — CSS class names and removal of
inline positioning hacks. No `currentStep`, `completedSteps`, `journeyVersion`, server
action, validation, or redirect changed.

---

## Validation

- **TypeScript** (`NODE_OPTIONS=--max-old-space-size=4096 npx tsc --noEmit`): **PASS**
- **Build** (`npx next build --webpack`): **PASS** — compiled in 3.8 min, exit 0

### Route audit

| Route | Result |
|-------|--------|
| `/discover/majors` | present |
| `/discover/majors/[slug]` | present |
| `/discover/programs` | present |
| `/discover/programs/[slug]` | present |
| `/portal/login` | present |
| `/portal/logout` | present |
| `/portal/student/services/guidance` | present |
| `/portal/student/services/guidance/steps` | present |
| `/portal/student/services/guidance/steps/[step]` | present |
| `/entekhab` | **absent — pre-existing**, not a regression (`app/entekhab/page.tsx` has never existed here; `entekhab` is a production host, not a local route) |
| `/portal/.../guidance/journey/steps/[step]` | **absent — pre-existing**, V2-only route that does not exist in this repo |

No route regression.

---

## Known limitations / observations

1. **V2 blind spot.** Issues 6, 9 and half of 8 can only be verified on the production
   tree. The patch docs are precise but unverified against real V2 source.
2. **Dead code still present:** `GuidancePlatformDashboard.tsx`, `GuidanceCaseScreen.tsx`,
   `GuidancePlatformPlaceholder.tsx` (zero imports), and `GuidanceDiscountCodeField.tsx`
   (fake client validation, unrendered). Left in place deliberately — documented, not deleted.
3. **Out-of-scope bug found, not fixed:** `?view=interest`, `?view=profile`, `?view=case`,
   `?view=journey` and other `GUIDANCE_PLATFORM_NAV_SECTIONS` links silently fall through
   to the dashboard because `page.tsx` only handles `majors`, `universities`, and
   `appointments`. Worth a follow-up ticket.
4. **No live browser verification.** Active render paths were verified by tracing imports
   from each route and by a successful production build, not by loading the pages.

## Recommended next step

Deploy this package to production, then run the three V2 patches by hand on the
production tree and re-verify issues 6, 8 and 9 there.
