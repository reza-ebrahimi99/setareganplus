# Professional Counselor Workspace — Phase 1

Operational desk for Engineer Ebrahimi. **Read-only.** No rewrite of Journey Engine, Counselor Review Center, Booking, Payment, CRM, or Portal OS.

## Why this phase exists

Phase 8 Counselor Review Center covers pre-journey intake (transcript, interest, 360 profile, internal notes). It does **not** surface the 12-step Journey Engine payload. This phase adds that operational view without replacing the review desk.

## Routes (existing URLs, enhanced)

- `/admin/guidance` — workspace queue (journey progress + review filters)
- `/admin/guidance/[publicId]` — dossier + 12-step rail + existing review panels
- `/admin/guidance/[publicId]/steps/[step]` — **new** read-only step inspector
- Existing: notes, transcript verify, `/choices` Entekhabium editor — unchanged

## Phase 1 capabilities

- Open any org-scoped `GuidancePlan`
- See current step, completion %, package, payment, choices approval
- Inspect every completed (and active) step payload
- Download versioned PDFs (`FINAL_GRADES`, `EXAM_RESULT`)
- Read `AuditLog` timeline for `GuidancePlan`
- Keep internal notes (existing MediaAsset case record — not student-visible)

## Explicitly out of Phase 1

- Edit student-entered fields
- Approve / reject each journey step
- Side-by-side PDF vs entered-value comparison UI
- Premium PDF reports
- Excel exports of the workspace
- New Prisma tables

Those remain later phases. Existing Step 10 choices import/edit/approve stays as-is.

## Storage reused (no schema change)

| Need | Existing object |
| --- | --- |
| Case + progress | `GuidancePlan` |
| PDFs | `GuidanceDocument` + `MediaAsset` |
| Step payloads | MediaAsset JSON via `lib/guidance/journey/step-store` |
| Notes / review status | MediaAsset `guidance-counselor-case` |
| Change timeline | `AuditLog` (`entityType = GuidancePlan`) |
| Sessions | `BookingReservation` (live-checked) |
| Payment | `GuidancePlan.packagePaidAt` + payment primitives |
| 150 choices | Step 10 store + `choicesApprovedAt` |

## Permissions

Unchanged: `guidance.view` (open) · `guidance.review` (notes / transcript / choices).
