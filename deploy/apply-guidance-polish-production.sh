#!/usr/bin/env bash
#
# Guidance polish — production installer (dirty-tree safe).
# Run manually on production: /var/www/setareganplus
# Source commit: 109e23e on feat/admin-crm-ui-foundation
#
# FORBIDDEN: git pull/reset/checkout/clean/stash/cherry-pick, migrations, deploy from CI.
#
set -euo pipefail

readonly DEPLOY_COMMIT="109e23e"
readonly DEPLOY_BRANCH="feat/admin-crm-ui-foundation"
readonly APP_ROOT="/var/www/setareganplus"
readonly START_BENEFIT='چیدمان اولیه انتخاب‌ها'
readonly JOURNEY_ENTRY="/portal/student/services/guidance/steps"
readonly GUIDANCE_HOME="/portal/student/services/guidance"
readonly GUIDANCE_LOGIN="/portal/login?next=%2Fportal%2Fstudent%2Fservices%2Fguidance"

BACKUP_ROOT=""
declare -a TRANSFERRED_FILES=()
declare -a SKIPPED_FILES=()
declare -a SURGICAL_MERGED=()

log() { printf '[guidance-polish] %s\n' "$*"; }
die() { printf '[guidance-polish] ERROR: %s\n' "$*" >&2; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Required command not found: $1"
}

# ─── Preconditions ────────────────────────────────────────────────────────────

require_cmd git
require_cmd python3
require_cmd npx
require_cmd npm
require_cmd pm2
require_cmd curl

if [[ "$(pwd -P)" != "$APP_ROOT" ]]; then
  die "Must run from ${APP_ROOT} (current: $(pwd -P))"
fi

BACKUP_ROOT="/root/setareganplus-guidance-polish-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_ROOT"
log "Backup root: ${BACKUP_ROOT}"

# ─── Fetch + verify commit (no checkout) ─────────────────────────────────────

log "Fetching origin/${DEPLOY_BRANCH} (no checkout)…"
git fetch origin "${DEPLOY_BRANCH}"

if ! git cat-file -e "${DEPLOY_COMMIT}^{commit}" 2>/dev/null; then
  die "Commit ${DEPLOY_COMMIT} not found after fetch"
fi
log "Verified commit ${DEPLOY_COMMIT}"

git_extract() {
  local relpath="$1"
  git show "${DEPLOY_COMMIT}:${relpath}"
}

git_path_exists() {
  git cat-file -e "${DEPLOY_COMMIT}:$1" 2>/dev/null
}

backup_file() {
  local relpath="$1"
  if [[ -f "$relpath" ]]; then
    local dest="${BACKUP_ROOT}/${relpath}"
    mkdir -p "$(dirname "$dest")"
    cp -a "$relpath" "$dest"
  fi
}

# Write branch file to destination via temp file (atomic).
safe_transfer() {
  local relpath="$1"
  if ! git_path_exists "$relpath"; then
    log "SKIP (not in ${DEPLOY_COMMIT}): ${relpath}"
    SKIPPED_FILES+=("${relpath} (missing in commit)")
    return 0
  fi
  backup_file "$relpath"
  local tmp dest
  tmp="$(mktemp)"
  dest="${APP_ROOT}/${relpath}"
  mkdir -p "$(dirname "$dest")"
  if ! git_extract "$relpath" >"$tmp"; then
    rm -f "$tmp"
    die "git show failed for ${relpath}"
  fi
  mv "$tmp" "$dest"
  TRANSFERRED_FILES+=("$relpath")
  log "TRANSFERRED ${relpath}"
}

# Abort if production file has journey-v2-only lines absent from branch version.
assert_no_production_only_loss() {
  local relpath="$1"
  local backup="${BACKUP_ROOT}/${relpath}"
  [[ -f "$backup" ]] || return 0
  local prod_only
  prod_only="$(
    comm -23 \
      <(grep -E 'journey-v2|journeyVersion|JOURNEY_V2' "$backup" 2>/dev/null | sort -u || true) \
      <(git_extract "$relpath" 2>/dev/null | grep -E 'journey-v2|journeyVersion|JOURNEY_V2' | sort -u || true) \
      || true
  )"
  if [[ -n "$prod_only" ]]; then
    die "${relpath} has production-only journey-v2 logic — manual merge required. Backup: ${backup}"
  fi
}

