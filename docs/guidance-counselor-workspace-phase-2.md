# Professional Counselor Workspace — Phase 2

Operational review/edit/approve desk on the **existing** Phase 1 routes. Journey Engine complete/advance functions are not rewritten.

## Routes (unchanged + export)

- `/admin/guidance`
- `/admin/guidance/[publicId]`
- `/admin/guidance/[publicId]/steps/[step]` — now review + edit (`?edit=1`)
- `/admin/guidance/[publicId]/export/summary|journey|notes` — print-ready PDF
- `/admin/guidance/[publicId]/export.xlsx`

## Storage (additive)

- `GuidanceStepReview` / `GuidanceStepReviewEvent`
- `AuditLog` actions: `GUIDANCE_STEP_REVIEWED`, `GUIDANCE_STEP_REWOUND`, `GUIDANCE_FIELD_EDITED`, `GUIDANCE_NOTE_ADDED`

## Gating

Reject / request revision rewinds `GuidancePlan.currentStep`, shrinks `completedSteps`, and recalculates percentage. Student step lock then applies as before.
