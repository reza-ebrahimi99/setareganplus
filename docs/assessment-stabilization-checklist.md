# Assessment Stabilization — Production Checklist

Stabilization sprint covering Student CMS, Achievement CMS, Assessment Center, and Academic Analytics Engine.

## Findings summary (pre-implementation)

### Critical
- Soft-deleted `AssessmentResult` retained a hard unique key and blocked recreate/import.
- Import header-row detection could disagree between inspect and parse.
- Import wrote row-by-row without an all-or-nothing transaction.

### High
- Import `subject:<id>` was not organization-validated.
- Import MIME/extension allowlist was client-only.
- Arabic-Indic digits were not normalized in import numbers.
- Prisma unique races could surface raw errors.
- Public assessment detail featured results omitted student visibility filters.
- Analytics archived-assessment exclusion was inconsistent.

### Medium / Optional
- Public student search included `parentName`.
- Student portrait cleanup did not check achievement media refs.
- Needs-attention thresholds were hardcoded.
- No shared server logger; no Vitest/Jest (tsx scripts only).
- Speculative indexes deferred pending EXPLAIN evidence.

## Migration procedure

1. Take a database backup (managed snapshot or `pg_dump`).
2. Deploy code that restores soft-deleted results on recreate/import **before** relying on new import traffic.
3. This sprint does **not** require a Prisma schema migration (no model renames; unique retained; restore path is application-level).
4. If a future partial unique index is desired:

```sql
-- FUTURE DESIGN ONLY — do not run without a dedicated migration review
-- ALTER TABLE assessment_results DROP CONSTRAINT ...;
-- CREATE UNIQUE INDEX ... WHERE "deletedAt" IS NULL;
```

## Deployment order

```bash
# 1) Backup DB
# 2) Pull release
git pull

# 3) Install if needed
npm ci

# 4) Generate client
npx prisma generate

# 5) Apply migrations (none new in this sprint; still run for safety)
npx prisma migrate deploy

# 6) Build
npm run build

# 7) Restart process manager
pm2 restart setareganplus
```

## Rollback guidance

1. Redeploy previous known-good release artifact.
2. Restore DB only if a later migration was applied (not required for this sprint).
3. Soft-deleted assessment results remain recoverable via restore/re-import path.

## Smoke tests

### Admin permission
- [ ] User without `website.manage` cannot open `/admin/website/assessments` (forbidden).
- [ ] User with `website.manage` can CRUD assessments/results.

### Cross-organization isolation
- [ ] Editing an assessment/result ID from another org returns not-found / no mutation.
- [ ] Import subject IDs from another org are rejected at validation.

### Public pages
- [ ] Unpublished assessment slug → 404.
- [ ] Archived/deleted/inactive student never appears in featured assessment results.
- [ ] `/students` search does not match `parentName`.

### Import
- [ ] Reject `.exe` / oversized file.
- [ ] Persian + Arabic digits parse correctly.
- [ ] Duplicate student rows in one file are flagged.
- [ ] Soft-deleted prior result is restored (not P2002).
- [ ] Transaction failure leaves zero new rows (force bad subject after validation bypass is impossible via UI).
- [ ] Double-click import does not run twice.

### Analytics
- [ ] `getDashboardSummary(orgId)` returns zeros (not NaN) on empty org.
- [ ] Archived assessments excluded from recent assessments / ranking headers.
- [ ] Unit scripts pass:

```bash
npm run test:assessment-analytics
npm run test:assessment-import
```

### Data-integrity checks (SQL)

```sql
-- Live duplicate results should be zero
SELECT "organizationId", "studentId", "assessmentId", COUNT(*)
FROM assessment_results
WHERE "deletedAt" IS NULL
GROUP BY 1,2,3
HAVING COUNT(*) > 1;

-- Orphan subject results (subject deleted) — investigate if any
SELECT asr.id
FROM assessment_subject_results asr
LEFT JOIN subjects s ON s.id = asr."subjectId"
WHERE s.id IS NULL;
```

## Security checks
- [ ] Server Actions use `session.organization.id` only.
- [ ] No FormData `organizationId` trusted.
- [ ] Logs lack OTP, tokens, full import rows, private notes.

## Performance notes (indexes intentionally not added)

| Query shape | Existing index | Decision |
|---|---|---|
| Student trend by `(org, studentId, deletedAt)` | `[organizationId, studentId, createdAt]` | Monitor; add `[organizationId, studentId, deletedAt]` only after EXPLAIN |
| Subject stats by `subjectId` + percentage | `[subjectId]` | Optional `[subjectId, percentage]` later |
| Needs-attention batch by student set | student + result indexes | Cap 300 students documented; no overlapping dual indexes |

## Future import history design (not implemented)

Store optional `AssessmentImportBatch` with: organizationId, assessmentId, userId, checksum, counts, createdAt. Link errors by batchId. Keep current API unchanged.

## Manual mobile/RTL QA
- [ ] Import wizard mapping selects usable on ~375px width.
- [ ] Results admin table scrolls horizontally without breaking layout.
- [ ] Long Persian titles wrap; no LTR icon flip issues on CTAs.
