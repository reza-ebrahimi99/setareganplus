# Guidance discount-code manager

Admin UI and server-side resolver for guidance package discount codes.

Does **not** change Zibal, payment callbacks, or package prices.

## Apply on production

```bash
cd /var/www/setareganplus
bash deploy/guidance-discount-manager/apply-production.sh
```

Rerun-safe: schema merge, CSS replace-in-place, Step 10 overlay, and migrate status are idempotent.

## Legacy codes

Existing ENV catalogs stay active:

- `GUIDANCE_PACKAGE_DISCOUNT_CODES`
- `GUIDANCE_DISCOUNT_CODES`
- `GUIDANCE_V2_DISCOUNT_CODES`

DB codes are checked first. ENV catalogs and the production Step 10 static
preview catalog remain fallbacks. This apply script does **not** remove ENV
support.
