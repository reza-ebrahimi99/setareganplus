# Assessment featured results — Phase 1

Admin foundation and schema-safe public publishing controls for featured assessment results.

## Fields added (`Assessment`)

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `publishFeaturedResults` | `Boolean` | `false` | Assessment-level gate for public featured display (independent of `isPublished`) |
| `featuredResultsLimit` | `Int` | `3` | Max results for auto-selection (validated **1–20**) |

Existing `AssessmentResult.isFeatured` is reused. Turning `publishFeaturedResults` off **does not** clear `isFeatured` flags.

## Migration

`prisma/migrations/20260722120000_assessment_publish_featured_results/migration.sql`

- Adds both columns with defaults
- Adds composite index for public featured queries

## Ranking algorithm (auto-select)

Within one assessment (org-scoped), eligible results:

- `deletedAt` null
- student `isActive`, not archived/deleted

Order:

1. `scaledScore` DESC, nulls last  
2. `rankSchool` ASC, nulls last  
3. `score` DESC, nulls last  
4. `id` ASC (deterministic)

Then: clear `isFeatured` for **this assessment only**, mark top N as featured (transaction).

## Privacy / publication rules

Public featured data is returned **only when all** are true:

- `assessment.isPublished`
- `assessment.publishFeaturedResults`
- `assessment.archivedAt` / `deletedAt` null
- `result.isFeatured` and `result.deletedAt` null
- student active / not archived / not deleted

Safe public fields: name, portrait URL, grade, ranks, scaled score, score (card metrics).  
**Never** subject percentages, notes, or full portal reports.  
Student public profile routes remain disabled.

## Admin workflow

1. Create/edit assessment with **Jalali** date picker (stored UTC Gregorian).  
2. Set `featuredResultsLimit` and optionally `publishFeaturedResults`.  
3. Import or add results.  
4. Run **انتخاب خودکار برترین‌ها** or feature/unfeature on results list.  
5. Publish assessment (`isPublished`) **and** enable `publishFeaturedResults` for public exposure.

## Files changed

- `prisma/schema.prisma`
- `prisma/migrations/20260722120000_assessment_publish_featured_results/migration.sql`
- `lib/assessment/featured-results.ts` (new)
- `lib/assessment/featured-constants.ts` (new — client-safe limits)
- `lib/assessment/assessments.ts`
- `lib/assessment/results.ts`
- `app/admin/(dashboard)/website/assessments/actions.ts`
- `app/admin/(dashboard)/website/assessments/[id]/page.tsx`
- `app/admin/(dashboard)/website/assessment-results/actions.ts`
- `app/admin/(dashboard)/website/assessment-results/page.tsx`
- `components/admin/website/AssessmentForm.tsx`
- `components/admin/website/AssessmentFeaturedControls.tsx` (new)
- `docs/assessment-featured-results-phase1.md` (this file)

## Out of scope (later phases)

- Nested «دستاوردها» nav  
- `/assessments/qalamchi` UI landing  
- Homepage featured strip mounting  
- `AssessmentSitting` / `AcademicYear` models  
- Public student profiles  
- Biweekly auto-scheduling  

## Manual test checklist

1. Create assessment with manually selected Jalali date.  
2. Edit the date and save.  
3. Import/add results.  
4. Set featured limit to 3 and save.  
5. Run auto-selection.  
6. Verify only ≤3 eligible results are featured.  
7. Manually unfeature one and feature another.  
8. Turn `publishFeaturedResults` off → public loader returns none for that assessment.  
9. Keep publishFeatured on but assessment draft → loader returns none.  
10. Publish assessment + publishFeatured → loader returns only safe featured fields.  
11. Archive assessment → public featured disappear.  
12. Verify another org cannot mutate/select features (org isolation).  
13. Verify mobile admin controls (date picker + featured section).  
