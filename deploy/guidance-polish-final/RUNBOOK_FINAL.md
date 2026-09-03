# RUNBOOK_FINAL — Guidance Polish production execution

**Scope:** Guidance Polish **only**.
**Counselor OS:** preserved in git, **NOT deployed**, **NOT migrated**, **NOT seeded**.
**Database:** untouched. No Prisma schema change, no migration, no seed.
**Payments:** untouched. No price, gateway, callback, or entitlement change.

| Field | Value |
|-------|-------|
| Source branch | `feat/admin-crm-ui-foundation` |
| Guidance Polish commits | `f040eca`, `da2a882`, `639c84b` |
| Counselor OS commits (preserve, do not deploy) | `76ee734`, `8c8a3cb`, `76f6095`, `ce8b1ab`, `212f5dc` |
| Production app root | `/var/www/setareganplus` |
| pm2 process | `setareganplus` |
| Backup root | `/var/backups/guidance-polish-<STAMP>` |

Execution is split into two isolated stages:

- **Stage A** — the 7 DONE fixes + the V1 half of issue 8. File transfer + CSS append. Fully prepared here.
- **Stage B** — issues 6, 8 (V2), 9. Production-only surgical patches against the V2 tree that does not exist in this repository. Presentation and copy only.

Stage A can ship alone. Stage B may be deferred to a later window; nothing in Stage A depends on it.

---

## 0. Session setup

Run every command from the production app root. Set the stamp once — the whole
runbook and the rollback path reuse it.

```bash
cd /var/www/setareganplus
export STAMP=$(date +%Y%m%d%H%M%S)
export BACKUP="/var/backups/guidance-polish-$STAMP"
export SRC="$HOME/guidance-polish-src"     # unpacked copy of the source branch
echo "backup=$BACKUP  src=$SRC"
```

**Never run on the production tree:** `git pull`, `git reset`, `git clean`,
`git checkout`, `git stash`, `prisma migrate deploy`, `prisma db push`, or any
seed script. The production tree is intentionally divergent; a `git status`
showing dirty or divergent state is expected and correct.

Get the source tree onto the box without touching production git:

```bash
# On the workstation, from the repo root:
#   git archive --format=tar feat/admin-crm-ui-foundation | gzip > guidance-polish-src.tgz
#   scp guidance-polish-src.tgz <prod>:~/
mkdir -p "$SRC" && tar xzf ~/guidance-polish-src.tgz -C "$SRC"
```

---

## 1. Backup

Back up every file Stage A or Stage B can touch, plus a database safety snapshot
of nothing more than the schema state record (read-only proof, no mutation).

```bash
mkdir -p "$BACKUP"

for f in \
  app/globals.css \
  components/guidance/GradesUploadForm.tsx \
  components/guidance/shared/GuidanceFileUploadField.tsx \
  components/guidance/platform/GuidanceUniversitiesHub.tsx \
  components/guidance/platform/GuidanceUniversitiesBrowser.tsx \
  components/guidance/steps/step2/InterestAssessmentStep.tsx \
  components/guidance/steps/step12/FinalApprovalStep.tsx ; do
  [ -f "$f" ] && install -D "$f" "$BACKUP/$f" && echo "backed up: $f"
done

# Whole-tree safety net for the source dirs Stage B will edit by hand.
tar czf "$BACKUP/pre-stage-b-source.tgz" \
  --ignore-failed-symlinks \
  components/guidance lib/guidance app/globals.css 2>/dev/null || true

# Proof of the pre-deploy migration state. READ ONLY.
npx prisma migrate status > "$BACKUP/prisma-migrate-status.before.txt" 2>&1 || true

ls -la "$BACKUP"
```

Record the printed `$BACKUP` path. Rollback in section 10 depends on it.

---

## 2. Stage A — application

### 2.1 Pre-flight: prove the payload carries no Counselor OS code

The applier enforces this itself, but run it first so a failure costs nothing.

```bash
cd "$SRC"
grep -RIl --include=*.tsx --include=*.ts \
  -e 'counselor-os' -e 'admin/counselor' -e 'counselor_os_foundation' \
  components/guidance/platform/GuidanceUniversitiesBrowser.tsx \
  components/guidance/platform/GuidanceUniversitiesHub.tsx \
  components/guidance/GradesUploadForm.tsx \
  components/guidance/shared/GuidanceFileUploadField.tsx \
  components/guidance/steps/step2/InterestAssessmentStep.tsx \
  components/guidance/steps/step12/FinalApprovalStep.tsx \
  && { echo "ABORT: Counselor OS reference in Stage A payload"; exit 1; } \
  || echo "OK: Stage A payload is Counselor-OS-free"
cd /var/www/setareganplus
```

