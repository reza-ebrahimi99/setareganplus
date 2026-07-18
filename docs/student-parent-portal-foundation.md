# Student & Parent Portal Foundation

Secure, organization-scoped foundation for Student Portal and Parent Portal. Reuses existing OTP authentication. Access is granted only through explicit `PortalAccountLink` records — never by matching free-text `parentName` or phone fields alone.

## Domain model

| Model | Purpose |
| --- | --- |
| `StudentGuardian` | Parent / legal guardian / authorized family member |
| `StudentGuardianRelation` | Links a guardian to one or more students with visibility flags |
| `PortalAccountLink` | Links an authenticated `User` to exactly one `Student` **or** one `StudentGuardian` (XOR) |

```
OTP Login
  ↓
User
  ↓
PortalAccountLink
  ↓
Student or Guardian
  ↓
Authorized Student Context
  ↓
Portal Dashboard
```

### XOR constraint

`PortalAccountLink` must have exactly one target:

- `accountType = STUDENT` → `studentId` set, `guardianId` null
- `accountType = GUARDIAN` → `guardianId` set, `studentId` null

Enforced by SQL `CHECK` and admin/service code. Prisma cannot express XOR on optional FKs alone.

## Authentication flow

1. User opens `/portal/login` and enters mobile.
2. Existing OTP (`OtpPurpose.LOGIN`) verifies ownership via SMS.ir.
3. Server resolves active `PortalAccountLink` for that user + organization membership.
4. Opaque portal session cookie (`staros_portal_session`) is created (same `AdminSession` table, separate cookie from staff).
5. Optional active-link cookie (`staros_portal_active_link`) selects among multiple links; **every request re-validates links from the database**.

If no active portal link exists, show:

> برای این شماره همراه دسترسی پرتال تعریف نشده است. لطفاً با مدرسه تماس بگیرید.

Do not reveal whether a student or guardian row exists.

## Authorization flow

Server-only layer: `lib/portal/auth/`

1. Authenticate portal session.
2. Resolve organization from trusted membership on the session.
3. Load active `PortalAccountLink` rows for that org + user.
4. Build `authorizedStudents` from student link or guardian relations.
5. Every private loader calls `assertStudentVisible` / require helpers.

Never trust client-provided `studentId`, `organizationId`, `guardianId`, or `accountType` for authorization.

### Guardian visibility flags

| Flag | Effect |
| --- | --- |
| `canViewAcademicData` | Assessments / analytics |
| `canViewAchievements` | Achievement list |
| `canViewCertificates` | Certificate media URLs |
| `canReceiveNotifications` | Reserved for future notifications |

## Account selector

`/portal/select-account` when the user has multiple active links (student + guardian, or multiple student links). Selection is persisted in a server-managed cookie and re-checked against DB on each request.

## Student / assessment visibility (portal)

For assessments in the portal:

- Same organization as session
- Result belongs to authorized student
- Result not deleted
- Assessment not deleted or archived
- **Does not require** public website `isPublished` (portal is private authenticated access)
- Excludes private administrative notes

## Achievement visibility (portal)

- Org-scoped, student-linked
- Not deleted / archived
- Currently requires `isPublished` (website publication flag) so unpublished CMS drafts stay admin-only
- Certificate URLs only when `canViewCertificates` is true
- Public website DTOs remain separate from portal DTOs

## Roles & permissions

| Permission | Use |
| --- | --- |
| `portal.student.access` | Role `STUDENT` |
| `portal.guardian.access` | Role `PARENT` |
| `students.portal.manage` | Admin CRUD for guardians + portal links |

Portal access is **not** granted via `website.manage`.

## Admin onboarding

1. Ensure student exists in CMS (`/admin/website/students`).
2. Create guardian at `/admin/website/guardians` and link students with relationship + flags.
3. Grant portal access at `/admin/website/portal-access` (mobile → Student or Guardian).
4. User logs in at `/portal/login` with OTP.

Optional careful backfill (dry-run default):

```bash
npx tsx --env-file=.env scripts/portal-link-backfill.ts --org=<orgId> --mobile=09... --student=<id>
npx tsx --env-file=.env scripts/portal-link-backfill.ts --org=<orgId> --mobile=09... --guardian=<id> --confirm
```

## Revocation procedure

1. Admin opens `/admin/website/portal-access`.
2. Deactivate or soft-delete (لغو دسترسی) the link.
3. Next portal request rebuilds context from DB → access denied. No wait for JWT expiry (sessions are opaque DB rows; authorization is link-driven).

## Routes

### Admin

- `/admin/website/guardians`
- `/admin/website/guardians/[id]`
- `/admin/website/portal-access`

### Portal

- `/portal`, `/portal/login`, `/portal/logout`, `/portal/select-account`
- Student: `/portal/student`, `/profile`, `/assessments`, `/achievements`
- Parent: `/portal/parent`, `/students`, `/students/[studentId]`, assessments, achievements

## Security checklist

- [x] No IDOR across students (assert on `authorizedStudents`)
- [x] No cross-organization leakage (links filtered by session org)
- [x] No private data on public `/students/[slug]` from this sprint
- [x] No client-trusted organization IDs for authz
- [x] No automatic access from `parentName` / name matching
- [x] Portal permissions separate from `website.manage`
- [x] Access revocation effective on next resolve
- [x] Session does not embed student arrays; DB re-check each request
- [x] Guardian relation flags enforced server-side
- [x] `nationalId` not exposed in portal DTOs

## Production deployment

```bash
npx prisma migrate deploy
npx prisma generate
npm run build
npm run start
```

Focused tests:

```bash
npx tsx scripts/portal-auth-unit-tests.ts
npm run test:assessment-analytics
```

## Smoke tests

1. Staff with `students.portal.manage` can create guardian + portal link.
2. Linked student OTP → `/portal/student` dashboard (read-only).
3. Linked guardian OTP → student selector → per-student views.
4. Unlinked mobile → safe Persian no-access message.
5. After revoke link → next request denied.
6. Guardian with `canViewAcademicData=false` cannot load assessments.
7. Public student pages unchanged; no national IDs in portal UI.
