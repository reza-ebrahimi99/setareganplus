# StarBook Subdomain — Final Report

**Date:** 2026-09-11  
**Architecture (FINAL — do not reverse)**

| Product | Public URL | App routes | Host |
|---|---|---|---|
| **A — Booklet shop** | `https://setareganplus.ir/shop` | `app/shop/**` | Apex only |
| **B — StarBook** | `https://shop.setareganplus.ir` | `app/starbook/**` (internal) | `shop.setareganplus.ir` only |

Same Next.js process. Nginx does **not** split apps. Host-based routing is in **`proxy.ts`** (Next.js 16; `middleware.ts` is deprecated and removed).

---

## Implementation (real code, not docs)

### `proxy.ts` — Host detection

```ts
if (host === "shop.setareganplus.ir") { /* StarBook rewrites */ }
```

`grep -R "shop.setareganplus.ir"` hits:
- `proxy.ts` (routing)
- `lib/starbook/host.ts` (`STARBOOK_PUBLIC_HOST`)
- `content/public-nav.ts` (nav link)
- `scripts/verify-starbook-proxy.ts`

### Behavior

| Host | Path | Result |
|---|---|---|
| `shop.setareganplus.ir` | `/` | **Rewrite** → `/starbook` (URL stays `/`) |
| `shop.setareganplus.ir` | `/cart`, `/account`, `/book/:slug`, … | **Rewrite** → `/starbook…` |
| `shop.setareganplus.ir` | `/shop` | **Redirect** → `https://setareganplus.ir/shop` |
| `setareganplus.ir` | `/shop` | Booklet `app/shop` — **untouched** |
| `setareganplus.ir` | `/starbook…` | **Redirect** → `https://shop.setareganplus.ir…` |

---

## Hard rules enforced

1. **`app/shop` is booklet only** — no StarBook imports.
2. **StarBook never renders on `/shop`.**
3. **No rewrite maps `/shop` → `/starbook`.**
4. Pretty public URLs on the subdomain; internal tree is `/starbook`.
5. Shared BookSku / checkout / Prisma / admin / APIs — not duplicated; routing-only Host change.

---

## Verification (local)

With real `Host: shop.setareganplus.ir` (node `http.request`):

| Check | Result |
|---|---|
| `/` | StarBook title + hero (`x-starbook-rewrite: /starbook`) |
| `/cart` | 200 StarBook cart |
| `/account` | 200 StarBook account |
| `/book/math-101` | Rewritten to StarBook PDP tree (not apex booking `/book`) |
| `/shop` on shop host | 307 → `https://setareganplus.ir/shop` |
| `/shop` on apex | Booklet title «فروشگاه محصولات آموزشی» |
| Unit `scripts/verify-starbook-proxy.ts` | All Host decisions correct |

---

## Changed / added files (routing focus)

### Routing (Next.js 16 Proxy)
- `proxy.ts` **(new — replaces deprecated middleware)**
- `middleware.ts` **(deleted)**
- `lib/starbook/host.ts`
- `lib/starbook/paths.ts`
- `scripts/verify-starbook-proxy.ts`

### StarBook app + links (prior migration; still required)
- `app/starbook/**`
- `components/starbook/**` (pretty hrefs)
- `lib/commerce/starbook/campaigns.ts`
- `content/public-nav.ts`
- `lib/seo/public-pages.ts`
- `app/admin/(dashboard)/commerce/actions.ts` (revalidate paths)

### Booklet
- `app/shop/**` — booklet only; do not redesign

### Reports
- `STARBOOK_SUBDOMAIN_FINAL_REPORT.md` (this file)

---

## Deploy

1. Rebuild/restart so **`proxy.ts`** is loaded (not legacy `middleware.ts`).
2. Confirm nginx forwards `Host` for `shop.setareganplus.ir`.
3. Smoke: `https://shop.setareganplus.ir/` = StarBook; `https://setareganplus.ir/shop` = booklet.
