# 11 — UX & Public Website

[Index](./README.md) · Previous: [Permissions](./10-permissions-api-data.md) · Next: [Roadmap](./12-roadmap-migration-risks.md)

---

## 1. Premium hub UX

- RTL, Persian first, Vazirmatn, existing color tokens (navy / gold / surface)
- Mobile-first hub (parents on phones); dense tables only on desktop staff
- Large type, short copy, one primary CTA per screen
- Fast: projections + keyset pagination; no full-ledger scans
- Skeleton loaders; never flash other students’ data
- Accessibility: existing skip links, focus rings, `aria-current`

Do **not** clone `AdminShell` for students. Evolve `components/portal/*`.

---

## 2. Public website

Keep marketing pages (`/`, `/courses`, `/classes`, `/consultation`, …).

| Action | Anonymous | Logged-in |
|--------|-----------|-----------|
| Browse catalog/marketing | yes | yes |
| Submit new SXP order | **no** | yes |
| Wallet, files, invoices, history | no | yes |
| Coupons apply | no | yes |
| Referral claim | landing yes | account required to credit |
| Legacy `/book` + `/forms` | **compatibility** until `sxp.forceLoginFor*` | yes |

CTAs: «ورود / ثبت‌نام با موبایل» → OTP portal login.

SKU QR `/q/{token}`: public book **page** may exist under Book ERP publicStore; **purchase** requires login.

---

## 3. Messages vs notifications

v1: bell = `ExperienceNotification`. SMS history as timeline filter.  
v2: threads (`ExperienceThread`) staff↔family — out of v1 scope.

---

## 4. Role chrome

Subtle role chip (دانش‌آموز / ولی / معلم). Switching roles must not lose the session. Parent child-switcher stays.
