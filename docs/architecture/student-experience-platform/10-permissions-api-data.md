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
| Outbox + CLI workers | timeline, notifications, loyalty earn, referral convert |

All loaders take trusted `PortalContext` / admin session. **Never** trust `userId` from the client.

JSON REST for mobile apps is **future**; keep loaders extractable in `lib/sxp/*`.

---

## 3. Database strategy (logical only — no Prisma in this pack)

**New tables (when approved):** ExperienceProfile, ExperienceRoleGrant, ExperienceTimelineEvent, ExperienceFile, ExperienceNotification, Wallet (if not already from Book ERP), WalletLedger, LoyaltyAccount, LoyaltyLedger, LoyaltyBadge, ReferralCode, ReferralAttribution, HubOrderProjection (optional — can query live with indexes if volume is low).

**Prefer one wallet ledger** shared with Book ERP. If Book ERP ships first, SXP uses it; if SXP ships first, Book ERP must attach `userId` to wallet.

**Do not** add columns to `User` for interests/address (profile table).  
**Do not** dump timeline JSON onto Student.  
**Do not** use CMS `Achievement` for loyalty.

Indexes: see [03](./03-domain-model.md). Expand-only migrations; `sxp` flag default false.

**RLS:** later, same as StarOS comments; app filters mandatory now.

---

## 4. AI recommendation (read-only)

Feature tables from timeline + orders + bookings (daily). Hub section «پیشنهادها». Staff see shortage predictions from Book ERP AI signals. **Human executes.**
