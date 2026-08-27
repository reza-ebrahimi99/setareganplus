# 10 — Permissions, API Strategy, Database Strategy

[Index](./README.md) · Previous: [Integrations](./09-module-integrations.md) · Next: [UX](./11-ux-public.md)

---

## 1. Permissions (additive keys only)

When coding starts, **append** keys. Do not remap CRM/booking grants in the same PR.

| Key | Meaning |
|-----|---------|
| `sxp.hub.access` | enter experience hub |
| `sxp.profile.edit_self` | edit own ExperienceProfile |
| `sxp.files.view_self` | vault |
| `sxp.wallet.view_self` | |
| `sxp.wallet.adjust` | staff |
| `sxp.loyalty.manage` | staff config |
| `sxp.referral.manage` | staff |
| `sxp.partners.view_self` | teacher/consultant/school panel |
| `sxp.partners.impersonate` | admin |
| `sxp.timeline.view_staff` | staff sees a user’s timeline |
| `sxp.notifications.manage` | templates |

Map: STUDENT/PARENT membership → hub access (already have `portal.student.access` / `portal.guardian.access`). **Reuse those** for the first hub ship; add `sxp.hub.access` only if we must not overload portal keys (Q9).

Teacher panel: grant TEACHER **or** `sxp.partners.view_self`, not `commerce.manage`.

---

## 2. API strategy

No separate public API gateway in v1.

| Style | Use |
|-------|-----|
| Server Components + loaders | Hub pages (like today’s portal) |
| Server Actions | OTP, profile edits, coupon apply, role switch |
| Route Handlers | QR images, file download, referral redirect `/r/[token]`, exports |
| Outbox + CLI workers | Experience Engine (`sxp:experience-engine-once`); existing SMS/CRM workers unchanged |

All loaders take trusted `PortalContext` / admin session. **Never** trust `userId` from the client.

JSON REST for mobile apps is **future**; keep loaders extractable in `lib/sxp/*`.

---

## 3. Database strategy (logical only — no Prisma in this pack)

**New tables (when approved, Engine vs identity):**

- Identity/hub: ExperienceProfile, ExperienceRoleGrant
- **Experience Engine:** ExperienceEngineInbox, ExperienceTimelineEvent, ExperienceFeedItem (or flag on timeline), ExperienceNotification, ExperienceFile (index), ExperienceFavorite, ExperienceRecentView, ExperienceWidgetSnapshot, ExperienceStudentCard, WalletView, LoyaltyAccountView, HubOrder/Reservation/Payment snapshots
- **Business (not Engine):** Wallet + WalletLedger, LoyaltyAccount + LoyaltyLedger (if GMV points), ReferralCode

**Do not** let Hub loaders query booking/order tables in steady state.  
**Do not** mark shared `DomainEventOutbox` PROCESSED from the Engine (use inbox).  
**Do not** add columns to `User` for interests/address.  
**Do not** use CMS `Achievement` for Engine badges.

Indexes: see [03](./03-domain-model.md). Expand-only migrations; `sxp` flag default false.

**RLS:** later, same as StarOS comments; app filters mandatory now.

---

## 4. AI recommendation (read-only)

Feature tables from timeline + orders + bookings (daily). Hub section «پیشنهادها». Staff see shortage predictions from Book ERP AI signals. **Human executes.**
