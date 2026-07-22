# Student bulk Excel/CSV import

## Architecture findings

### Student model (schema-aligned)

`Student` fields used by import:

- Required: `firstName`, `lastName`, `fullName`, `gradeId`, `slug`, `organizationId`
- Optional: `majorId`, `parentName`, `schoolYear`, `biography`, `isActive`, `isFeatured`, `displayOrder`
- Soft delete / archive: `deletedAt`, `archivedAt` (live rows = `deletedAt: null`)
- Unique key: `@@unique([organizationId, slug])` (includes soft-deleted rows)

**Not on Student (intentionally omitted from template):**

- national code, student code, birth date, gender, student mobile
- structured guardian FKs / portal accounts

`parentName` is free text on the student record, not a `Guardian` link.

### Guardian / portal

Guardian creation and portal linking live under `students.portal.manage` and use `normalizedMobile` as the canonical guardian key. Importing guardians safely requires that separate permission and workflow.

**This phase imports students only.** Guardian columns are out of the template; guardian import is deferred to a later phase.

### Duplicate policy

Deterministic match key among live students (`deletedAt: null`):

1. **slug** (normalized) — only hard match
2. Name + grade alone is **never** a destructive overwrite; at most a warning while still creating a new row (unless an explicit slug matches)

Modes:

| Mode | Behavior |
|------|----------|
| `create_only` (default) | Create new rows; skip live slug matches |
| `create_and_update` | Create new; update live slug matches (requires UI confirmation) |

Soft-deleted students are not restored by import. Slug allocation checks the DB unique constraint (including soft-deleted) and suffixes when needed.

### Reused modules

- ExcelJS patterns from assessment import (`lib/assessment/import.ts`)
- Wizard UX pattern from `AssessmentImportWizard`
- `toLatinDigits` for Persian/Arabic digits
- `unique`-style slug allocation aligned with `students/actions.ts` / `student-slug.ts`
- Grade/major defaults: `ensureDefaultStudentGrades`, `ensureDefaultStudentMajors`, `gradeRequiresMajor`
- RBAC: `requirePermission("website.manage")` (same as single-student admin)
- Immediate downloadable Excel report (no new Prisma model / CRM `CrmLeadImportReport` reuse)

### Missing pieces (by design)

- Shared generic Import Wizard package (none exists; student wizard is a sibling of assessment)
- National ID / mobile on Student
- Guardian bulk link
- Persistent import audit table (MVP uses downloadable report)

## Supported columns

| Column (FA) | Required | Maps to |
|-------------|----------|---------|
| نام | yes | `firstName` |
| نام خانوادگی | yes | `lastName` |
| پایه | yes | grade name or slug |
| رشته | grades 10–12 | major name or slug |
| اسلاگ | recommended | `slug` |
| نام ولی | no | `parentName` (text only) |
| سال تحصیلی | no | `schoolYear` |
| توضیحات | no | `biography` |
| وضعیت | no | `isActive` (`فعال` / `غیرفعال`) |
| ویژه | no | `isFeatured` (`بله` / `خیر`) |
| ترتیب نمایش | no | `displayOrder` |

## Validation rules

- Trim + Persian/Arabic digit normalization on names
- Grade must exist, be active, and not archived in the same organization
- Majors required for grades 10–12 (`gradeRequiresMajor`)
- Status / featured enums validated when provided
- In-file duplicate slugs rejected
- Organization ID always from session — never from Excel
- Max file size: 5 MB; max rows: 5000
- Extensions: `.xlsx`, `.csv` (legacy `.xls` not supported)

## Transaction strategy

- Chunked Prisma `$transaction` writes (50 rows)
- Grades/majors/duplicate keys preloaded before validation
- Invalid rows never written; valid create/update rows in the selected mode are written
- Partial chunk failure aborts that transaction (Prisma)

## Security

- `website.manage` on all inspect/validate/execute/template/report actions
- Tenant isolation via `session.organization.id`
- Untrusted file bytes parsed only through ExcelJS / CSV reader
- No public routes for private student payloads
- Server logs use module/action context; avoid logging full PII payloads

## Files changed

- `lib/website/student-import-shared.ts` (new)
- `lib/website/student-import-errors.ts` (new)
- `lib/website/student-import.ts` (new)
- `app/admin/(dashboard)/website/students/import/actions.ts` (new)
- `app/admin/(dashboard)/website/students/import/page.tsx` (new)
- `components/admin/website/StudentImportWizard.tsx` (new)
- `app/admin/(dashboard)/website/students/page.tsx` (button)
- `docs/student-bulk-import.md` (this file)

## Migrations

None. Schema already supports all imported fields.

## Manual test checklist

1. Download Excel template (sample + «راهنما»)
2. Import 3 valid students
3. Import a row with missing surname → Persian error
4. Import an unknown grade → «پایه واردشده در سامانه تعریف نشده است.»
5. Import invalid status value → وضعیت error
6. Import Persian digits in names → normalized
7. Import duplicate slug (create_only) → skipped
8. Import same slug with update mode + confirmation → updated
9. Verify default duplicate behavior is skip
10. Attempt update mode without confirmation → blocked
11. Verify no cross-tenant grade/student access
12. Verify unauthorized user cannot open `/admin/website/students/import`
13. Guardian columns absent; no portal accounts created
14. Download invalid-row report
15. Test wizard on mobile width
16. Test a file with ≥500 rows (under 5000)
17. Verify single-student creation at `/admin/website/students/new` still works

## Remaining limitations

- No national code / mobile / birth date / gender columns (not on Student)
- No guardian or portal account import
- No persistent import history table
- Name+grade overlap only warns; does not merge
- Soft-deleted students are not restored
