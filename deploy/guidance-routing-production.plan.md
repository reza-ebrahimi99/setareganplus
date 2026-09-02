# Guidance routing — production deployment plan

Apply to the **dirty production tree** on `entekhab.setareganplus.ir` without `git pull`, `git reset`, `git checkout`, `git clean`, or stash.

Base routing commit on Windows branch: **`6e15cc8`**

---

## 1. Transfer these 10 files (routing foundation)

Copy from `origin/feat/admin-crm-ui-foundation` at `6e15cc8`:

| File | Purpose |
|------|---------|
| `lib/guidance/journey-entry.ts` | **NEW** — V2/Legacy journey CTA href resolver |
| `lib/guidance/portal-nav.ts` | `GUIDANCE_PLATFORM_HOME` → `/portal/student/services/guidance` |
| `lib/guidance/student-entry.ts` | Post-login / portal hub → guidance dashboard |
| `app/ms/page.tsx` | `/ms` root → one-hop redirect to guidance dashboard |
| `app/portal/student/layout.tsx` | Portal shell bypass **only** for onboarding |
| `app/portal/student/services/guidance/layout.tsx` | Remove automatic Chamber shell; keep onboarding guard |
| `app/portal/student/services/guidance/error.tsx` | Error fallback home → guidance dashboard |
| `app/portal/student/services/guidance/onboarding/page.tsx` | Already onboarded → guidance dashboard |
| `app/portal/student/services/guidance/onboarding/actions.ts` | Onboarding complete → guidance dashboard |
| `content/guidance.ts` | Public entry CTA href → guidance dashboard |

Patch file (same diff): `deploy/guidance-routing-foundation.patch`

```bash
# From production app root, after copying files or applying patch:
npx tsc --noEmit
NODE_OPTIONS="--max-old-space-size=4096" npm run build
# Do NOT run prisma migrate
```

---

## 2. DO NOT overwrite on production

| Path | Reason |
|------|--------|
| `app/portal/student/services/guidance/page.tsx` | Production yellow dashboard — **surgical CTA edit only** (§3) |
| `prisma/schema.prisma` | No schema changes |
| `prisma/migrations/**` | No migrations |
| `lib/guidance/journey-v2/**` | Production-only V2 journey engine |
| `components/guidance/journey-v2/**` | Production-only V2 UI |
| `app/portal/student/services/guidance/journey/**` | Production-only 18-step routes |
| Payment routes, callbacks, package state | Out of scope |
| `lib/guidance/journey/**` business logic | Progress / step guards unchanged |
| Database scripts / seed data | Out of scope |

### Merge carefully if production diverged

- `app/portal/student/services/guidance/layout.tsx` — if production added V2-specific chrome, keep production presentation; ensure **onboarding redirect** and **no forced `/ms` entry** remain.
- `app/portal/login/actions.ts` — not in patch; already uses `GUIDANCE_PLATFORM_HOME` via `portal-nav.ts` constant update.

---

## 3. Surgical change — production yellow dashboard CTA

**File:** `app/portal/student/services/guidance/page.tsx`  
**Scope:** routing-only; do **not** replace the yellow dashboard component or UI.

### Step A — import (top of file)

```typescript
import { resolveGuidanceJourneyContinueHref } from "@/lib/guidance/journey-entry";
```

### Step B — compute href after `plan` is loaded

Where the page already has a `GuidancePlan` (or snapshot plan) with `currentStep`:

```typescript
const journeyContinueHref = resolveGuidanceJourneyContinueHref({
  journeyVersion: plan.journeyVersion,
  currentStep: plan.currentStep,
});
```

If `journeyVersion` lives on a nested object, pass the same field production already reads — do not add Prisma fields.

### Step C — wire the yellow card only

Find the primary CTA labeled **«ورود به مسیر انتخاب رشته»** (or equivalent yellow journey card). Replace its `href` with `journeyContinueHref`.

**Remove / replace any of these anti-patterns on that CTA only:**

```typescript
// legacy V1 hardcode
`/portal/student/services/guidance/steps/${plan.currentStep}`
guidanceJourneyStepPath(plan.currentStep)

// chamber entry (must not remain on yellow CTA)
"/ms"
"/ms/journey"
MAJOR_OFFICE_JOURNEY
```

**Do not change:** welcome copy, card layout, other dashboard links, view routing (`?view=`), loaders, or plan mutations.

### Expected resolver output

| `journeyVersion` | CTA target |
|------------------|------------|
| `>= 2` | `/portal/student/services/guidance/journey/steps/{currentStep}` |
| `< 2` or null | `/portal/student/services/guidance/steps/{currentStep}` |

---

## 4. Post-deploy verification

1. Fresh login (onboarding done) → `/portal/student/services/guidance` (yellow dashboard)
2. `/portal/student` → same (or onboarding if required)
3. `/ms` → one-hop → guidance dashboard (no loop)
4. V2 test account (`journeyVersion >= 2`) → yellow CTA → `/journey/steps/{currentStep}`
5. Legacy V1 account → yellow CTA → `/steps/{currentStep}`
6. User needing onboarding → `/portal/student/services/guidance/onboarding` (not bypassed)
7. Deep `/ms/identity`, `/ms/grades`, etc. still reachable for compatibility
8. Existing V2 `currentStep` / `completedSteps` unchanged in DB

---

## 5. Routing diagram (target state)

```
LOGIN
  ↓
onboarding required?
  ├─ yes → /portal/student/services/guidance/onboarding
  │              ↓ (complete)
  └─ no  ────────┴→ /portal/student/services/guidance  (yellow dashboard)
                         ↓
              «ورود به مسیر انتخاب رشته»
                         ↓
         resolveGuidanceJourneyContinueHref({ journeyVersion, currentStep })
                         ↓
              journeyVersion >= 2 ?
         ├─ yes → .../guidance/journey/steps/{currentStep}  (18-step V2)
         └─ no  → .../guidance/steps/{currentStep}           (legacy V1)

/ms (root) ──redirect──→ /portal/student/services/guidance
/ms/*      ──compat───→  deep routes unchanged
```