`grep -l` exits non-zero when it matches nothing, so the `|| echo OK` branch is
the success path here.

### 2.2 Run the applier

```bash
bash "$SRC/deploy/guidance-polish-final/apply-guidance-polish-final-production.sh" \
  "$SRC" /var/www/setareganplus
```

It copies exactly six files, backs up each one it overwrites, and refuses to run
if any of them mentions Counselor OS:

```
components/guidance/platform/GuidanceUniversitiesBrowser.tsx   (new file)
components/guidance/platform/GuidanceUniversitiesHub.tsx
components/guidance/GradesUploadForm.tsx
components/guidance/shared/GuidanceFileUploadField.tsx
components/guidance/steps/step2/InterestAssessmentStep.tsx
components/guidance/steps/step12/FinalApprovalStep.tsx
```

It deliberately does **not** copy `app/globals.css` (section 5 merges it by hand)
and does **not** copy the Counselor OS collision files listed in section 9.2.

### 2.3 If a target file has diverged

Production may have edits these six files do not know about. Diff before trusting
the overwrite; the backup in `$BACKUP` is the pre-copy state.

```bash
for f in components/guidance/GradesUploadForm.tsx \
         components/guidance/shared/GuidanceFileUploadField.tsx \
         components/guidance/steps/step2/InterestAssessmentStep.tsx \
         components/guidance/steps/step12/FinalApprovalStep.tsx ; do
  echo "=== $f"; diff -u "$BACKUP/$f" "$f" || true
done
```

If a diff shows production logic being dropped, restore that one file from
`$BACKUP` and hand-apply the change described in
`GUIDANCE_POLISH_FINAL_REPORT.md`. The edits are small: Persian upload status
copy, one added class name, and class-name swaps in the two step files.

---

## 3. Production-only inspection for issues 6 / 8-V2 / 9

**Do not guess file paths.** This repository runs the V1 journey; production also
runs V2. Locate the real V2 sources first and write the findings down — Stage B
patches are applied against whatever these commands print, nothing else.

```bash
cd /var/www/setareganplus
mkdir -p "$BACKUP/inspection"
```

### 3.1 Issue 6 — START plan benefit

```bash
grep -RIn --include=*.ts --include=*.tsx \
  -e "'START'" -e '"START"' -e 'START:' \
  lib components app | tee "$BACKUP/inspection/issue6-start.txt"

grep -RIn --include=*.ts --include=*.tsx \
  -e 'SMART' -e 'SPECIALIZED' \
  lib/guidance | tee -a "$BACKUP/inspection/issue6-start.txt"

grep -RIn 'چیدمان اولیه انتخاب' lib components app \
  | tee "$BACKUP/inspection/issue6-existing-string.txt"
```

Expected outcome: one canonical catalog file defining `START` / `SMART` /
`SPECIALIZED` / `PREMIUM` with a `features` (or equivalent) array. Record its
exact path. If the benefit string already exists on START, issue 6 is already
satisfied — stop and mark it done.

### 3.2 Issue 8 (V2) — journey bottom navigation

```bash
ls -la components/guidance/journey-v2 2>/dev/null \
  | tee "$BACKUP/inspection/issue8-v2-tree.txt"

find components/guidance/journey-v2 -name '*Step*.tsx' 2>/dev/null \
  | tee -a "$BACKUP/inspection/issue8-v2-tree.txt"

# Which footer markup do the V2 steps actually use?
grep -RIn -e 'gpj-actions' -e 'StepActions' -e 'مرحله بعد' -e 'بخش قبلی' \
  components/guidance/journey-v2 2>/dev/null \
  | tee "$BACKUP/inspection/issue8-v2-footers.txt"
```

Record whether V2 steps already share a footer component or each render their own
buttons. That decides Option A vs Option B in section 4.2.

### 3.3 Issue 9 — real discount UI

