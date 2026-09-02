# Production merge — yellow guidance dashboard (presentation only)

**Canonical production file:** `app/portal/student/services/guidance/page.tsx`

**DO NOT replace** this file with the Windows branch version.

Production yellow card **«ورود به مسیر انتخاب رشته»** must keep routing through:

```
/portal/student/services/guidance/steps
```

That index page redirects using the student's real `journeyVersion` + `currentStep` (V2 → `journey/steps/{n}`, V1 → `steps/{n}`).

## Safe to merge from branch

| Asset | Purpose |
|-------|---------|
| `components/guidance/office/GuidanceStudentDashboardPanels.tsx` | Visual polish, Persian labels, universities card |
| `components/guidance/office/OfficeAccountMenu.tsx` | Logout «خروج از حساب» |
| `components/guidance/platform/GuidanceUniversitiesHub.tsx` | `?view=universities` hub |
| `app/globals.css` — `.guidance-command-*`, `.guidance-universities-hub*` | Dashboard + hub styles |

## Production page.tsx — minimal edits only

### A — universities view routing

If not already present, add `?view=universities` branch returning `<GuidanceUniversitiesHub />`.

### B — yellow CTA href

Ensure journey card `href` is **exactly**:

```typescript
const journeyContinueHref = "/portal/student/services/guidance/steps";
```

**Remove / do not add on production yellow CTA:**

```typescript
resolveGuidanceJourneyContinueHref(...)  // direct step URL — wrong for production entry
`/portal/student/services/guidance/steps/${plan.currentStep}`  // bypasses version router
"/ms" / "/ms/journey"
"/journey/steps/1"  // hardcoded
```

### C — logout control

In production dashboard header/welcome area, render:

```tsx
<OfficeAccountMenu userDisplayName={studentDisplayName} />
```

Uses existing `POST /portal/logout` with `next=/guidance` — no new auth logic.

### D — pass props to panels

```tsx
<GuidanceStudentDashboardPanels
  model={model}
  userDisplayName={...}
  journeyContinueHref="/portal/student/services/guidance/steps"
/>
```

## Explicit exclusions

- No replacement of production yellow card layout/copy unless intentionally polishing
- No changes to plan loaders, Prisma queries, or journey mutations
- No hardcoded step numbers on dashboard CTAs

## Validate

1. Yellow CTA → `/steps` → correct V1 or V2 step for account
2. Logout visible desktop + mobile; lands on `/guidance` not `/ms`
3. Universities hub links → `/discover/programs`, `/discover/systems`
4. `currentStep` / `completedSteps` unchanged in DB
