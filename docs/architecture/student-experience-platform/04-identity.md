# 04 — Identity Platform

**Do not replace.** Extend.

[Index](./README.md) · Previous: [Domain model](./03-domain-model.md) · Next: [Profile hub](./05-profile-hub.md)

---

## 1. One identity

The login principal is existing **`User`**.

- Mobile OTP remains the default for portal and staff (already).
- Password hash on User stays available for staff if used; SXP does not add NextAuth providers.
- `normalizedMobile` uniqueness remains global — one human, one user row, even across future agencies (multi-org memberships already allowed: one membership **per** org).

---

## 2. Sessions (keep cookies)

| Surface | Cookie | Loader |
|---------|--------|--------|
| Administration | `staros_admin_session` | `require-admin` / permissions |
| Experience Hub | `staros_portal_session` | evolve `requirePortalContext` |
| Partner-only device | optional later `staros_partner_session` | only if teachers must not hit `/portal` student APIs |

**Recommendation (Q6):** Teachers/consultants who are also parents use the **same portal cookie** + role switcher. Do not add a third cookie until a security review requires isolation.

`AdminSession` table already stores portal sessions. Keep it; optionally rename in docs only (“session”), not in a rewrite.

TTL 7 days stays unless product asks otherwise.

---

## 3. Multiple roles without breaking membership

**Keep** `OrganizationMembership.role` as the **primary** role used by `/admin` (BRANCH_MANAGER, FINANCE, …). Admin authorization code paths stay `permissionsForRole(membership.role)`.

**Add** `ExperienceRoleGrant` for hub capabilities:

| roleKey | Hub mode | Typical link |
|---------|----------|--------------|
| STUDENT | student hub | PortalAccountLink STUDENT |
| PARENT | parent hub | PortalAccountLink GUARDIAN |
| TEACHER | teacher panel | Partner TEACHER + grant |
| CONSULTANT | consultant panel | Partner CONSULTANT or BookingAdvisor.userId |
| STAFF | deep-link to `/admin` | existing membership |
| WAREHOUSE_KEEPER | staff | grant + future SystemRole |
| CASHIER | staff | grant |
| SCHOOL_MANAGER | school panel | Partner SCHOOL + grant |
| AGENCY_MANAGER | staff books ERP | grant |
| PLATFORM_ADMIN | `User.isPlatformAdmin` | already |

Future roles = new `roleKey` values (data), not a platform rewrite.

**Sync rules (application, when coded):**

- Creating `PortalAccountLink` STUDENT ⇒ ensure grant STUDENT.
- Guardian link ⇒ grant PARENT.
- Do **not** auto-promote TEACHER from `SystemRole.TEACHER` until staff confirms (open Q7) — enum TEACHER exists but may be unused in the field.

Admin RBAC maps are **not** rewritten in the first SXP PR. Grants only affect `/portal` (and `/partners` if split).

---

## 4. Login journeys

```text
Public → CTA requires login → /portal/login (OTP)
  → if sxp off: today’s student/parent redirect
  → if sxp on:
       load grants + links
       if many modes → /portal/select-role (extends select-account)
       else → /portal (hub home)
```

Staff continue `/admin/login`. A cashier does not need the student hub. Optional “open my profile” from admin header later.

Account not provisioned: same Persian refusal as today (no enumeration).

---

## 5. Provisioning

Who creates the User+link remains admin (`students.portal.manage`). SXP adds:

- Self-signup **only** if a campaign/referral token is present (flag `sxp.publicSignup`) — default **off**.
- Referral invite creates INVITED user + grant, not a student academic row.

---

## 6. What we will not do

- NextAuth / OAuth in v1
- Merging `Student` into `User`
- Dropping XOR on `PortalAccountLink` without a migration plan (extend enum **additively** for new types; keep XOR per **row**, allow multiple rows)
- Putting warehouse permissions on PARENT grants
