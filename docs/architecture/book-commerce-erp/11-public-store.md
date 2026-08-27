# 11 — Public Store (deferred)

**Status:** Contract only — **not** a delivery priority  
**Flags:** requires `bookCommerce` **and** `bookCommerce.publicStore` (both off)

[Index](./README.md) · Previous: [Reporting](./10-reporting.md) · Next: [Roadmap](./12-roadmap.md)

---

## 1. Position

Pen Book Agency ERP is **admin-first**. A public catalog is a later channel into the **same** sales/warehouse/treasury engine. It is not a second inventory.

Do not build `/shop/books` until ERP phases for catalog, reservation, treasury, and procurement are running internally.

---

## 2. When it exists

Public storefront may:

- Browse active SKUs / bundles (isVisible)
- Show current price (from price history)
- Open **book page** from permanent SKU QR
- Create a **request / draft order** (preferred v1 public) **or** full checkout if `bookCommerce.onlinePayment`

Public storefront must not:

- Show other tenants
- Show RESERVED/DAMAGED qty
- Bypass reservation ATP
- Use `/book/` (booking)
- Share booklet shop IA in a confusing way (separate nav: «فروشگاه کتاب» vs «جزوه»)

---

## 3. QR resolver

`/q/{token}`:

- BOOK_SKU + publicStore on → public book page
- BOOK_SKU + publicStore off → admin login next=
- ORDER/DELIVERY → tracking page (limited PII)
- WAREHOUSE/ADMIN_DOC → always auth
- PARTNER_REFERRAL → attribution cookie + landing (catalog if on, else “ثبت در آژانس” message)

---

## 4. Tracking page (can precede full catalog)

`/order/ba/{orderNumber}` or short code: status, remaining, pickup place, no price-edit. Useful for SMS even while public catalog is off. Treat as ERP accessory, optional small flag `bookCommerce.publicTracking`.

---

## 5. Implementation freeze

This document is enough for URL and flag planning. **No pages in this PR.**