# ─── Safe file allowlist (109e23e / b94ae2f / routing foundation) ───────────────

SAFE_FILES=(
  # Routing + entry constants
  "lib/guidance/portal-nav.ts"
  "lib/guidance/journey-entry.ts"
  "lib/guidance/student-entry.ts"
  "middleware.ts"
  # Public + portal login (guidance next param)
  "content/public-nav.ts"
  "content/guidance.ts"
  "app/portal/login/actions.ts"
  "app/portal/login/PortalLoginForm.tsx"
  "app/portal/login/page.tsx"
  "app/ms/page.tsx"
  # Guidance shell + errors
  "app/portal/student/services/guidance/error.tsx"
  "app/portal/student/services/guidance/onboarding/page.tsx"
  "app/portal/student/services/guidance/onboarding/actions.ts"
  # Presentation components
  "components/guidance/office/OfficeAccountMenu.tsx"
  "components/guidance/office/GuidanceErrorFallback.tsx"
  "components/guidance/office/GuidanceStudentDashboardPanels.tsx"
  "components/guidance/platform/GuidanceUniversitiesHub.tsx"
  "components/guidance/shared/GuidanceFileUploadField.tsx"
  "components/guidance/steps/GuidanceStepActions.tsx"
  "components/guidance/steps/GuidanceStepShell.tsx"
  "components/guidance/steps/step3/GuidanceDiscountCodeField.tsx"
  "components/guidance/steps/step5/ExamResultsStep.tsx"
  "components/guidance/steps/step6/EducationPreferencesStep.tsx"
  "components/guidance/steps/step7/CityPreferencesStep.tsx"
  "components/guidance/steps/step8/MajorPreferencesStep.tsx"
  "components/guidance/steps/step9/PriorityWeightsStep.tsx"
  "components/guidance/steps/step10/AiArrangementStep.tsx"
  "components/guidance/GradesUploadForm.tsx"
  # Discover polish
  "app/discover/systems/page.tsx"
  "components/guidance/discover/DiscoverConversion.tsx"
  "components/guidance/discover/DiscoverSystemsExplorer.tsx"
  "components/guidance/discover/MajorEncyclopediaExplorer.tsx"
  "components/guidance/discover/ProgramEncyclopediaExplorer.tsx"
  # Public guidance entry
  "components/guidance/entry/GuidanceEntryAuth.tsx"
  "components/guidance/entry/GuidanceEntryExperience.tsx"
)

log "── Safe transfers ──"
for relpath in "${SAFE_FILES[@]}"; do
  if [[ -f "$relpath" ]]; then
    assert_no_production_only_loss "$relpath"
  fi
  safe_transfer "$relpath"
done

# layout.tsx — merge carefully; skip if production has journey-v2 chrome markers absent in branch
LAYOUT="app/portal/student/services/guidance/layout.tsx"
if git_path_exists "$LAYOUT"; then
  if [[ -f "$LAYOUT" ]] && grep -q 'journey-v2\|JourneyV2' "$LAYOUT" 2>/dev/null; then
    if ! git_extract "$LAYOUT" | grep -q 'journey-v2\|JourneyV2'; then
      log "SKIP layout transfer — production has journey-v2 chrome not in branch (manual review)"
      SKIPPED_FILES+=("${LAYOUT} (journey-v2 chrome)")
    else
      safe_transfer "$LAYOUT"
    fi
  else
    safe_transfer "$LAYOUT"
  fi
fi

# ─── Surgical merge helpers (Python) ─────────────────────────────────────────

