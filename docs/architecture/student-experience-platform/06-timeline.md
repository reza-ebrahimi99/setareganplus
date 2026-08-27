# 06 — Timeline (first-class domain)

[Index](./README.md) · Previous: [Profile hub](./05-profile-hub.md) · Next: [Wallet / loyalty / referral](./07-wallet-loyalty-referral.md)

---

## 1. Rule

**Every module writes events. The profile only reads.**

Modules continue to write their own tables. They **also** emit `DomainEventOutbox` (already on master). An SXP projector worker materializes `ExperienceTimelineEvent` for the hub.

Never compute the hub timeline by UNION of seven live tables in the HTTP request.

---

## 2. Projector

```text
DomainEventOutbox (PENDING)
  → sxp:timeline-projector-once
  → insert ExperienceTimelineEvent (idempotent: outbox id)
  → optionally ExperienceNotification
  → mark outbox PROCESSED
```

Same CLI cron style as `communication:worker-once`. Idempotency: unique `(organizationId, outboxEventId)` on timeline rows.

If projection lags, hub shows last successful `projectedAt`; never errors as empty-identity.

---

## 3. Event catalog (minimum)

| type | Module | Example copy (FA intent) |
|------|--------|--------------------------|
| ACCOUNT_CREATED | Identity | حساب ساخته شد |
| LOGIN | Identity | ورود |
| BOOKING_CREATED / CONFIRMED / CANCELLED / COMPLETED | Booking | رزرو مشاوره |
| FORM_SUBMITTED | Forms | فرم ثبت شد |
| BOOKLET_ORDER_* / STAGE | Booklet | سفارش جزوه / آماده تحویل |
| BOOK_ORDER_* / RESERVED / PROCUREMENT / READY / DELIVERED | Books | سفارش کتاب |
| PAYMENT_ALLOCATED / DEPOSIT / INSTALLMENT | Treasury | پرداخت / بیعانه |
| WALLET_CREDITED | Wallet | شارژ کیف پول |
| FILE_READY | Files | فایل برای دانلود |
| CLASS_JOINED | Courses | عضویت در دوره |
| LOYALTY_REWARD / BADGE | Loyalty | جایزه |
| REFERRAL_COMPLETED | Referral | معرفی موفق |
| COUPON_REDEEMED | Marketing | کوپن |
| GIFT_RECEIVED | Marketing/Sales | هدیه |
| SMS_SENT | Communication | پیامک (visible if policy) |
| CRM_NOTE_TO_CUSTOMER | CRM | فقط اگر visibility=SELF |

Existing outbox types (`BOOKING_CREATED`, `FORM_SUBMISSION_RECEIVED`, …) are **mapped** — do not rename them; add SXP types with `ADD VALUE` when implementing.

---

## 4. Visibility

| visibility | Who sees |
|------------|----------|
| SELF | the user |
| GUARDIANS | parent hub for that student |
| STAFF | admin timeline tab (optional) |
| SYSTEM_HIDDEN | projector only |

SMS bodies are **not** stored on the timeline (PII); store template purpose + tracking ids.

---

## 5. UX

Single reverse-chronological feed, Jalali grouping, module filters, infinite keyset pagination. Home shows latest 5.

---

## 6. What timeline is not

- Not CRM `CrmActivity` (staff). A projector **may copy** selected customer-visible activities.
- Not `AuditLog` (security). Audit stays staff/security.
- Not editable by the user.