```bash
# The real server-side discount surface. Presentation patch must call THIS.
grep -RIn --include=*.ts --include=*.tsx \
  -e 'discountCode' -e 'DiscountCode' -e 'applyGuidanceDiscount' \
  -e 'validateDiscount' -e 'کد تخفیف' \
  lib components app | tee "$BACKUP/inspection/issue9-discount.txt"

# The active V2 payment step.
find components -name 'PackagePaymentV2Step.tsx' -o -name '*PaymentStep*.tsx' \
  | tee "$BACKUP/inspection/issue9-payment-step.txt"

# Confirm the checkout action signature before touching the UI.
grep -RIn 'startGuidanceCheckout' lib app components \
  | tee -a "$BACKUP/inspection/issue9-discount.txt"
```

Record the exact server action name, its parameter shape, and its return type.
If production has **no** real discount action, **stop**: issue 9 becomes a
backend feature request, not a polish patch. Do not ship a client-side stand-in.

---

## 4. Stage B — surgical patch (presentation and copy only)

Apply each patch by hand against the paths recorded in section 3. Every patch
below is a copy or class-name change. If a patch cannot be made without touching
logic, abandon that patch and report it.

### 4.0 Invariants — verify before and after each patch

Nothing in Stage B may alter any of these:

- `priceRials` / any price field, on any tier
- `packagePaidAt`, `guidancePackageCode`
- Zibal gateway calls, callback routes, verification, or amounts
- entitlement gates and plan-access checks
- `currentStep`, `completedSteps`, `journeyVersion`, step guards, redirects
- validation rules, server actions, `formAction` targets, `onClick` handlers
- Prisma schema, migrations, seeds

```bash
# Snapshot the sensitive surface, then re-run after section 4.3 and diff.
grep -RIn -e 'priceRials' -e 'packagePaidAt' -e 'guidancePackageCode' \
  -e 'zibal' -e 'Zibal' lib app components \
  | sort > "$BACKUP/inspection/payment-surface.before.txt"
wc -l "$BACKUP/inspection/payment-surface.before.txt"
```

### 4.1 Issue 6 — START benefit «چیدمان اولیه انتخاب‌ها»

Reference: `deploy/production-package-start-benefit.patch.md`.

In the catalog file found in 3.1, append one string to the **START** tier's
features array:

```typescript
"چیدمان اولیه انتخاب‌ها",
```

Rules: append only. Do not reorder existing benefits, do not remove the string
from paid tiers if it is already there, do not rename any package code, do not
touch prices or checkout slugs.

```bash
# Verify: the string is on START and prices are untouched.
grep -n 'چیدمان اولیه انتخاب' <CATALOG_FILE_FROM_3.1>
diff <(grep -o 'priceRials[^,]*' <CATALOG_FILE_FROM_3.1>) \
     <(cd "$BACKUP" && grep -o 'priceRials[^,]*' <same file from tarball>) \
  && echo "OK: prices unchanged"
```

### 4.2 Issue 8 (V2) — journey bottom navigation presentation

Reference: `deploy/production-journey-v2-nav.patch.md`.

> **Correction to that document:** it names `.gpj-step-actions*`. The real class
> names shipped in Stage A are `.gpj-actions`, `.gpj-actions__continue`,
> `.gpj-actions__draft`, `.gpj-actions__back`, `.gpj-actions--inline`, and
> `.gpj-actions__group`. Use these. Block A of the CSS fragment (section 5)
> already defines them, so no additional CSS is needed for this patch.

**Option A (preferred)** — add class names to the existing V2 buttons:

- primary / forward button → `className="gpj-actions__continue"`
- back / previous button → `className="gpj-actions__back"`
- save-draft button → `className="gpj-actions__draft"`
- their wrapper, when it is not the standard footer → `className="gpj-actions gpj-actions--inline"`
- two adjacent secondary buttons → wrap in `<div className="gpj-actions__group">`

Change **only** the `className` attribute. Leave `onClick`, `formAction`,
`disabled`, `aria-busy`, `type`, and `href` exactly as they are. Delete inline
`style={{ position: "static", ... }}` hacks only where `.gpj-actions--inline`
replaces them.

Option B (the wrapper component in the patch doc) is a fallback for steps whose
markup is too tangled to class-name safely. Prefer A; B adds a file to review.

