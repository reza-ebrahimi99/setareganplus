# 05 — Profile Hub (the heart)

[Index](./README.md) · Previous: [Identity](./04-identity.md) · Next: [Timeline](./06-timeline.md)

---

## 1. Principle

After login, the default screen is **Home of My Profile**, not a catalog and not CRM.

The hub is a **premium personal dashboard**. Each section is a filtered view of a module projection. Empty sections show a calm empty state, not errors.

---

## 2. Information architecture

Nav (RTL, Persian labels):

| Section | Audience | Source |
|---------|----------|--------|
| خانه Home | all | snapshot KPIs + next actions |
| سفارش‌ها Orders | student/parent | books + booklet projections |
| جزوه‌ها Booklets | student/parent | booklet ops |
| کتاب‌ها Books | student/parent | book ERP orders |
| رزروها Reservations | all | booking |
| مشاوره Consulting | all | booking services tagged consultation |
| دوره‌ها Courses | all | enrollment when exists; else browse CTA to public courses **then login to enroll** |
| پرداخت‌ها Payments | student/parent | treasury |
| کیف پول Wallet | all | wallet ledger |
| تخفیف‌ها Discounts | all | applied + available |
| کوپن‌ها Coupons | all | held coupons |
| امتیاز Points | all | loyalty |
| فایل‌ها Files | all | file vault |
| اعلان‌ها Notifications | all | in-app |
| پیام‌ها Messages | all | future thread model; v1 = notifications + SMS history projection |
| روند Timeline | all | timeline |
| پروفایل Profile | all | ExperienceProfile + User |
| تنظیمات Settings | all | prefs, sessions, consents |
| معرفی Referral | all | referral tools |
| دستاوردها Achievements | student | **loyalty +** published CMS achievements (two subtabs, not mixed rows) |

Teacher/consultant/school grants **add** a top-level «پنل معلم / مشاور / مدرسه» (see [08](./08-partner-platforms.md)).

Parent hub: same IA but orders/files scoped to **selected child** (existing authorizedStudents switcher).

---

## 3. Home

Premium, not a widget dump:

- Identity strip: photo, name, grade/role, Jalali date
- Next action (1): e.g. «بیعانه سفارش کتاب», «رزرو مشاوره فردا», «جزوه آماده دریافت»
- Three numbers: مانده، امتیاز، رزروهای پیش رو
- Timeline preview (5 events)
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
