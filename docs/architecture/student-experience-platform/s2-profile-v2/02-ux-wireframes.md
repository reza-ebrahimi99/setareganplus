# 02 — UX wireframes

[Index](./README.md) · Previous: [Vision](./01-vision-and-phase-map.md) · Next: [Nav](./03-navigation-and-components.md)

Premium Persian RTL. Mobile-first. Skeleton on load. Calm empty states. Motion: 150–200ms opacity/translate, no bounce spam.

Tokens: keep `--primary`, `--secondary`, Vazirmatn, `dir="rtl"`. **Do not** restyle `/admin`. Hub may introduce `sxp-*` classes additive to `globals.css` without renaming `.admin-card` globally.

---

## 1. Mobile Hub Home (تجربه)

```text
┌─────────────────────────────────────┐
│  [cover image / soft gold gradient] │
│   (QR)  (avatar)                    │  ← avatar overlaps cover
│   نام دانش‌آموز                      │
│   ستارگان پلاس · نسیم‌شهر · پایه ۷   │
│   سال ۱۴۰۴-۱۴۰۵                      │
│   [کارت دیجیتال]  تکمیل پروفایل ۷۰٪ │
│   امتیاز —  ·  سطح —   (empty S2)   │
├─────────────────────────────────────┤
│  اقدام سریع (max 3)                 │
│  [پیگیری رزرو] [فایل‌ها] [روند]     │
├─────────────────────────────────────┤
│  کارت‌ها (2-col)                    │
│  ┌ رزرو پیش‌رو ┐ ┌ فایل‌ها     ┐   │
│  │ snapshot    │ │ count / خالی│   │
│  └─────────────┘ └─────────────┘   │
│  ┌ مانده      ┐ ┌ امتیاز      ┐   │
│  │ به‌زودی    │ │ به‌زودی     │   │
│  └─────────────┘ └─────────────┘   │
├─────────────────────────────────────┤
│  تازه‌ها (feed)                     │
│  · رزرو تأیید شد · ۲۳ مرداد         │
│  · فرم ارسال شد                     │
├─────────────────────────────────────┤
│  ▁ خانه  ▁ روند  ▁ فایل  ▁ کارت ▁ بیشتر │
└─────────────────────────────────────┘
```

Empty card copy (never an error): «هنوز موردی نیست» / «وقتی ماژول رویداد بفرستد اینجا می‌آید».

---

## 2. Digital Student Card

```text
┌─────────────────────────────────────┐
│  کارت دانش‌آموزی                    │
│  ┌───────────────────────────────┐  │
│  │  ستارگان پلاس                 │  │
│  │  [portrait]     نام           │  │
│  │                 پایه · شعبه    │  │
│  │  ┌ QR SXP_CARD ┐              │  │
│  │  └─────────────┘  فقط پورتال  │  │
│  └───────────────────────────────┘  │
│  والدین: کارت فرزندان مجاز         │
└─────────────────────────────────────┘
```

QR payload: opaque token, namespace `SXP_CARD`, org-scoped, rotatable. **Not** national ID. Verify only in authenticated staff/portal context (later scanner). S2 may render QR locally without a public scan API.

---

## 3. Timeline (روند)

```text
┌─────────────────────────────────────┐
│  روند                    [جستجو]    │
│  [همه] [رزرو] [فرم] [پیامک] [فایل]  │
│                                     │
│  ۲۷ مرداد ۱۴۰۵                      │
│   │  ●  رزرو تأیید شد               │
│   │     کد پیگیری ABC123            │
│  ۲۶ مرداد ۱۴۰۵                      │
│   │  ●  پیامک ارسال شد              │
│                                     │
│  (keyset: بارگذاری بیشتر)           │
└─────────────────────────────────────┘
```

Group by **Asia/Tehran calendar day**. Infinite scroll = keyset on `(occurredAt, id)`. Search = `title`/`summary` ILIKE, org+user scoped. Filters = `eventType` prefixes already on the projection.

No SMS body. No other user’s rows.

---

## 4. Files (S2)

```text
┌─────────────────────────────────────┐
│  فایل‌ها                            │
│  رسیدها · گواهی‌ها · سایر          │
│  ┌ PDF  رسید رزرو          دانلود┐  │
│  └ خالی: هنوز فایلی آماده نیست   ┘  │
└─────────────────────────────────────┘
```

Guardian without `canViewCertificates` must not see certificate files (exit criterion of frozen S2).

---

## 5. Later shells (not S2 pixels, same grid)

Orders, Wallet, Loyalty, Inbox, Referral, Learning charts reuse the same page chrome (title, filters, empty state). They **must not** ship as live ERP tables in S2.

---

## 6. Desktop

Max content width ~720–840px centered inside existing `Container`. Bottom nav becomes a compact **side or top icon row** ≥ `sm`; do not clone a 12-item admin sidebar into the Hub.

---

## 7. Motion / skeleton / empty

| State | Treatment |
|-------|-----------|
| Loading | Shimmer blocks for hero + 4 cards + 3 feed lines |
| Empty module | Illustration-free: circular «—» like `PortalEmptyState`, one sentence |
| Error | Persian generic; no Prisma text |
| Flag off | `notFound()` (S1) — no teaser chrome |