```bash
# Verify: no handler or action text changed in the V2 step files.
git --no-pager diff --stat -- components/guidance/journey-v2 2>/dev/null || \
  diff -ru "$BACKUP/pre-stage-b-source.tgz-extracted/components/guidance/journey-v2" \
           components/guidance/journey-v2 | grep -E '^\+' | \
  grep -Ev 'className|^\+\+\+' | \
  { ! grep -q . && echo "OK: className-only changes"; }
```

### 4.3 Issue 9 — real discount UI presentation

Reference: `deploy/production-discount-ui-merge.md`.

Preconditions, all mandatory:

1. Section 3.3 found a **real** server-side discount action.
2. The production checkout action already accepts a discount parameter.

If either is false, stop and report — do not ship UI for a backend that is not
there.

Permitted work:

- Restyle the existing production discount field using the `.gp-discount*` rules.
  Production already has these rules; confirm with
  `grep -c 'gp-discount' app/globals.css` and only copy them from
  `guidance-polish.css`'s source if the count is `0`.
- Improve labels, helper text, error and success copy, spacing, and the applied
  state, in Persian RTL.
- Keep the field wired to the **existing** production action and its real
  messages.

Forbidden:

- Any client-side price calculation, override, or display of a discounted amount
  the server did not return.
- Duplicating or reimplementing validation rules.
- Shipping `components/guidance/steps/step3/GuidanceDiscountCodeField.tsx` from
  this branch — its `handleApply` is a fake client-side stub. It is **not** part
  of the Stage A payload and must not be copied to production.

```bash
# Verify the payment surface is byte-identical to the pre-patch snapshot.
grep -RIn -e 'priceRials' -e 'packagePaidAt' -e 'guidancePackageCode' \
  -e 'zibal' -e 'Zibal' lib app components \
  | sort > "$BACKUP/inspection/payment-surface.after.txt"
diff "$BACKUP/inspection/payment-surface.before.txt" \
     "$BACKUP/inspection/payment-surface.after.txt" \
  && echo "OK: payment surface unchanged"
```

That `diff` must print nothing. Any output means a Stage B patch touched payment
logic — revert it.

---

## 5. CSS merge — `app/globals.css`

**Append only. Never replace `app/globals.css`.** Only the five scoped Guidance
blocks go in, and only at end of file.

The fragment is machine-generated from the source branch by
`deploy/guidance-polish-final/extract-css-blocks.mjs`, which verifies each block
is brace-balanced and contains no `cos-`, `counselor`, `guidance-counseling`, or
`BookingAdvisor` selector. Regenerate it on the source tree if you want to prove
that yourself:

```bash
node "$SRC/deploy/guidance-polish-final/extract-css-blocks.mjs"
```

| Block | Issue | Anchor comment | Key selectors |
|-------|-------|----------------|---------------|
| A | 8 (V1) | `Journey step footer — shared sizing` | `.gpj-actions__continue/__draft/__back`, `.gpj-actions--inline`, `.gpj-actions__group` |
| B | 1 | `Persian status line so the field never relies on native browser text.` | `.gp-upload-field__state`, `.chamber-deed__state` |
| C | 3 | `Universities hub — searchable index over the Discover catalog` | `.guidance-universities-hub__stats`, `.guidance-uni-browser*`, `.guidance-uni-card*` |
| D | 4 | `Discover majors explorer — mobile touch-target polish` | `.major-encyclopedia-explorer__search input`, `__filters button` |
| E | 2 + 10 | `Yellow guidance dashboard — hierarchy + touch-target polish` | `.guidance-command-hero__top`, `.guidance-command-account__logout`, `.guidance-command-checks`, `.guidance-command-grid` |

All five are additive overrides that must land **after** the existing base rules
for those selectors. End of file satisfies that ordering, which is why appending
is correct rather than merely convenient.

### 5.1 Duplicate detection — mandatory, before appending

Every count below must be `0`. These selectors exist nowhere but inside the five
blocks, so a non-zero count means the blocks were already merged.

```bash
cd /var/www/setareganplus
for sel in "GUIDANCE-POLISH BLOCK" "gpj-actions--inline" "gpj-actions__group" \
           "gp-upload-field__state" "chamber-deed__state" \
           "guidance-uni-browser" "guidance-universities-hub__stats" \
           "guidance-uni-card" ; do
  printf '%-36s %s\n' "$sel" "$(grep -c -- "$sel" app/globals.css)"
done
```

