# Guidance Polish Final — production safety

## Counselor OS must NOT be deployed by this package

The branch `feat/admin-crm-ui-foundation` contains Counselor OS commits that are
**not approved for production**. Do **not** copy the whole branch or tree.

Counselor OS commits to preserve but **not deploy**:

```
76ee734  feat(counselor): add counselor domain foundation
8c8a3cb  feat(student): add counseling appointment booking on guidance dashboard
76f6095  feat(counselor): add counselor OS dashboard, cases, and sessions UI
ce8b1ab  feat(counselor): complete counselor OS pages and student booking UI
212f5dc  docs(counselor): update morning handoff report with commit refs
```

Do **not** transfer any of these to production during this deployment:

- `lib/counselor-os/**`
- `app/admin/counselor/**`
- `components/counselor-os/**`
- `prisma/migrations/20260903120000_counselor_os_foundation/**`
- the `CounselorAppointment` / `CounselingSessionRecord` / etc. blocks in `prisma/schema.prisma`

## Counselor OS collision files — SURGICAL MERGE REQUIRED

These files contain **both** Guidance Polish work and Counselor OS work in this branch.
Copying them wholesale to production **would activate Counselor OS**.

| File | Counselor OS content to EXCLUDE | Guidance content to INCLUDE |
|------|----------------------------------|------------------------------|
| `app/portal/student/services/guidance/page.tsx` | `view === "appointments"` branch, `StudentCounselingPanel` import, `counselingCard` promise | nothing new in this round — do not transfer |
| `components/guidance/office/GuidanceStudentDashboardPanels.tsx` | `counselingCard` prop + render slot | nothing new in this round — do not transfer |
| `middleware.ts` | `isCounselorHost` block | nothing new in this round — do not transfer |
| `app/globals.css` | `cos-*` and `guidance-counseling-*` blocks | `.gpj-actions*`, `.guidance-uni-*`, `.guidance-command-checks`, `.gp-upload-field__state`, `.chamber-deed__state`, `.major-encyclopedia-*` blocks |

**Only `app/globals.css` needs merging in this deployment**, and only the Guidance
blocks listed above. The other three collision files have no Guidance change this round.

## Files safe to transfer whole

These contain **no** Counselor OS code:

- `components/guidance/platform/GuidanceUniversitiesBrowser.tsx` (new)
- `components/guidance/platform/GuidanceUniversitiesHub.tsx`
- `components/guidance/GradesUploadForm.tsx`
- `components/guidance/shared/GuidanceFileUploadField.tsx`
- `components/guidance/steps/step2/InterestAssessmentStep.tsx`
- `components/guidance/steps/step12/FinalApprovalStep.tsx`

Verify each against production first — production may have diverged.

## Payment-sensitive files inspected, NOT altered

- `lib/guidance/journey/packages.ts` — read only; prices/codes untouched
- `lib/guidance/journey/payment.ts` — read only
- `components/guidance/steps/step3/RegistrationPaymentStep.tsx` — untouched
- `components/guidance/steps/step3/GuidanceDiscountCodeField.tsx` — untouched (still not rendered)

## Journey-sensitive files changed — PRESENTATION ONLY

- `components/guidance/steps/step2/InterestAssessmentStep.tsx` — CSS class names on
  existing buttons; no handler, validation, or route change
- `components/guidance/steps/step12/FinalApprovalStep.tsx` — replaced inline
  `style={{position:"static"}}` with `.gpj-actions--inline`; no logic change

No file touches `currentStep`, `completedSteps`, `journeyVersion`, or step advancement.