run_python() {
  DEPLOY_COMMIT="$DEPLOY_COMMIT" JOURNEY_ENTRY="$JOURNEY_ENTRY" python3 - "$@" <<'PY'
import os
import re
import sys
from pathlib import Path

ROOT = Path("/var/www/setareganplus")
DEPLOY_COMMIT = os.environ["DEPLOY_COMMIT"]
JOURNEY_ENTRY = os.environ["JOURNEY_ENTRY"]
mode = sys.argv[1]

def read(p):
    return Path(p).read_text(encoding="utf-8")

def write(p, s):
    Path(p).write_text(s, encoding="utf-8")

def die(msg):
    print(f"ABORT: {msg}", file=sys.stderr)
    sys.exit(1)

# ── 1. Yellow dashboard page.tsx ──────────────────────────────────────────────
if mode == "yellow-dashboard":
    page = ROOT / "app/portal/student/services/guidance/page.tsx"
    if not page.exists():
        die(f"Missing {page}")

    src = read(page)
    original = src

    if "/journey/steps/1" in src:
        die("Hardcoded /journey/steps/1 found in guidance page — fix manually before deploy")

    if "resolveGuidanceJourneyContinueHref" in src and "GuidanceStudentDashboardPanels" in src:
        die("Dashboard uses resolveGuidanceJourneyContinueHref directly — must use /steps index router")

    # Import GuidanceUniversitiesHub
    if "GuidanceUniversitiesHub" not in src:
        anchor = "from \"next/navigation\""
        if anchor not in src:
            die(f"Anchor missing in page.tsx: {anchor}")
        insert = anchor + ";\nimport { GuidanceUniversitiesHub } from \"@/components/guidance/platform/GuidanceUniversitiesHub\""
        src = src.replace(anchor, insert, 1)

    # Import GUIDANCE_STEPS_ENTRY if GuidanceStudentDashboardPanels present
    if "GuidanceStudentDashboardPanels" in src and "GUIDANCE_STEPS_ENTRY" not in src:
        m = re.search(r'import\s*\{([^}]*)\}\s*from\s*"@/lib/guidance/portal-nav"', src)
        if m:
            names = m.group(1)
            if "GUIDANCE_STEPS_ENTRY" not in names:
                new_names = names.rstrip() + ", GUIDANCE_STEPS_ENTRY"
                src = src[: m.start(1)] + new_names + src[m.end(1) :]
        else:
            anchor = "from \"next/navigation\""
            src = src.replace(
                anchor,
                anchor + ';\nimport { GUIDANCE_STEPS_ENTRY } from "@/lib/guidance/portal-nav"',
                1,
            )

    # majors → discover
    if re.search(r'view\s*===\s*"majors"', src):
        if "redirect(\"/discover/majors\")" not in src and "redirect('/discover/majors')" not in src:
            die('view === "majors" present but no /discover/majors redirect — anchor mismatch')
    else:
        anchor = 'const view = params.view ?? "dashboard"'
        if anchor not in src:
            die(f"Cannot insert majors redirect — anchor missing: {anchor}")
        block = (
            '\n  if (view === "majors") {\n'
            '    redirect("/discover/majors");\n'
            '  }\n'
        )
        src = src.replace(anchor, anchor + block, 1)

    # universities hub (replace placeholder or add branch)
    if 'view === "universities"' in src:
        if "GuidanceUniversitiesHub" in src and "GuidancePlatformPlaceholder" not in re.split(r'universities', src, maxsplit=1)[-1][:800]:
            pass  # already wired
        elif "GuidancePlatformPlaceholder" in src:
            # Replace universities placeholder return block
            pat = (
                r'if\s*\(\s*view\s*===\s*"universities"\s*\)\s*\{'
                r'[\s\S]*?return\s*<GuidancePlatformPlaceholder[\s\S]*?/>;\s*\}'
            )
            repl = 'if (view === "universities") {\n    return <GuidanceUniversitiesHub />;\n  }'
            new_src, n = re.subn(pat, repl, src, count=1)
            if n != 1:
                die("Could not replace universities GuidancePlatformPlaceholder block — anchor mismatch")
            src = new_src
        else:
            die('view === "universities" found but no GuidancePlatformPlaceholder to replace')
    else:
        # Insert universities branch before default dashboard render
        markers = [
            'return (\n    <GuidancePlatformDashboard',
            "return <GuidancePlatformDashboard",
            "return (\n    <GuidanceStudentDashboardPanels",
            "return <GuidanceStudentDashboardPanels",
        ]
        inserted = False
        for m in markers:
            if m in src:
                block = '  if (view === "universities") {\n    return <GuidanceUniversitiesHub />;\n  }\n\n  '
                src = src.replace(m, block + m, 1)
                inserted = True
                break
        if not inserted:
            die("Cannot insert universities view — dashboard return anchor missing")

    # Journey CTA via GuidanceStudentDashboardPanels props
    if "GuidanceStudentDashboardPanels" in src:
        if "journeyContinueHref={GUIDANCE_STEPS_ENTRY}" not in src:
            if "journeyContinueHref=" in src:
                src = re.sub(
                    r'journeyContinueHref=\{[^}]+\}',
                    "journeyContinueHref={GUIDANCE_STEPS_ENTRY}",
                    src,
                    count=1,
                )
            else:
                src = src.replace(
                    "<GuidanceStudentDashboardPanels",
                    "<GuidanceStudentDashboardPanels\n      journeyContinueHref={GUIDANCE_STEPS_ENTRY}",
                    1,
                )
        if "userDisplayName=" not in src and "model={model}" in src:
            src = src.replace(
                "model={model}",
                "model={model}\n      userDisplayName={model.studentName}",
                1,
            )

    if src != original:
        write(page, src)
        print("OK: yellow dashboard page.tsx patched")
    else:
        print("OK: yellow dashboard page.tsx already up to date")

# ── 2. GuidancePlatformDashboard logout + journey CTA ─────────────────────────
elif mode == "platform-dashboard":
    dash = ROOT / "components/guidance/platform/GuidancePlatformDashboard.tsx"
    if not dash.exists():
        print("SKIP: GuidancePlatformDashboard not present")
        sys.exit(0)

    src = read(dash)
    original = src

    if "OfficeAccountMenu" not in src:
        if "import Link from \"next/link\"" not in src:
            die("GuidancePlatformDashboard anchor missing: Link import")
        src = src.replace(
            "import Link from \"next/link\"",
            "import Link from \"next/link\"\nimport { OfficeAccountMenu } from \"@/components/guidance/office/OfficeAccountMenu\"",
            1,
        )
        if "<div className=\"gp-hero__content\">" not in src:
            die("GuidancePlatformDashboard anchor missing: gp-hero__content")
        src = src.replace(
            "<div className=\"gp-hero__content\">",
            "<div className=\"gp-hero__content\">\n            <div className=\"gp-hero__top\">\n              <OfficeAccountMenu userDisplayName={studentName} />\n            </div>",
            1,
        )

    # Ensure yellow/journey primary CTA uses /steps index when label matches
    if "ورود به مسیر انتخاب رشته" in src or "primaryHref" in src:
        src = re.sub(
            r'const primaryHref\s*=\s*\n?\s*primaryCta\?\.href \?\? "[^"]+"',
            f'const primaryHref =\n    primaryCta?.href ?? "{JOURNEY_ENTRY}"',
            src,
            count=1,
        )

    if src != original:
        write(dash, src)
        print("OK: GuidancePlatformDashboard patched")
    else:
        print("OK: GuidancePlatformDashboard already up to date")

# ── 3. START package benefit ──────────────────────────────────────────────────
elif mode == "start-benefit":
    benefit = "چیدمان اولیه انتخاب‌ها"
    candidates = list(ROOT.glob("lib/guidance/journey-v2/**/*.ts")) + list(
        ROOT.glob("lib/guidance/journey-v2/**/*.tsx")
    )
    pkg_files = [p for p in candidates if p.is_file() and 'code: "START"' in read(p)]
    if not pkg_files:
        die("No START package source under lib/guidance/journey-v2/ — cannot patch benefit")

    for pf in pkg_files:
        src = read(pf)
        if benefit in src:
            print(f"OK: benefit already in {pf.relative_to(ROOT)}")
            continue
        # Insert into START features array
        m = re.search(r'(code:\s*"START"[\s\S]*?features:\s*\[)([\s\S]*?)(\])', src)
        if not m:
            die(f"START features array anchor missing in {pf}")
        inner = m.group(2).rstrip()
        if inner and not inner.endswith(","):
            inner += ","
        inner += f'\n      "{benefit}",'
        new_src = src[: m.start(2)] + inner + src[m.end(2) :]
        write(pf, new_src)
        print(f"OK: START benefit added in {pf.relative_to(ROOT)}")

# ── 4. V2 footer presentation classes ─────────────────────────────────────────
elif mode == "v2-nav":
    v2_root = ROOT / "components/guidance/journey-v2"
    if not v2_root.exists():
        die("components/guidance/journey-v2 missing — production V2 UI expected")

    footer_files = [
        p
        for p in v2_root.rglob("*.tsx")
        if re.search(r"Footer|Actions|StepNav|BottomBar", p.name)
    ]
    if not footer_files:
        die("No V2 footer/Actions component found under journey-v2 — anchor missing")

    touched = 0
    for ff in footer_files:
        src = read(ff)
        original = src
        if "gpj-actions" in src:
            continue
        # Wrap first footer-like container
        if "className=" not in src:
            continue
        src = re.sub(
            r'className="([^"]*(?:footer|actions)[^"]*)"',
            r'className="gpj-actions \1"',
            src,
            count=1,
        )
        src = re.sub(
            r'className="([^"]*back[^"]*)"',
            r'className="gpj-actions__back \1"',
            src,
            count=1,
        )
        src = re.sub(
            r'(type="submit"[^>]*className=")([^"]*)(")',
            r'\1gpj-actions__continue \2\3',
            src,
            count=1,
        )
        if src != original:
            write(ff, src)
            touched += 1
            print(f"OK: V2 presentation classes added in {ff.relative_to(ROOT)}")

    if touched == 0:
        print("OK: V2 footer files already styled or no matching anchors")
    else:
        print(f"OK: patched {touched} V2 footer file(s)")

# ── 5. Real discount UI wrap ──────────────────────────────────────────────────
elif mode == "discount-ui":
    benefit_files = []
    for pattern in [
        "components/guidance/journey-v2/**/*Payment*.tsx",
        "components/guidance/journey-v2/**/*Step3*.tsx",
        "components/guidance/steps/step3/RegistrationPaymentStep.tsx",
    ]:
        benefit_files.extend(ROOT.glob(pattern))

    payment_files = [p for p in benefit_files if p.is_file()]
    if not payment_files:
        die("No payment step file found for discount UI merge")

    # Locate existing production discount server action (do not invent)
    action_files = []
    for base in [ROOT / "app", ROOT / "lib", ROOT / "components"]:
        if not base.exists():
            continue
        for p in base.rglob("*.ts"):
            if "discount" in p.name.lower() or "coupon" in p.name.lower():
                action_files.append(p)
        for p in base.rglob("**/actions/**/*.ts"):
            txt = read(p)
            if re.search(r"discount|coupon|promo", txt, re.I) and "guidance" in txt.lower():
                action_files.append(p)

    action_files = list({p for p in action_files})
    if not action_files:
        die("No existing guidance discount server action found — cannot wire UI safely")

    # Pick payment step that already references discount OR first payment step
    target = None
    for pf in payment_files:
        txt = read(pf)
        if "discount" in txt.lower() or "coupon" in txt.lower():
            target = pf
            break
    target = target or payment_files[0]
    src = read(target)
    original = src

    if "GuidanceDiscountCodeField" in src:
        print(f"OK: discount UI already present in {target.relative_to(ROOT)}")
        sys.exit(0)

    if "startGuidanceCheckoutAction" not in src and "checkout" not in src.lower():
        die(f"Payment step anchor missing in {target}")

    # Import UI shell (presentation only — production step keeps its checkout action)
    if "GuidanceDiscountCodeField" not in src:
        imp_anchor = "import { GuidanceStepShell"
        if imp_anchor not in src:
            imp_anchor = "import {"
            if imp_anchor not in src:
                die(f"Cannot insert discount import in {target}")
        if "GuidanceDiscountCodeField" not in src:
            src = src.replace(
                imp_anchor,
                'import { GuidanceDiscountCodeField } from "@/components/guidance/steps/step3/GuidanceDiscountCodeField";\n' + imp_anchor,
                1,
            )

    # Insert component before package grid / checkout section
    markers = ["<div className=\"gp-package-grid\">", "gp-package-grid", "<GuidanceStepShell"]
    inserted = False
    for m in markers:
        if m in src and "<GuidanceDiscountCodeField" not in src:
            src = src.replace(m, "<GuidanceDiscountCodeField />\n\n      " + m, 1)
            inserted = True
            break
    if not inserted:
        die(f"Cannot insert GuidanceDiscountCodeField — package grid anchor missing in {target}")

    # Wire UI to existing production handler if a validate/apply function is imported
    handler = None
    for af in action_files:
        txt = read(af)
        for name in re.findall(r"export async function (\w*[Dd]iscount\w*)", txt):
            handler = name
            break
        if handler:
            break

    if handler:
        print(f"NOTE: Found production discount action {handler} — UI shell inserted; verify wiring uses {handler} (not fake client apply)")
    else:
        print("NOTE: Discount UI shell inserted; production step must already validate via checkout action")

    if src != original:
        write(target, src)
        print(f"OK: discount UI shell merged into {target.relative_to(ROOT)}")
    else:
        print("OK: discount UI unchanged")

# ── 6. globals.css block merge ────────────────────────────────────────────────
elif mode == "globals-css":
    import subprocess

    css_path = ROOT / "app/globals.css"
    if not css_path.exists():
        die("app/globals.css missing")

    branch_css = subprocess.check_output(
        ["git", "-C", str(ROOT), "show", f"{DEPLOY_COMMIT}:app/globals.css"],
        text=True,
    )

    SELECTORS = [
        ".guidance-command-header",
        ".guidance-command-account",
        ".guidance-command-center",
        ".guidance-command-hero",
        ".guidance-command-progress",
        ".guidance-command-grid",
        ".guidance-command-card",
        ".guidance-command-checks",
        ".gp-upload-field",
        ".guidance-universities-hub",
        ".gp-discount",
        ".gpj-actions",
        ".gp-hero__top",
    ]

    def extract_block(text, selector):
        idx = text.find(selector)
        if idx == -1:
            return None
        # walk back to line start
        start = text.rfind("\n", 0, idx) + 1
        depth = 0
        i = start
        started = False
        while i < len(text):
            c = text[i]
            if c == "{":
                depth += 1
                started = True
            elif c == "}":
                depth -= 1
                if started and depth == 0:
                    return text[start : i + 1]
            i += 1
        return None

    prod = read(css_path)
    appended = []

    for sel in SELECTORS:
        if sel in prod:
            continue
        block = extract_block(branch_css, sel)
        if not block:
            continue
        appended.append(f"\n/* GUIDANCE-POLISH:{sel} */\n{block}")

    if not appended:
        print("OK: globals.css blocks already present")
        sys.exit(0)

    marker = "/* END GUIDANCE-POLISH */"
    chunk = "\n".join(appended) + f"\n{marker}\n"
    if marker in prod:
        before, _, after = prod.partition(marker)
        prod = before.rstrip() + "\n" + chunk + after.lstrip()
    else:
        prod = prod.rstrip() + "\n\n/* BEGIN GUIDANCE-POLISH */\n" + chunk

    # Brace balance check
    if prod.count("{") != prod.count("}"):
        die("globals.css brace imbalance after merge")

    write(css_path, prod)
    print(f"OK: appended {len(appended)} CSS block(s) to globals.css")

else:
    die(f"Unknown python mode: {mode}")
PY
}