If any count is non-zero, **do not append**. Remove the previously merged block
between its `/* ===== GUIDANCE-POLISH BLOCK X ... */` and
`/* ===== END GUIDANCE-POLISH BLOCK X ===== */` sentinels first, or skip the CSS
merge entirely if the content is already current.

### 5.2 Append

```bash
cp app/globals.css "$BACKUP/globals.css.pre-merge"
printf '\n' >> app/globals.css
cat "$SRC/deploy/guidance-polish-final/guidance-polish.css" >> app/globals.css
```

### 5.3 Post-merge verification

```bash
# Sentinels present exactly once per block: 5 begin + 5 end = 10.
grep -c 'GUIDANCE-POLISH BLOCK' app/globals.css        # expect 10

# Braces balanced across the whole file.
awk '{o+=gsub(/{/,"{"); c+=gsub(/}/,"}")} END{print "open="o" close="c}' app/globals.css

# No Counselor OS CSS was dragged in by the merge.
grep -n -e 'cos-' -e 'guidance-counseling' \
  "$SRC/deploy/guidance-polish-final/guidance-polish.css" \
  && { echo "ABORT: Counselor OS CSS in fragment"; exit 1; } \
  || echo "OK: fragment is Counselor-OS-free"

# Only growth, no deletion.
echo "before=$(wc -l < "$BACKUP/globals.css.pre-merge") after=$(wc -l < app/globals.css)"
diff "$BACKUP/globals.css.pre-merge" app/globals.css | grep '^<' \
  && { echo "ABORT: existing CSS was removed"; exit 1; } \
  || echo "OK: append-only, nothing removed"
```

`open` must equal `close`. The last check must print `OK: append-only`.

---

## 6. Typecheck

```bash
cd /var/www/setareganplus
NODE_OPTIONS="--max-old-space-size=4096" npx tsc --noEmit
echo "tsc exit: $?"
```

Must exit `0`. If it fails, fix or roll back before building — do not build over
a type error.

---

## 7. Build

```bash
cd /var/www/setareganplus
NODE_OPTIONS="--max-old-space-size=4096" npm run build
echo "build exit: $?"
```

Must exit `0`. Then audit the route table in the build output:

```bash
# These must all be present.
for r in /discover/majors /discover/programs /portal/login /portal/logout \
         /portal/student/services/guidance ; do
  echo "expect present: $r"
done

# This must be ABSENT — proof Counselor OS did not ship.
echo "expect ABSENT: /admin/counselor"
```

If `/admin/counselor` appears in the build output, **stop and roll back**: a
Counselor OS file reached the tree.

---

## 8. Restart

```bash
pm2 restart setareganplus --update-env
pm2 status setareganplus
pm2 logs setareganplus --lines 50 --nostream
```

No new error lines. Process state `online`.

---

## 9. Counselor OS non-deployment proof

Run this **after** section 8 and paste the output into the deployment record.
Every check must pass. This is the audit trail proving Stage A and Stage B
shipped no Counselor OS file, migration, seed, or route.

### 9.1 Automated checks

