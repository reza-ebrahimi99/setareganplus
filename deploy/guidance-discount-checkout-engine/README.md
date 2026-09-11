# Guidance discount + checkout engine

Production-grade discount calculation and secure-payment handoff.

## Do not

- Deploy from this machine automatically
- SSH production from the coding agent
- Overwrite `lib/guidance/journey-v2/steps/step10-packages.ts`
- Pack or copy `page.early.tsx`
- Rewrite Zibal internals
- Recalculate historical paid PaymentIntents
- Mix Choice Studio / counselor scheduling / Step 12 files into this bundle

## Apply on the server

```bash
# after this bundle is copied to the server
bash deploy/guidance-discount-checkout-engine/apply-production.sh
```

The applier is rerun-safe. It copies engine/checkout/admin files, copies the
V2 Step 10 action, then converts any leftover `redirect(zibalUrl)` into a
client-navigable `{ checkoutUrl }` return. CSS is patched by marker.
Then typecheck + build + pm2 reload.

## Canonical rules

- Money unit: integer **RIAL** (Zibal `amount` is rials)
- 1 تومان = 10 ریال
- Percent rounding: `floor(originalRials * percent / 100)`
- PREMIUM 7,900,000 تومان / 97% → 7,663,000 تومان discount / 237,000 تومان payable
  (79,000,000 / 76,630,000 / 2,370,000 rials)
- V2 checkout loads prices from `GUIDANCE_V2_PACKAGES`, never V1 `GUIDANCE_PACKAGES`
- Fixed discount greater than package: **cap** at original
- 100% / zero payable: no Zibal; server-side grant (`internal-zero`)
- Client never supplies package price or payable amount
- Coupon usage is reserved atomically at PaymentIntent create; released on
  gateway failure / failed / cancelled callback. Not incremented on preview.
- Callback verifies stored `intent.finalAmountRials`. It does not re-quote
  the coupon from current admin state.
