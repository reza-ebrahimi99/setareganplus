# 05 — Profile Hub (the heart)

[Index](./README.md) · Previous: [Identity](./04-identity.md) · Next: [Experience Engine](./06-experience-engine.md)

---

## 1. Principle

After login, the default screen is **Home of My Profile**, not a catalog and not CRM.

The hub is a **premium personal dashboard**. Every section **reads Experience Engine projections** ([06](./06-experience-engine.md)). It does not UNION live booking/order/CRM tables. Empty sections show a calm empty state, not errors.

---

## 2. Information architecture

Nav (RTL, Persian labels):

| Section | Audience | Source |
|---------|----------|--------|
| خانه Home | all | Engine: widgets + feed + quick actions + card |
| سفارش‌ها Orders | student/parent | Engine projections of book + booklet events |
| جزوه‌ها Booklets | student/parent | Engine (booklet events) |
| کتاب‌ها Books | student/parent | Engine (book events) |
| رزروها Reservations | all | Engine (booking events) |
| مشاوره Consulting | all | Engine (booking tagged consultation) |
| دوره‌ها Courses | all | Engine when CLASS_* exists; else public browse |
| پرداخت‌ها Payments | student/parent | Engine wallet/payment views |
| کیف پول Wallet | all | Engine **Wallet View** (ledger is treasury) |
| تخفیف‌ها Discounts | all | Engine + marketing events |
| کوپن‌ها Coupons | all | Engine |
| امتیاز Points | all | Engine loyalty view |
| فایل‌ها Files | all | Engine downloads index |
| اعلان‌ها Notifications | all | Engine in-app |
| پیام‌ها Messages | all | v1 = Engine notifications |
| روند Timeline | all | Engine timeline |
| پروفایل Profile | all | Identity + Engine card |
| تنظیمات Settings | all | prefs (engine layout, consents) |
| معرفی Referral | all | referral tools |
| دستاوردها Achievements | student | Engine: loyalty badges + CMS projection |

Teacher/consultant/school grants **add** a top-level «پنل معلم / مشاور / مدرسه» (see [08](./08-partner-platforms.md)).

Parent hub: same IA but orders/files scoped to **selected child** (existing authorizedStudents switcher).

---

## 3. Home

Premium, not a widget dump:

- Identity strip + **Digital Student Card** (Engine)
- **Quick Actions** (max 3) from Engine
- **Widgets** (remaining, points, next reservation) from snapshots — not live ERP queries
- **Activity Feed** preview (not the full timeline)
- Recommendations (AI flag) — dismissible

---

## 4. Orders (unified list)

One list, `channel` badge: جزوه | کتاب.

User-facing **order** statuses (mapped; see [09](./09-module-integrations.md)):

Pending · Reserved · Preparing · Ready · Delivered · Cancelled · Returned

Plus money chips: Remaining Balance · Deposit · links to Invoices · Receipts (files).

Detail: lines, timeline slice, documents, QR/short code, pickup place. **No** warehouse bins.

---

## 5. Booklets

Mapped from `CommerceOpsStage` (do not change that enum):

| Ops (system) | Hub label |
|--------------|-----------|
| REGISTERED | Registered |
| PAID | Registered / Preparing |
| IN_PRODUCTION | Printing **or** Binding (substate in metadata if present; else Preparing) |
| READY_FOR_PICKUP | Ready |
| DELIVERED_TO_STUDENT | Delivered |

If booklet metadata later stores printing vs binding vs packaging, Hub shows the finer labels without forcing a booklet rewrite **now**. Until then: Preparing covers in-production.

---

## 6. Books

Mapped from Book ERP (sibling pack):

Reserved · Waiting Procurement · Ready · Delivered · Gifted · Returned

Shortage lines → Waiting Procurement. Gift invoice → Gifted.

---

## 7. Booking / consulting / classes

Reuse `BookingReservation`:

| BookingStatus | Hub |
|---------------|-----|
| PENDING | Future / awaiting confirm |
| CONFIRMED | Future |
| COMPLETED | Completed |
| CANCELLED | Cancelled |
| NO_SHOW | Completed/cancelled policy label |
| WAITING_LIST | Future |
| RESCHEDULED | History + new row |

Filter facets: School reservation · Consulting · Class · Meeting — via `BookingService` purpose/settings (existing JSON `settings` / form purpose CONSULTATION). Do **not** fork a second booking engine.

History vs future = `slot.startAt < now`.

---

## 8. Files vault

Every generated artifact is linked to the profile:

Receipt, Invoice, PDF, Assessment, Report, Homework, Purchased digital files, Certificates.

Download requires login + visibility check (guardian flags already exist for certificates/academic).

---

## 9. Profile record

Editable (permissioned):

- Photo / avatar (MediaAsset, reuse portrait pipeline)
- Personal info (User first/last; national id on Party/Student if present)
- Education / school / grade (Student link; parent sees children)
- Parents (guardian relations — read; edit via staff)
- Address, emergency contacts, interests (ExperienceProfile)

Staff remain source of truth for grade changes if AgencyProfile `studentsManageGrade=true`.

---

## 10. Settings

Notification channels (SMS / in-app), language (fa only v1), active role, logout, download my data (later). Consents reuse `ConsentRecord` types including `MARKETING_CONTACT`.