```bash
cd /var/www/setareganplus
FAIL=0

echo "--- 1. No Counselor OS routes in the app tree"
[ -d app/admin/counselor ] && { echo "FAIL: app/admin/counselor exists"; FAIL=1; } \
  || echo "PASS: app/admin/counselor absent"

echo "--- 2. No Counselor OS library"
[ -d lib/counselor-os ] && { echo "FAIL: lib/counselor-os exists"; FAIL=1; } \
  || echo "PASS: lib/counselor-os absent"

echo "--- 3. No Counselor OS deploy assets"
[ -d deploy/counselor-os ] && { echo "FAIL: deploy/counselor-os exists"; FAIL=1; } \
  || echo "PASS: deploy/counselor-os absent"

echo "--- 4. Counselor OS migration NOT applied"
[ -d prisma/migrations/20260903120000_counselor_os_foundation ] \
  && { echo "FAIL: counselor migration folder present"; FAIL=1; } \
  || echo "PASS: counselor migration folder absent"

echo "--- 5. Migration state identical to pre-deploy"
npx prisma migrate status > "$BACKUP/prisma-migrate-status.after.txt" 2>&1 || true
diff "$BACKUP/prisma-migrate-status.before.txt" \
     "$BACKUP/prisma-migrate-status.after.txt" \
  && echo "PASS: no migration applied" \
  || { echo "FAIL: migration state changed"; FAIL=1; }

echo "--- 6. No Counselor OS symbols in the shipped Guidance files"
grep -RIn -e 'counselor-os' -e 'admin/counselor' -e 'counselingCard' \
  -e 'isCounselorHost' -e 'BookingAdvisor' \
  components/guidance/platform/GuidanceUniversitiesBrowser.tsx \
  components/guidance/platform/GuidanceUniversitiesHub.tsx \
  components/guidance/GradesUploadForm.tsx \
  components/guidance/shared/GuidanceFileUploadField.tsx \
  components/guidance/steps/step2/InterestAssessmentStep.tsx \
  components/guidance/steps/step12/FinalApprovalStep.tsx \
  && { echo "FAIL: Counselor OS symbol in payload"; FAIL=1; } \
  || echo "PASS: payload clean"

echo "--- 7. No Counselor OS CSS merged"
grep -c -e 'cos-hero' -e 'guidance-counseling' app/globals.css \
  | grep -qx '0' && echo "PASS: no counselor CSS" \
  || { echo "FAIL: counselor CSS present"; FAIL=1; }

echo "--- 8. No BookingAdvisor seeding ran"
grep -RIn 'BookingAdvisor' prisma/seed* scripts 2>/dev/null \
  && echo "NOTE: seed source references BookingAdvisor — confirm it was NOT executed" \
  || echo "PASS: no BookingAdvisor seed reference"

echo
[ "$FAIL" -eq 0 ] && echo "COUNSELOR OS NON-DEPLOYMENT: PROVEN" \
  || echo "COUNSELOR OS NON-DEPLOYMENT: FAILED — ROLL BACK"
```

### 9.2 Files structurally excluded from both stages

These carry Counselor OS work and are **never** transferred by this runbook.
None of them contains a Guidance Polish change this round, so excluding them
costs nothing.

| Excluded file | Counselor OS content |
|---------------|----------------------|
| `app/portal/student/services/guidance/page.tsx` | `view=appointments` branch, `counselingCard` |
| `components/guidance/office/GuidanceStudentDashboardPanels.tsx` | `counselingCard` prop |
| `middleware.ts` | `isCounselorHost` subdomain routing |
| `prisma/schema.prisma` | Counselor OS models |
| `prisma/migrations/20260903120000_counselor_os_foundation/**` | Counselor OS migration |
| `app/admin/counselor/**` | Counselor OS routes |
| `lib/counselor-os/**` | Counselor OS domain layer |
| `deploy/counselor-os/**` | Counselor OS installer |

The Stage A applier hard-codes a six-file allowlist and greps each file for
`counselor-os`, `admin/counselor`, and `counselor_os_foundation` before copying,
so none of the above can be transferred even by mistake.

### 9.3 Commands this runbook never issues

`prisma migrate dev`, `prisma migrate deploy`, `prisma db push`, `prisma db seed`,
any BookingAdvisor seed or link script, `bash deploy/counselor-os/*`, and any
command that creates, routes to, or enables `/admin/counselor` or
`moshaver.setareganplus.ir`.

---

## 10. Rollback

Single stamped backup directory, one restore path for everything.

### 10.1 CSS only (most likely rollback)

```bash
cd /var/www/setareganplus
cp "$BACKUP/globals.css.pre-merge" app/globals.css
NODE_OPTIONS="--max-old-space-size=4096" npm run build && pm2 restart setareganplus --update-env
```

### 10.2 Full Stage A rollback

```bash
cd /var/www/setareganplus
for f in \
  app/globals.css \
  components/guidance/GradesUploadForm.tsx \
  components/guidance/shared/GuidanceFileUploadField.tsx \
  components/guidance/platform/GuidanceUniversitiesHub.tsx \
  components/guidance/steps/step2/InterestAssessmentStep.tsx \
  components/guidance/steps/step12/FinalApprovalStep.tsx ; do
  [ -f "$BACKUP/$f" ] && install -D "$BACKUP/$f" "$f" && echo "restored: $f"
done

# GuidanceUniversitiesBrowser.tsx is new; it has no backup. Remove it.
rm -f components/guidance/platform/GuidanceUniversitiesBrowser.tsx

NODE_OPTIONS="--max-old-space-size=4096" npx tsc --noEmit
NODE_OPTIONS="--max-old-space-size=4096" npm run build
pm2 restart setareganplus --update-env
```

