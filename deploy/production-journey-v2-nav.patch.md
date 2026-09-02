# Production patch — Journey V2 bottom navigation (presentation only)

**Target:** production-only V2 journey UI under:

- `components/guidance/journey-v2/**`
- `lib/guidance/journey-v2/**` (presentation helpers only)

**Do NOT** change step actions, validation, advance logic, or progression.

## Goal

Unify V2 step footer buttons to match V1 polish already on this branch:

- Same min-height (~48px touch target)
- Same border-radius (`rounded-xl` / `--gpj-action-radius`)
- Equal width on mobile stack; auto width on desktop row
- Back = outline/ghost; Continue = primary
- RTL layout (`dir="rtl"`, flex-end order)
- Loading and disabled states preserved

## Reference (V1 — safe to copy styles from branch)

| File | Role |
|------|------|
| `components/guidance/steps/GuidanceStepActions.tsx` | Shared footer component |
| `app/globals.css` — `.gpj-step-actions*` | Footer layout + states |

## Surgical approach on production

### Option A — shared CSS class (preferred)

1. Copy **only** these CSS blocks from branch `app/globals.css` into production globals (or a V2-scoped stylesheet):

   - `.gpj-step-actions`
   - `.gpj-step-actions--stack`
   - `.gpj-step-actions__back`
   - `.gpj-step-actions__continue`
   - `[disabled]` / `[aria-busy="true"]` variants

2. In each V2 step footer component, add class names to existing `<button>` / `<Link>` elements — **do not change `onClick`, `formAction`, or href targets**.

### Option B — thin wrapper component

Create `components/guidance/journey-v2/JourneyV2StepActions.tsx` that accepts:

```typescript
{
  backHref?: string;
  backLabel?: string;
  continueLabel: string;
  continueDisabled?: boolean;
  continuePending?: boolean;
  onContinue?: () => void;
  continueFormAction?: string; // pass through only — no new logic
}
```

Wire existing V2 handlers as props. No new validation.

## Explicit exclusions

- No edits to `currentStep`, `completedSteps`, guards, or plan mutations
- No edits to payment step or package selection logic
- No route changes under `journey/steps/[step]`

## Validate

1. Mobile: buttons stack full-width, back above continue
2. Desktop: row aligned end, equal visual weight
3. Disabled continue during submit still works
4. V2 step progression unchanged in DB after smoke test
