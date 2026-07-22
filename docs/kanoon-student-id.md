# Kanoon student ID (شناسه قلم‌چی)

## Purpose

Stable external identifier for matching Kanoon/Qalamchi assessment Excel rows to `Student` records.

## Schema

- Field: `Student.kanoonStudentId` (`String?`)
- Uniqueness: `@@unique([organizationId, kanoonStudentId])` (nullable; multiple NULLs allowed in PostgreSQL)
- Migration: `prisma/migrations/20260722140000_student_kanoon_student_id`

## Normalization

`lib/website/kanoon-student-id.ts`:

- Trim whitespace
- Persian/Arabic digits → Latin
- Digits only when non-empty
- Preserve leading zeros (stored as string)
- Empty → `null`

## Assessment import matching order

1. **kanoonStudentId** (Counter / شناسه قلم‌چی / …)
2. **firstName + lastName + assessment.gradeId**
3. Fallback: **slug**, then org-wide **fullName**

Preview columns: Student, Kanoon ID, Matched By (`تطبیق با شناسه قلم‌چی` / `نام + پایه` / `اسلاگ` / `نام` / `یافت نشد`).

## Student admin & bulk import

- Create/edit form field «شناسه قلم‌چی»
- Bulk template column «شناسه قلم‌چی» (+ aliases شمارنده، کد قلم‌چی، Counter, Kanoon ID)
- Duplicate checks: in-file and org-scoped
