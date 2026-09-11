# StarBook Visual Experience Report

Pure product design + UX + frontend. **No Prisma, checkout, orders, APIs, auth, or catalog model changes.**

Canonical product remains `BookSku`. Merchandising remains `CommerceCategory`. Play/XP/stars live in `localStorage` only.

## Before vs After

| Before | After |
| --- | --- |
| Hero felt like a marketing banner on a CRUD shop | Immersive hero: floating planets, books, aurora, breathing CTA, student greeting HUD |
| Cards were flat product tiles | Collectible cards: hover lift, badges (sale/new/featured/gift), wishlist + quick-add + preview |
| Account was shortcut tiles | Student hub: level, tier, streak, mission, badges, favorite subjects, soft leaderboard |
| PDP was a form + description | Steam-like page: gallery, reading path, teacher/counselor, sticky buy, checkout chrome |
| Search was an inline form | Floating command palette (recent, popular, campaigns, grades, subjects) |
| Mobile was desktop-shrunk | Bottom dock + floating cart + sticky buy |
| Empty/404 were plain | Illustrated empty states + funny animated 404 |
| Campaigns were static titles | Countdown, hero scene, staggered grids |
| Success was text | Confetti celebration + XP CTA |

## Screens implemented / upgraded

| Screen | Experience |
| --- | --- |
| `/shop` | Immersive home + Play HUD + campaigns + trending / best / new / teacher / counselor / exam / flash + collections + recommended + recent |
| `/shop/browse` | Immersive discover + filter panel + collectible grid |
| `/shop/[slug]` | Steam-like PDP + sticky purchase + checkout progress chrome |
| `/shop/cart` | Existing cart UX (business flow untouched) |
| `/shop/confirmed` | Confetti + celebration CTAs |
| `/shop/campaigns/[slug]` | Animated landing + flash countdown |
| `/shop/bundles` | Exam / major / teacher pack tiles + featured collections |
| `/shop/account` + `/points` | Full student hub / gamification |
| `/shop/not-found` | Funny Gen-Z 404 |
| Shell | Glass header, command search, dock, float cart |

## Design system

- Scoped CSS: `styles/starbook.css` (`.starbook`)
- Motion: Framer Motion (`StarBookReveal`, stagger, magnetic CTA, card hover, reduced-motion safe)
- Play layer: `lib/commerce/starbook/play.ts` + `play-store.ts` (local only)
- Identity: dark navy, electric blue, purple, pink, orange, lime, glass, glow, neon pills

## Gamification (local only)

- XP / levels / bronze·silver·gold
- Daily visit streak + badges
- Mission of the week (wishlist 3)
- Favorite subjects from browsing/wishlist actions
- Soft leaderboard placeholder (you vs fictional peers)

## Intentionally untouched

- Prisma schema / migrations
- Checkout payment (`startShopCheckoutAction`)
- Commerce orders / inventory / admin ops
- BookSku / BookSkuPrice / CommerceCategory data contracts

## Remaining polish (nice-to-have)

- Real illustrated SVG packs per subject (instead of CSS planets/books)
- Swipe gesture rails on mobile
- Virtualized long browse grids if catalogs grow huge
- Wire payment success page into StarBook confetti when DB/env available
- Screenshot gallery against live Postgres + visible BookSkus

## Verification

| Check | Status |
| --- | --- |
| `npm run test:starbook-play` | **6 passed** |
| `npm run test:books-catalog` | **21 passed** |
| `tsc --noEmit --incremental` | **passed** |
| Backend / Prisma / checkout | **untouched** |
| Production build | Optional follow-up: `npx next build --webpack` |

## Emotional target

When a student opens the shop, it should feel closer to Spotify + Duolingo + Apple Store than to an ERP with products.
