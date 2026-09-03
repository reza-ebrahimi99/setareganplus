# Guidance Polish Final — production deploy

**No database migration. No Counselor OS activation.**

> These are the notes behind the runbook. For the ordered, copy-pasteable
> command sheet use [`RUNBOOK_FINAL.md`](./RUNBOOK_FINAL.md) instead.

## 0. Preconditions

```bash
cd /var/www/setareganplus
git status              # expect divergent/dirty production tree — that is normal
```

Do **not** run `git pull`, `git reset`, `git clean`, or `git checkout`.

## 1. Backup

```bash
STAMP=$(date +%Y%m%d%H%M%S)
mkdir -p /var/backups/guidance-polish-$STAMP
for f in \
  app/globals.css \
  components/guidance/GradesUploadForm.tsx \
  components/guidance/shared/GuidanceFileUploadField.tsx \
  components/guidance/platform/GuidanceUniversitiesHub.tsx \
  components/guidance/steps/step2/InterestAssessmentStep.tsx \
  components/guidance/steps/step12/FinalApprovalStep.tsx ; do
  [ -f "$f" ] && install -D "$f" "/var/backups/guidance-polish-$STAMP/$f"
done
```

## 2. Transfer whole-file assets

Only these — verify each against production before overwriting:

```
components/guidance/platform/GuidanceUniversitiesBrowser.tsx   (new file)
components/guidance/platform/GuidanceUniversitiesHub.tsx
components/guidance/GradesUploadForm.tsx
components/guidance/shared/GuidanceFileUploadField.tsx
components/guidance/steps/step2/InterestAssessmentStep.tsx
components/guidance/steps/step12/FinalApprovalStep.tsx
```

If a production file has diverged, apply the change by hand — the edits are small
and described in `../../GUIDANCE_POLISH_FINAL_REPORT.md`.

## 3. Surgical CSS merge — `app/globals.css`

**Append only.** Do not replace the file. The five blocks are pre-extracted and
verified in `guidance-polish.css` (regenerate with
`node deploy/guidance-polish-final/extract-css-blocks.mjs`), so the merge is
`cat guidance-polish.css >> app/globals.css` after the duplicate check in
`RUNBOOK_FINAL.md` section 5.1. The blocks are:

| Anchor comment | Purpose |
|----------------|---------|
| `Journey step footer — shared sizing…` | Issue 8 (V1) button consistency |
| `Persian status line so the field never relies on native browser text.` | Issue 1 |
| `Yellow guidance dashboard — hierarchy + touch-target polish` | Issues 2, 10 |
| `Universities hub — searchable index over the Discover catalog` | Issue 3 |
| `Discover majors explorer — mobile touch-target polish` | Issue 4 |

**Do NOT copy** the `cos-*` or `guidance-counseling-*` blocks — those belong to Counselor OS.

Before appending, grep production for each class to avoid duplicate definitions:

```bash
grep -n "guidance-uni-browser\|gpj-actions--inline\|gp-upload-field__state" app/globals.css
```

## 4. Production-only V2 patches (issues 6, 8-V2, 9)

Apply by hand on the production V2 tree:

- `deploy/production-package-start-benefit.patch.md` — issue 6
- `deploy/production-journey-v2-nav.patch.md` — issue 8 (V2 steps)
- `deploy/production-discount-ui-merge.md` — issue 9

## 5. Build and restart

```bash
export NODE_OPTIONS="--max-old-space-size=4096"
npx tsc --noEmit
npm run build
pm2 restart setareganplus
```

## 6. Verify

Run `SMOKE_TEST.md`. Confirm the yellow CTA still lands on the student's real step.
