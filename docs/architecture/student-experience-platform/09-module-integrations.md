# 09 — Module Integrations (Books, Booklets, Booking, CRM, ERP)

[Index](./README.md) · Previous: [Partner platforms](./08-partner-platforms.md) · Next: [Permissions / API / data](./10-permissions-api-data.md)

SXP **adapts** modules. It does not fork them.

---

## 1. Booking (exists on master)

- Keep `/book/[serviceSlug]` public **browse**; login gate via `sxp.forceLoginForBooking` (default off for compatibility).
- Projector: existing `BOOKING_*` outbox types → timeline + HubReservation.
- Consulting / class / meeting / school: classify via service slug, `FormPurpose`, or a future `serviceKind` on `BookingService.settings` (JSON already there — **no migration required** to start).
- Check-in QR stays booking-owned; hub shows “completed”.

---

## 2. Booklet commerce (unmerged branch)

- Ops pipeline stays `CommerceOpsStage`.
- Hub maps to user language (Registered / Printing / Binding / Packaging / Ready / Delivered) using ops + optional metadata.
- Pickup QR / short code / SMS stay booklet-owned; hub links to tracking if public token exists.
- `productLine = BOOKLET` when discriminator exists.

---

## 3. Book commerce (ERP sibling pack)

- Hub maps Reserved / Waiting Procurement / Ready / Delivered / Gifted / Returned from sales + reservation + PR coverage.
- Inventory and Pen-warehouse POs are **staff ERP**, never hub.
- Remaining/deposit from treasury allocations.

---

## 4. CRM

- Staff write-model unchanged (`/admin/leads`, automations).
- Hub may show: assigned advisor name, “open tickets” if we later add customer-visible tasks.
- New orders/bookings emit outbox events; CRM automations **may** already consume booking/form events — add book events additively.
- **No duplicated Lead** when User exists: Party/Lead links from Book ERP apply. Timeline does not clone the CRM board.

---

## 5. School ERP (students, assessments, files)

- Keep `Student`, grades, majors, assessment results, CMS achievements.
- Hub Home academic cards reuse `loadStudentPortalDashboard` (extend DTO, don’t replace).
- Assessment PDFs → file vault when generated.
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