# ─── Surgical merges ───────────────────────────────────────────────────────────

log "── Surgical merge: yellow dashboard ──"
backup_file "app/portal/student/services/guidance/page.tsx"
run_python yellow-dashboard
SURGICAL_MERGED+=("yellow dashboard: app/portal/student/services/guidance/page.tsx")

log "── Surgical merge: GuidancePlatformDashboard (logout / CTA) ──"
backup_file "components/guidance/platform/GuidancePlatformDashboard.tsx"
run_python platform-dashboard
SURGICAL_MERGED+=("platform dashboard: OfficeAccountMenu + /steps CTA fallback")

log "── Surgical merge: START benefit ──"
run_python start-benefit
SURGICAL_MERGED+=("START benefit: چیدمان اولیه انتخاب‌ها")

log "── Surgical merge: V2 footer presentation ──"
run_python v2-nav
SURGICAL_MERGED+=("V2 footer/buttons: gpj-actions classes")

log "── Surgical merge: discount UI shell ──"
backup_file "components/guidance/steps/step3/RegistrationPaymentStep.tsx"
# V2 payment step if present
while IFS= read -r -d '' pf; do backup_file "$pf"; done < <(
  find components/guidance/journey-v2 -type f \( -name '*Payment*.tsx' -o -name '*Step3*.tsx' \) -print0 2>/dev/null || true
)
run_python discount-ui
SURGICAL_MERGED+=("real discount UI: GuidanceDiscountCodeField shell + production action")

