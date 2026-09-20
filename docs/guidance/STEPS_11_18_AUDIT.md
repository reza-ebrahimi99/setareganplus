# Guidance Journey V2 — Steps 11–18 Architecture Audit

**Baseline:** `2f5e0cf` · Counselor OS + Schedule V2 operational  
**Scope:** Production paths under `/var/www/setareganplus` (not `deploy/*` bundles)

## Step catalog

| Step | Title | Primary actor | Entry gate | Completion output |
|------|--------|---------------|------------|-------------------|
| 11 | First session booking | Student | Step 10 paid + assigned counselor | Live booking + session held + notes |
| 12 | Konkur results | Student → Counselor verify | Step 11 complete | Counselor-approved konkur snapshot |
| 13 | Initial arrangement studio | Counselor | Step 12 + arrangement entitlement | INITIAL list `READY` |
| 14 | Student review | Student | INITIAL `READY` published | Feedback submitted |
| 15 | Second session | Student | Step 14 review complete | SECOND booking + session held |
| 16 | Final arrangement | Counselor | Step 15 complete | FINAL list locked/confirmed |
| 17 | Informed consent | Student | FINAL ready | `finalApprovedAt` + ack hash |
| 18 | Sanjesh declaration | Student → Counselor verify | Step 17 | `v2SanjeshVerified` + case closed |

**Catalog source:** `lib/guidance/journey-v2/catalog.ts`  
**Timeline copy:** `lib/guidance/journey-v2/late-status.ts`  
**Advance:** `lib/guidance/journey-v2/advance.ts`, `guard.ts`, `step-access-policy.ts`

## Routes & UI

| Area | Path | Key modules |
|------|------|-------------|
| Student steps 11–18 | `/portal/student/services/guidance/journey/steps/[step]` | `render-late-page`, `components/guidance/v2-late/*` |
| Counselor case | `/admin/counselor/students/[studentId]` | `CounselorStudentCase*`, `loadCounselorLateJourney` |
| Choice studio | `/admin/counselor/students/[studentId]/choices` | `lib/guidance/choice-studio/*`, choice actions |
| Calendar / booking | `/admin/counselor/calendar`, appointments | Schedule V2, `lib/counselor-os/booking.ts` |
| Legacy (read-only compat) | `/admin/guidance` | 12-step V1 — not primary dev target |

## Data models (Prisma)

- `GuidancePlan` — `currentStep`, `journeyVersion`, package, sanjesh fields, informed ack
- `GuidanceChoiceList` / `Item` / `Feedback` — INITIAL/FINAL revisions, versioning
- `CounselorAppointment` + `BookingReservation` + `BookingSlot` — sessions (Schedule V2 FKs)
- `CounselorCaseCorrection`, `GuidanceDocument` — konkur / evidence
- Audit via existing `AuditLog` + domain-specific actions in konkur/choices

## Server actions & services

| Concern | Location |
|---------|----------|
| Booking 11/15 | `journey-v2/appointments.ts`, `booking-gate.ts`, portal step actions |
| Konkur 12 | `journey-v2/konkur.ts`, `KonkurResultForm`, counselor corrections |
| Choices 13–16 | `journey-v2/choices.ts`, admin choice actions, choice-studio validate/diff |
| Review 14 | `ChoiceReviewWorkspace.tsx`, feedback submit actions |
| Consent 17 | `InformedConfirmPanel.tsx`, plan final approval fields |
| Sanjesh 18 | `journey-v2/sanjesh.ts`, `SanjeshSubmissionPanel.tsx` |
| Counselor snapshot | `lib/counselor-os/late-journey.ts` |

## Permissions

- `requireCounselorContext`, `assertCounselorCanAccessStudent`, `canReview` / supervisor for org-wide
- Student portal: plan ownership via session + `requireGuidanceV2StepAccess`
- Stage changes must go through guarded actions (not raw step PATCH)

## Gaps identified (this mission)

1. **Next action** — timeline exists (`late-status`) but no unified card with href, blocker, deadline, progress 11–18 for counselor case header.
2. **Work queue** — dashboard uses `currentStep` heuristics only; no buckets, priority score, or URL filters.
3. **Step 11/15 completion** — booking gate strong; counselor “session held + summary” workflow needs explicit UI parity with requirements checklist.
4. **Step 12** — counselor approval states exist in konkur module; diff/audit UI polish.
5. **Studio 13** — choice-studio present; autosave/concurrency/warnings need consolidation (reuse existing validate).
6. **Versioning** — `GuidanceChoiceList.version` + statuses; compare/restore via new revision (partial — strengthen UI).
7. **Management dashboard** — KPIs partial on counselor home; supervisor rollup to extend.
8. **E2E** — `npm run test:guidance-steps-11-18` (unit); full DB e2e via `guidance:journey-e2e-seed` (manual).

## Implemented in this mission (baseline after c9fd0d7)

- Unified `buildLateJourneySignals` + `computeNextActionCard` (counselor case + student late steps).
- Counselor work queue buckets + URL filters on `/admin/counselor`.
- Session step advance requires counselor completion + summary (not booking alone).
- Supervisor KPI strip (`CounselorManagementOverview`).
- Sanjesh reference validation.

## Reused without rewrite

- Choice studio: `/admin/counselor/students/[id]/choices`, `lib/guidance/choice-studio/*`, `lib/guidance/journey-v2/choices.ts` (versions, diff, feedback).
- Konkur step 12: `KonkurResultForm`, `correctKonkurField`, document verification gate in `advance.ts`.
- Informed consent step 17: `InformedConfirmPanel`, plan `finalApprovedAt` / ack version.
- PDF/print: existing export routes under `students/[id]/export/[kind]`.

## Reuse strategy

Extend `LateJourneySignals` + `loadCounselorLateJourney` rather than parallel state machines.  
Schedule V2 untouched except booking consumption.  
No new UI framework; COS design tokens (`cos-*`).
