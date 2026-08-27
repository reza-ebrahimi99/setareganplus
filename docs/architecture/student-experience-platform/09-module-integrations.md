# 09 — Module Integrations (Books, Booklets, Booking, CRM, ERP)

[Index](./README.md) · Previous: [Partner platforms](./08-partner-platforms.md) · Next: [Permissions / API / data](./10-permissions-api-data.md)

SXP **adapts** modules. It does not fork them. Each module **must publish events**. The **Experience Engine** is the only hub consumer ([06](./06-experience-engine.md)).

---

## 1. Booking (exists on master)

- Keep `/book/[serviceSlug]` public **browse**; login gate via `sxp.forceLoginForBooking` (default off for compatibility).
- **Publish** existing `BOOKING_*` outbox types. Engine projects timeline + HubReservation + widgets.
- Hub does **not** query `BookingReservation` in steady state (one-time backfill allowed).
- Consulting / class / meeting / school: classify via service slug, `FormPurpose`, or `BookingService.settings` JSON.
- Check-in QR stays booking-owned; Engine shows “completed”.

---

## 2. Booklet commerce (unmerged branch)

- Ops pipeline stays `CommerceOpsStage`.
- **Publish** stage/order events. Engine maps user labels (Registered / Printing / Binding / Packaging / Ready / Delivered).
- Pickup QR / short code / SMS stay booklet-owned.
- `productLine = BOOKLET` when discriminator exists.

---

## 3. Book commerce (ERP sibling pack)

- **Publish** sales/reservation/fulfillment events. Engine maps Reserved / Waiting Procurement / Ready / Delivered / Gifted / Returned.
- Inventory and Pen-warehouse POs are **staff ERP**, never hub (no Engine inventory widgets).
- Remaining/deposit arrive as PAYMENT_* snapshots.

---

## 4. CRM

- Staff write-model unchanged (`/admin/leads`, automations).
- Hub may show advisor name **via Engine widget** if CRM publishes a customer-visible event; no live CRM queries from `/portal`.
- New orders/bookings emit outbox events; CRM automations **may** already consume booking/form events — add book events additively.
- **No duplicated Lead** when User exists: Party/Lead links from Book ERP apply. Timeline does not clone the CRM board.

---

## 5. School ERP (students, assessments, files)

- Keep `Student`, grades, majors, assessment results, CMS achievements.
- Hub Home academic cards: S1 may wrap existing `loadStudentPortalDashboard` as a **bootstrap**; steady state is Engine widgets from academic events (`FILE_READY`, result published).
- Assessment PDFs → Engine downloads index when `FILE_READY` fires.
- Guardian visibility flags remain the authorization spine for child data.

---

## 6. Treasury & payments

- Reuse `PaymentIntent` when present.
- Hub Payments: intents + documents (invoice/receipt as files).
- Deposits, remaining, installments: read from order remaining fields / installment rows (Book ERP).
- Do not build a third payments stack.

---

## 7. Inventory

- Invisible to students except status **Waiting Procurement** / **Ready**.
- Lost-sales and shortage AI signals are staff/AI, not hub.

---

## 8. Notifications

- Keep SMS queue.
- Add in-app notifications from the same projector.
- Marketing SMS still requires `MARKETING_CONTACT` consent.

---

## 9. Administration

- `/admin` IA unchanged in SXP phases.
- Optional later: “view in hub” link on a student record.
- New SystemRoles (cashier, warehouse) belong to Book ERP / staff PRs, not a stealth RBAC rewrite inside SXP.
