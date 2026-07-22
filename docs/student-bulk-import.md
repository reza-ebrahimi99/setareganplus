# Student bulk Excel/CSV import

## Architecture findings

### Models

- **Student**: CMS profile (name, grade, major, slug, `parentName` free text). **No mobile field.** Soft-delete via `deletedAt`.
- **StudentGuardian**: org-scoped guardian identity with `mobile` + `normalizedMobile` (`@@unique([organizationId, normalizedMobile])`).
- **StudentGuardianRelation**: many-to-many student↔guardian with `GuardianRelationshipType`.
- **User**: global OTP identity via `normalizedMobile` (`@unique`).
- **PortalAccountLink**: XOR link User → Student **or** Guardian for portal login.
- Portal login (`/portal/login`) matches `User.normalizedMobile` through an active `PortalAccountLink` — same canonical mobile as `normalizeIranianMobile` (`09xxxxxxxxx`).

### Step-2 file bug (root cause)

The file `<input>` lived only inside `phase === "upload"`. Leaving step 1 unmounted the input and discarded the browser `FileList`. Steps 2+ called `withFile()` again and showed «لطفاً فایل را انتخاب کنید».

**Fix:** parse once in step 1 into a serializable `StudentImportSession` (headers + raw cell rows per sheet). Later steps POST `session` JSON — never the `File`.

### Schema decision

**No Prisma migration.** Student mobile is not duplicated on `Student`. When portal permission is present, student mobile creates/reuses `User` + `PortalAccountLink` (STUDENT). Guardian mobile uses `StudentGuardian` + relation + GUARDIAN portal link.

### Permissions (RBAC)

| Operation | Permission |
|-----------|------------|
| Import page / student create-update | `website.manage` |
| Guardian create/link + portal access | also requires `students.portal.manage` |

If the admin lacks portal permission, students still import; guardian/portal work is skipped with explicit statuses.

## Supported columns

Required: نام، نام خانوادگی، پایه  
Recommended: اسلاگ، شناسه قلم‌چی  
Optional: رشته، موبایل دانش‌آموز، …

Mobile formats accepted via `normalizeIranianMobile`: `0912…`, `912…`, `+98912…`, `0098912…`, Persian/Arabic digits.

## Duplicate / sibling policy

- Student duplicates: live **slug** only (default skip; update mode with confirmation).
- Guardian duplicates: org **normalizedMobile**; siblings reuse one guardian.
- Existing guardian name conflicts: keep existing profile + warning (no silent overwrite).
- Portal links: create if missing; reactivate soft-deleted; do not send OTP/SMS during import.

## Files

- `lib/website/student-import-shared.ts`
- `lib/website/student-import.ts`
- `lib/website/student-import-errors.ts`
- `lib/portal/admin/access.ts` (shared portal/guardian domain helpers)
- `app/admin/(dashboard)/website/students/import/actions.ts`
- `app/admin/(dashboard)/website/students/import/page.tsx`
- `components/admin/website/StudentImportWizard.tsx`
- `app/admin/(dashboard)/website/students/page.tsx`
- `app/admin/(dashboard)/website/guardians/actions.ts` (uses shared portal helper)
- `docs/student-bulk-import.md`

## Migrations

None.

## Manual test checklist

1. Template download opens with mobile/guardian columns + راهنما  
2. Step 1 → step 2 does **not** ask for file again  
3. Back to mapping preserves session  
4. New file clears previous session  
5. Student without mobiles  
6. Student mobile → portal link (with portal permission)  
7. New guardian + link + portal  
8. Existing guardian reused by mobile  
9. Two siblings, same guardian mobile  
10. Invalid student/guardian mobile  
11. Persian digits / +98 formats  
12. Duplicate slug skip / update mode  
13. Existing relation / existing portal  
14. Tenant isolation  
15. RBAC: website.manage without portal.manage skips guardian/portal  
16. Report download statuses  

## Known limitations

- Without `students.portal.manage`, student mobile is not persisted (no `Student.mobile` column).
- Update mode does not rewrite existing guardian relations or portal identities silently.
- Soft-deleted students are not restored.
- No persistent import-history table (downloadable report only).
