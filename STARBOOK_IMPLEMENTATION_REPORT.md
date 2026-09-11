# StarBook Implementation Report

StarBook is the public educational bookstore of Setaregan Plus. It sits on the **unified `BookSku` catalog**. No second product model was added. Checkout, inventory, and order ops are unchanged.

## What shipped

A student-facing marketplace (RTL, mobile-first, dark/neon) plus a merchandising suite for staff.

### Public storefront

| Route | Purpose |
| --- | --- |
| `/shop` | Home: hero, instant search, campaigns, featured / trending / bestsellers / new / flash, grades, subjects, collections, recommended, recently viewed |
| `/shop/browse` | Discovery with instant search, filter panel (grade, subject, collection, sale, featured), sort |
| `/shop/[slug]` | Book page: gallery + preview pages, specs, teacher/counselor copy, reviews/rating, related, frequently bought together, wishlist/share/cart, existing checkout |
| `/shop/cart` | Animated qty, coupon STAR7 (display), recommendations, checkout first line via existing payment |
| `/shop/wishlist` | Client wishlist over BookSku ids |
| `/shop/account` | Profile chips, points, shortcuts |
| `/shop/account/orders` | Saved short tracking codes |
| `/shop/account/addresses` | Pickup-branch note (local) |
| `/shop/account/notifications` | Campaign-style student alerts (local) |
| `/shop/account/points` | Loyalty stars (local) |
| `/shop/track` | Short-code → existing `/booklet/[token]` |
| `/shop/confirmed` | Post-payment celebration + track CTA (live receipt remains `/payments/success`) |
| `/shop/collections` + `/shop/collections/[slug]` | `CommerceCategory` merchandising, products still `BookSku` |
| `/shop/bundles` | Featured collections as night-exam packs |
| `/shop/campaigns/[slug]` | Campaign landings over sale / new / trending / featured shelves |
| `/shop/grade/[grade]`, `/shop/subject/[subject]`, `/shop/exam`, `/shop/major` | Taxonomy entry points |

### Admin

| Route | Purpose |
| --- | --- |
| `/admin/commerce` | Hub: BookSku / visibility / featured / order counts + links |
| `/admin/commerce/categories` | Full CRUD on `CommerceCategory` (create, edit, feature, hide, archive) |
| `/admin/commerce/products` | BookSku shop editor + featured toggle |
| `/admin/commerce/merch` | Homepage featured books, campaign cards, collection banners |
| `/admin/commerce/seo` | `metaTitle` / `metaDescription` on BookSku |
| `/admin/commerce/coupons` | STAR7 display policy (not applied to payment) |
| `/admin/commerce/reviews` | Editorial review policy |
| `/admin/commerce/reports` | Catalog counts + existing order-ops KPIs |
| Existing ops | Orders, production, pickup, payments, staff performance, Excel import |

Product form now saves `isFeatured`, `metaTitle`, and `metaDescription` on the same BookSku row.

## Architecture (unchanged contract)

- **Canonical product:** `BookSku` (+ `BookTitle` bibliography, `BookSkuPrice` temporal prices).
- **Merchandising:** `CommerceCategory` via `BookSkuCategory`.
- **Orders:** `CommerceOrder` / `CommerceOrderItem.bookSkuId`.
- **Cart / wishlist / recent / searches / points / ratings / address / notifications:** `localStorage` only — not a catalog.
- **Campaigns:** `lib/commerce/starbook/campaigns.ts` copy; products queried from BookSku.
- **Checkout:** still `startShopCheckoutAction` → `createSingleItemCommerceOrder` → payment. Single-item on purpose.

Extended `listPublicCommerceProducts` with `sort`, `featured`, `categorySlug`, `excludeId`. Added `listPublicStoreCollections`, category CRUD, merch flags, SEO rows. `PublicCommerceProduct` includes `isFeatured`, `categorySlug`, `updatedAt`.

## New student features

- Instant search with recent + popular suggestions; subject filter is visible.
- Filter panel on browse (grade, lesson, collection, sale, featured, sort).
- Recommended-for-you rail from recently viewed subjects/grades.
- Book gallery with illustrated preview pages.
- Local star rating + note on the book page.
- Cart recommendations from the same BookSku catalog.
- Bundles page over featured collections.
- Account: orders, addresses, notifications, points.
- Stronger campaign tiles, RTL scope, skeleton styles, empty-state art.

## Intentionally not a new backend

Reviews are editorial (teacher/counselor copy) plus a local rating. Multi-item payment is not invented — cart still hands off to the working single-book checkout. Reward points and coupon STAR7 are student-facing chips until a ledger/discount column is applied. Book ERP warehouse/sales/treasury remain unshipped. Barcode printing and bulk image upload stay on existing catalog/import/label routes.

## Verification

| Check | Result |
| --- | --- |
| `tsx scripts/books-catalog-unit-tests.ts` | 21 passed (shelves + recommend from BookSku) |
| `tsx scripts/commerce-foundation-unit-tests.ts` | all passed (category normalize + nav permissions) |
| `tsc --noEmit --incremental` | passed |
| `next build --webpack` | passed (compile 3.7m + TypeScript + static generation) |

## Screenshots

Captured from production `next start` when the page does not need Postgres:

| Page | File | Notes |
| --- | --- | --- |
| Account | `starbook-account-v2.png` | Points + mosaic shortcuts (orders, address, alerts, cart) |
| Notifications | `starbook-notifications.png` | Welcome + flash campaign cards |
| Confirmed | `starbook-confirmed.png` | Post-pay celebration + track CTA |
| Cart empty | `starbook-cart.png` | Empty state + discover CTA |
| Majors | `starbook-major.png` | Mosaic entry (ریاضی / تجربی / انسانی) |
| Track | `starbook-track.png` | Short-code form → `/booklet/[token]` |

Home, browse, PDP, collections, bundles, and admin hubs need a reachable `DATABASE_URL` and visible BookSku rows. `/shop` on this machine returned the friendly error shell (Postgres not at 127.0.0.1:5432).

## How to launch locally

1. `npx prisma migrate deploy` (catalog unification).
2. Publish BookSku rows: `isVisible=true`, `status=ACTIVE`, optional `isFeatured`.
3. Feature collections in `/admin/commerce/categories`.
4. Open `/shop`.