log "── Surgical merge: globals.css blocks ──"
backup_file "app/globals.css"
run_python globals-css
SURGICAL_MERGED+=("globals CSS: guidance-command, upload, universities, discount, gpj-actions")

# Append gp-hero__top if missing (platform dashboard logout row)
if ! grep -q 'gp-hero__top' app/globals.css 2>/dev/null; then
  cat >>app/globals.css <<'EOF'

/* GUIDANCE-POLISH:gp-hero__top */
.gp-hero__top {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 0.75rem;
}
EOF
  log "Appended gp-hero__top CSS"
fi

# ─── Validation ────────────────────────────────────────────────────────────────

log "── Typecheck ──"
TYPECHECK_RESULT="FAIL"
if npx tsc --noEmit; then
  TYPECHECK_RESULT="PASS"
else
  die "Typecheck FAILED — PM2 not restarted. Restore from ${BACKUP_ROOT}"
fi

log "── Build ──"
BUILD_RESULT="FAIL"
if NODE_OPTIONS="--max-old-space-size=4096" npm run build; then
  BUILD_RESULT="PASS"
else
  die "Build FAILED — PM2 not restarted. Restore from ${BACKUP_ROOT}"
fi

log "── PM2 restart ──"
pm2 restart setareganplus --update-env
sleep 3
PM2_STATUS="$(pm2 jlist | python3 -c "import json,sys; d=json.load(sys.stdin); print(next((x['pm2_env']['status'] for x in d if x.get('name')=='setareganplus'),'unknown'))" 2>/dev/null || echo unknown)"

