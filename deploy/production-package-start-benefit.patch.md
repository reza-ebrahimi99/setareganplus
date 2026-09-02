# Production patch — START (free) package benefit

**Target:** canonical V2 package catalog on production (NOT this Windows branch).

## Context

Production package codes:

| Code | Tier |
|------|------|
| `START` | Free |
| `SMART` | Paid |
| `SPECIALIZED` | Paid |
| `PREMIUM` | Paid |

The benefit **«چیدمان اولیه انتخاب‌ها»** must appear on **START** (free), not on paid tiers only.

This branch uses legacy `ESSENTIAL` / `PREMIUM` in `lib/guidance/journey/packages.ts` — **do not rename production codes**.

## Surgical edit (production only)

**File (typical production paths — locate the canonical V2 source):**

- `lib/guidance/journey-v2/packages.ts`, or
- `lib/guidance/journey-v2/catalog.ts`, or
- wherever `START` / `SMART` / `SPECIALIZED` / `PREMIUM` are defined

### Step A — add benefit to START

In the `START` package `features` (or equivalent entitlements array), append:

```typescript
"چیدمان اولیه انتخاب‌ها",
```

Place it after the first free-tier benefit if ordering matters for UI; do not reorder existing items unless required for copy flow.

### Step B — verify paid tiers unchanged

- Do **not** remove the benefit from paid tiers if it already exists there.
- Do **not** change `priceRials`, checkout slugs, or entitlement gates.
- Do **not** touch `guidancePackageCode`, `packagePaidAt`, or payment callbacks.

### Step C — validate

1. START card shows «چیدمان اولیه انتخاب‌ها»
2. Prices unchanged for SMART / SPECIALIZED / PREMIUM
3. Checkout amounts unchanged
4. `npx tsc --noEmit` + build on production tree

## Windows branch status

`lib/guidance/journey/packages.ts` on this branch was **reverted** — no ESSENTIAL benefit added here. Apply this patch only on production V2 catalog.
