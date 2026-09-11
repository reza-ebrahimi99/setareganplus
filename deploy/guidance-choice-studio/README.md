# StarOS University Choice Studio

پرچم «استودیوی چیدمان انتخاب رشته» — تیم تخصصی انتخاب رشته مهندس رضا ابراهیمی.

This bundle extends Guidance Journey V2 Steps 13/14/16/17/18 and Counselor OS.
It does **not** deploy itself.

## What it adds

- Canonical XLSX import / export / official template (`exceljs` already in the app)
- Preview-before-commit, transactional replace, SUPERSEDED on published replacement
- Step 13/16 Choice Studio (Excel-first, manual entry remains secondary)
- Step 14 premium student review + existing `GuidanceChoiceFeedback`
- INITIAL vs FINAL diff
- Step 17 informed confirmation + existing hash/lock
- Step 18 operator Sanjesh mode (manual checklist, no Sanjesh API)
- Print headers/disclaimers for initial and final lists

## What it never touches

- Prisma schema / migrations (zero migration)
- `lib/payment/**`, Zibal, discounts
- `middleware.ts`
- `page.early.tsx`
- Steps 1–12 business logic
- OTP / SMS / Commerce / CRM / booking scheduling

## Apply on production

```bash
node deploy/guidance-choice-studio/pack-local.mjs
```

Copy the whole `deploy/guidance-choice-studio/` folder to the server, then:

```bash
cd /var/www/setareganplus && bash deploy/guidance-choice-studio/apply-production.sh
```

Rollback files are copied under `/var/backups/guidance-choice-studio-*/`.
