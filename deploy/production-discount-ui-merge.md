# Production merge — discount code UI wraps existing backend

**Problem:** branch file `components/guidance/steps/step3/GuidanceDiscountCodeField.tsx` is **UI-only / fake** — it must **not** ship on production as-is.

Production already has real package discount validation and payment integration.

## Branch status (this commit)

- `RegistrationPaymentStep.tsx` — **fake discount field removed**
- `GuidanceDiscountCodeField.tsx` — kept as **reference UI shell only**; not rendered in V1 payment step

## Production surgical merge

### Step 1 — locate production discount logic

Search production tree for existing discount handling, typically near step-3 checkout:

- `applyGuidanceDiscount*` / `validateDiscountCode*` server actions
- checkout action params accepting `discountCode`
- any `GuidancePackage` discount fields

**Do not** duplicate validation rules or change discount amounts.

### Step 2 — wire UI to production action

In production `RegistrationPaymentStep` (or V2 payment equivalent):

1. Import or adapt `GuidanceDiscountCodeField` styling from branch
2. Replace fake `handleApply` with a call to the **existing** production server action, e.g.:

```typescript
// PSEUDOCODE — use production action name/signature
const result = await applyProductionGuidanceDiscountAction({ code: trimmed, packageCode });
if (!result.ok) { setStatus("error"); setMessage(result.error); return; }
setStatus("applied");
setMessage(result.message ?? "کد تخفیف اعمال شد.");
setAppliedCode(trimmed);
```

3. Pass `appliedCode` into the **existing** `startGuidanceCheckoutAction` (or production equivalent) — only if production already supports it.

### Step 3 — preserve payment invariants

- Do **not** change gateway amounts server-side without going through production discount service
- Do **not** add client-side price overrides
- Do **not** touch Prisma, migrations, or `packagePaidAt`

### Step 4 — CSS

Copy `.gp-discount*` blocks from branch `app/globals.css` if production lacks them.

## Validate

1. Invalid code → production error message (unchanged rules)
2. Valid code → checkout reflects production discount amount
3. No code → full price unchanged
4. Payment callback / `guidancePackageCode` flow unchanged