`GuidanceUniversitiesHub.tsx` imports the browser component, so restore the hub
**before** deleting the browser — the loop above already runs first.

### 10.3 Stage B rollback

```bash
cd /var/www/setareganplus
mkdir -p /tmp/stage-b-restore
tar xzf "$BACKUP/pre-stage-b-source.tgz" -C /tmp/stage-b-restore
# Restore only the files you patched in section 4, e.g.:
#   cp /tmp/stage-b-restore/<path> <path>
NODE_OPTIONS="--max-old-space-size=4096" npm run build && pm2 restart setareganplus --update-env
```

### 10.4 Database rollback

None required and none possible to need: no migration, no seed, no schema change
was executed. `prisma-migrate-status.before.txt` and `.after.txt` in `$BACKUP`
are identical by section 9.1 check 5.

---

## 11. Smoke tests

Full checklist: `deploy/guidance-polish-final/SMOKE_TEST.md`. Test at **360px**,
**390px**, and desktop. No horizontal scrolling at any width.

### 11.1 Regression guards — run first

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://setareganplus.ir/admin/counselor
# expect 404 or a redirect to login — never a counselor dashboard

curl -s -o /dev/null -w '%{http_code}\n' https://setareganplus.ir/portal/login
curl -s -o /dev/null -w '%{http_code}\n' https://setareganplus.ir/discover/majors
curl -s -o /dev/null -w '%{http_code}\n' https://setareganplus.ir/discover/programs
```

- [ ] `/admin/counselor` is not reachable as a working page
- [ ] Login lands on `/portal/student/services/guidance`, not `/ms`
- [ ] The yellow «ورود به مسیر انتخاب رشته» CTA opens the account's **real**
      current step, not step 1
- [ ] A paid account still shows its package active; no checkout amount changed

### 11.2 Stage A checks

1. **Upload (issue 1)** — step 1, step 5, and `/portal/student/services/guidance/grades`:
   no «Browse…» or «No file selected»; shows «انتخاب فایل» plus
   «فایلی انتخاب نشده است», then «فایل انتخاب‌شده: …» after picking a file.
   Upload still succeeds and the stored file is unchanged.
2. **Yellow dashboard (issue 2)** — cards equal height, checks render as a card
   grid, hierarchy readable at 360px, hero top row aligned.
3. **معرفی دانشگاه‌ها (issue 3)** — the dashboard card opens `?view=universities`;
   the search box filters real entries; the «همه / نظام‌های دانشگاهی / انواع دوره»
   tabs work; a nonsense query shows the empty state; every card opens a real
   Discover page.
4. **Majors (issue 4)** — `/discover/majors` search and exam-group filters are
   ≥44px tall, single column at 360px, and the major count is unchanged.
5. **Public entry (issue 5)** — header «ورود به پرتال» and «سامانه جامع انتخاب رشته»
   both go to `/portal/login?next=%2Fportal%2Fstudent%2Fservices%2Fguidance`.
7. **انواع دوره‌ها (issue 7)** — step 6 link and the universities-hub footer both
   open `/discover/programs`.
8. **Journey buttons, V1 (issue 8)** — every V1 step footer has the same height
   and radius; on mobile they stack full-width with the primary action on top;
   the disabled state during submit still works; step progression in the database
   is unchanged after the test.
10. **Logout (issue 10)** — «خروج از حساب» is visible at 360px and desktop and
    lands on `/guidance`, not `/ms`.

### 11.3 Stage B checks

6. **START plan (issue 6)** — the free plan card lists «چیدمان اولیه انتخاب‌ها»;
   SMART / SPECIALIZED / PREMIUM prices are unchanged; checkout amounts are
   unchanged.
8b. **Journey buttons, V2 (issue 8)** — same footer consistency across V2 steps;
   V2 progression unchanged in the database afterwards.
9. **Discount (issue 9)** — an invalid code shows the **real server** error; a
   valid code applies the **real server** amount; no code means full price; the
   payment callback and `guidancePackageCode` flow are unchanged.

### 11.4 Sign-off

Record in the deployment log: `$BACKUP` path, `tsc` exit code, `npm run build`
exit code, the section 9.1 result line, and which Stage B patches were applied
versus deferred.