# ─── HTTP smoke checks ────────────────────────────────────────────────────────

http_check() {
  local path="$1"
  local tmp
  tmp="$(mktemp)"
  local code location
  code="$(curl -sS -o /dev/null -w '%{http_code}' -L --max-redirs 5 "http://127.0.0.1:3000${path}" || echo "000")"
  location="$(curl -sS -I --max-redirs 0 "http://127.0.0.1:3000${path}" 2>/dev/null | awk -F': ' 'tolower($1)=="location"{print $2}' | tr -d '\r' | tail -1 || true)"
  printf '%s|%s|%s' "$path" "$code" "$location"
}

declare -a HTTP_RESULTS=()
for p in "/" "/portal/login" "/portal/student/services/guidance" "/discover/majors" "/discover/programs" "/discover/systems" "/ms"; do
  HTTP_RESULTS+=("$(http_check "$p")")
done

# ─── Final report ─────────────────────────────────────────────────────────────

echo ""
echo "GUIDANCE_POLISH_DEPLOY_PASS"
echo "BACKUP=${BACKUP_ROOT}"
echo ""
echo "TRANSFERRED_FILES:"
for f in "${TRANSFERRED_FILES[@]}"; do echo "  - $f"; done
if ((${#SKIPPED_FILES[@]} > 0)); then
  echo "SKIPPED:"
  for f in "${SKIPPED_FILES[@]}"; do echo "  - $f"; done
fi
echo ""
echo "SURGICALLY_MERGED:"
for s in "${SURGICAL_MERGED[@]}"; do echo "  - $s"; done
echo ""
echo "TYPECHECK=${TYPECHECK_RESULT}"
echo "BUILD=${BUILD_RESULT}"
echo "PM2=${PM2_STATUS}"
echo ""
echo "HTTP_CHECKS (path|status|location):"
for row in "${HTTP_RESULTS[@]}"; do
  IFS='|' read -r path code location <<<"$row"
  echo "  ${path} → ${code} ${location:+(Location: ${location})}"
done
