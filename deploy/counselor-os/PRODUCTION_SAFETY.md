# Counselor OS — Production Safety

## DO NOT overwrite without review

| Area | Reason |
|------|--------|
| `components/guidance/journey-v2/**` | Production Journey V2 |
| `lib/guidance/journey-v2/**` | Journey resolver |
| Payment / Step5 / package fields | Business-critical |
| `guidancePackageCode`, `packagePaidAt`, `currentStep`, `completedSteps` | Canonical journey state |

## Surgical merge likely required

| File | Notes |
|------|-------|
| `app/globals.css` | Append `cos-*` block + counseling styles; do not replace entire file |
| `app/portal/student/services/guidance/page.tsx` | Preserve yellow dashboard flow; merge `view=appointments` + counseling card |
| `components/guidance/office/GuidanceStudentDashboardPanels.tsx` | Add `counselingCard` prop only |
| `middleware.ts` | Add moshaver host block at top of middleware function |

## Safe transfer

- All `lib/counselor-os/**`
- All `app/admin/counselor/**`
- All `components/counselor-os/**`
- New migration SQL (additive tables only)
- `app/portal/student/services/guidance/counseling-actions.ts` (new)

## SMS

No automatic SMS wired for counselor bookings in this release. Existing booking confirmation SMS may fire via `createReservation` if configured — verify `SMS` env guards before deploy.

## Authorization model

- Counselor routes: `requireCounselorContext()` → `guidance.view`
- Student access: `assertCounselorCanAccessStudent()` on every case load
- Student booking: `requireStudentPortalAccess()` server action (no client-trusted IDs)
