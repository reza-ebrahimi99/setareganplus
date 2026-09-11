# StarBook Subdomain Migration Report

**Date:** 2026-09-11  
**Goal:** Split two products that were incorrectly collapsed into `app/shop`.

## Product split (authoritative)

| Surface | Host / URL | Product |
|---|---|---|
| Booklet shop | `https://setareganplus.ir/shop` | Existing pamphlet / booklet / internal products storefront — **unchanged** |
| StarBook | `https://shop.setareganplus.ir` | Gen-Z educational bookstore marketplace |

Nginx already routes `shop.setareganplus.ir` to this Next app. This change implements **hostname-based routing inside the app**.

## What moved

- StarBook App Router tree: `app/shop/**` (StarBook UI) → **`app/starbook/**`**
- StarBook public links: `/shop/...` → **`/starbook/...`** (via `starBookHref()` / direct paths)
- Apex **`/shop`** restored to the pre-StarBook booklet listing + PDP (`SiteShell` + `ShopProductCard` / `PublicFormShell` + `ShopCheckoutForm`)

## What stayed shared (no duplication)

- **Catalog:** `BookSku` / `listPublicCommerceProducts` / related catalog services
- **Checkout:** `app/shop/actions.ts` + `ShopCheckoutForm` + commerce order / payment flow
- **Shared UI:** `components/shop/*` (cover, card, checkout form) reused by both surfaces
- **Prisma / DB / admin commerce / APIs / auth:** untouched as data models

## Hostname routing (`middleware.ts`)

When `Host` / `x-forwarded-host` matches StarBook (`shop.setareganplus.ir`, or `STARBOOK_HOST` / `shop.localhost`):

1. `/` → rewrite → `/starbook`
2. `/shop/*` → rewrite → `/starbook/*` (legacy StarBook URLs on the subdomain)
3. Pretty paths (`/browse`, `/cart`, …) and single-segment product slugs → rewrite → `/starbook…`
4. Shared paths pass through: `/_next`, `/api`, `/admin`, `/portal`, `/payments`, `/booklet`, `/ms`, `/media`, favicon/robots/sitemap

When on the **apex** host:

- `/shop` remains the booklet storefront
- `/starbook/*` **redirects** to `STARBOOK_PUBLIC_ORIGIN` (default `https://shop.setareganplus.ir`) so StarBook is not served as a second storefront on the main site

Helpers:

- `lib/starbook/host.ts` — `isStarBookHost`, `getStarBookPublicOrigin`, `STARBOOK_APP_PREFIX`
- `lib/starbook/paths.ts` — `starBookHref()`

Env (optional):

- `STARBOOK_HOST` (default `shop.setareganplus.ir`)
- `STARBOOK_PUBLIC_ORIGIN` (default `https://shop.setareganplus.ir`)

## Nav / SEO restore

- Apex nav: `/shop` label restored to **«کتاب و جزوه»**
- Separate nav item: **استاربوک** → `https://shop.setareganplus.ir`
- `lib/seo/public-pages.ts` `shop` metadata restored to booklet copy (not StarBook)
- StarBook layout / home use StarBook-specific titles

## Admin cache

`revalidateStarBookStorefront()` now revalidates `/shop` (booklet) and `/starbook` (+ browse/collections).

## Verification checklist

| Check | Expected | Local result (2026-09-11) |
|---|---|---|
| `setareganplus.ir/shop` | Booklet listing (`SiteShell`, «فروشگاه محصولات آموزشی») | Source restored; page 500 without DB (`P1001`) |
| `setareganplus.ir/shop/{slug}` | Booklet PDP + checkout form | Source restored from pre-StarBook commit |
| `setareganplus.ir/starbook` | Redirect to StarBook origin | **307** redirect confirmed on `next dev` |
| `shop.setareganplus.ir/` | StarBook home (rewrite → `/starbook`) | Middleware + helpers verified; HTML needs DB |
| `shop.setareganplus.ir/browse` | StarBook discovery (rewrite) | Wired in middleware matcher |
| Shared catalog/checkout | BookSku + `app/shop/actions` | Unchanged imports from StarBook PDP |
| Host helpers | `isStarBookHost` / `starBookHref` | Unit-checked via `tsx` |

**Note:** Full HTML smoke needs Postgres. After deploy/rebuild with DB: confirm apex `/shop` is booklet UI and `shop.setareganplus.ir` is StarBook.

## Explicit non-goals (honored)

- No redesign of apex `/shop`
- No second product/catalog model
- No Prisma schema fork
- No duplicate checkout business logic
