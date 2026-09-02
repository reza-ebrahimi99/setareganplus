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
**Scope:** routing-only on the yellow journey card; do **not** replace the dashboard.

### Keep production entry router

Yellow card **«ورود به مسیر انتخاب رشته»** must link to:

```typescript
const journeyContinueHref = "/portal/student/services/guidance/steps";
```

The `/steps` index redirects using `journeyVersion` + `currentStep` (V2 → `journey/steps/{n}`, V1 → `steps/{n}`).

**Do not** point the yellow CTA directly at a step URL or use `resolveGuidanceJourneyContinueHref` on the dashboard — that bypasses production's version-aware index.

See also: `deploy/production-yellow-dashboard-merge.md` for visual polish + logout + universities hub.

### Remove / replace anti-patterns on yellow CTA only

```typescript
// direct step — wrong for dashboard entry
resolveGuidanceJourneyContinueHref({ journeyVersion, currentStep })
`/portal/student/services/guidance/steps/${plan.currentStep}`

// chamber / legacy entry
"/ms" | "/ms/journey" | MAJOR_OFFICE_JOURNEY

// hardcoded
"/journey/steps/1"
```

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
