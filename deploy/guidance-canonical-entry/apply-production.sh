#!/usr/bin/env bash
#
# ==============================================================================
# Guidance Canonical Entry — production applier
# ==============================================================================
#
# Consolidates every guidance entry path into ONE canonical flow:
#
#   https://entekhab.setareganplus.ir
#     -> anonymous: /portal/login?next=/portal/student/services/guidance
#     -> after login: /portal/student/services/guidance   (GuidancePlatformDashboard)
#     -> yellow CTA: /portal/student/services/guidance/steps
#     -> EXISTING production V2 resolver
#     -> /portal/student/services/guidance/journey/steps/[currentStep]
#
# Routing only. This script never touches payment, Zibal, discounts, packages,
# entitlements, SMS/OTP, Prisma, Counselor OS, or any journey-v2 business logic.
#
# ------------------------------------------------------------------------------
# HOW IT EDITS FILES
# ------------------------------------------------------------------------------
#   * Tiny compatibility-redirect routes are rewritten in full, after backup.
#     Their entire desired content is a redirect, so a full write is exact.
#   * Every other file is patched by anchored Python transformations that assert
#     the expected old text exists EXACTLY the expected number of times before
#     replacing it. Nothing is copied from a developer machine.
#
# Patches are classified:
#   CRITICAL - a miss breaks the canonical flow or risks a redirect loop.
#              Anchor mismatch => print expected text and EXIT NONZERO.
#   SOFT     - a miss leaves a cosmetic legacy link, not a broken flow.
#              Anchor mismatch => record, warn, continue. Summarised at the end.
#   Files whose target text is already canonical count as satisfied, not failed.
#
# ------------------------------------------------------------------------------
# NEVER DOES
# ------------------------------------------------------------------------------
#   git pull / reset / checkout / clean / stash
#   prisma migrate / db push / seed
#   rm -rf, recursive deletes, directory removal
#   pm2 restart, nginx edits, deployment
#
# Usage:  bash deploy/guidance-canonical-entry/apply-production.sh
# ==============================================================================

set -Eeuo pipefail

APP_ROOT="/var/www/setareganplus"
STAMP="$(date +%Y%m%d%H%M%S)"
BACKUP="/var/backups/guidance-canonical-entry-${STAMP}"
WORK="${BACKUP}/.tools"
MANIFEST="${BACKUP}/MANIFEST.txt"
SOFT_SKIPPED=()

# ------------------------------------------------------------------------------
# Output helpers
# ------------------------------------------------------------------------------
c_red()  { printf '\033[31m%s\033[0m\n' "$*"; }
c_grn()  { printf '\033[32m%s\033[0m\n' "$*"; }
c_ylw()  { printf '\033[33m%s\033[0m\n' "$*"; }
step()   { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
ok()     { printf '    \033[32mOK\033[0m   %s\n' "$*"; }
info()   { printf '    ..   %s\n' "$*"; }
warn()   { printf '    \033[33mWARN\033[0m %s\n' "$*"; }

die() {
  echo >&2
  c_red "ABORT: $*"
  echo >&2 "Nothing further was changed. Restore with:"
  echo >&2 "  bash ${BACKUP}/ROLLBACK.sh"
  exit 1
}

trap 'die "unexpected failure at line ${LINENO}"' ERR

# ------------------------------------------------------------------------------
# 0. Preflight
# ------------------------------------------------------------------------------
step "0. Preflight"

[[ -d "$APP_ROOT" ]] || die "app root not found: $APP_ROOT"
cd "$APP_ROOT"
[[ -f package.json ]] || die "$APP_ROOT is not the Next.js app root (no package.json)"

command -v python3 >/dev/null 2>&1 || die "python3 is required for anchored patching"
command -v npx     >/dev/null 2>&1 || die "npx is required"

info "app root : $(pwd)"
info "python3  : $(python3 --version 2>&1)"
info "node     : $(node --version 2>&1)"

# The canonical V2 resolver MUST already exist and MUST be left alone.
# If it is missing we are on the wrong tree (e.g. a legacy V1 checkout) and
# every redirect this script installs would point into a 404.
RESOLVER="app/portal/student/services/guidance/steps/page.tsx"
[[ -f "$RESOLVER" ]] || die "missing $RESOLVER — this does not look like the production tree"
if ! grep -q 'guidanceJourneyV2StepPath' "$RESOLVER"; then
  die "$RESOLVER does not reference guidanceJourneyV2StepPath.
     This tree does not have the production V2 resolver. Refusing to run,
     because /steps would not resolve to the 18-step journey."
fi
ok "production V2 resolver present — will NOT be modified"

if [[ ! -d "components/guidance/journey-v2" ]]; then
  die "components/guidance/journey-v2 is missing — refusing to run on a non-V2 tree"
fi
ok "components/guidance/journey-v2 present — preserved"

# ------------------------------------------------------------------------------
# 1. Backup scaffolding
# ------------------------------------------------------------------------------
step "1. Backup"

mkdir -p "$BACKUP" "$WORK"
: > "$MANIFEST"
info "backup dir: $BACKUP"

# Files this script must never write to, under any circumstance.
FORBIDDEN_RX='(^|/)(prisma/|generated/)|counselor|payment|zibal|Zibal|journey-v2|GUIDANCE_V2_PACKAGES|sms|Sms|SMS'

backup_file() {
  local f="$1"
  if [[ "$f" =~ $FORBIDDEN_RX ]]; then
    die "refusing to modify protected path: $f"
  fi
  if [[ -f "$f" ]]; then
    install -D "$f" "${BACKUP}/${f}"
    echo "$f" >> "$MANIFEST"
  else
    echo "NEW:$f" >> "$MANIFEST"
  fi
}

cat > "${BACKUP}/ROLLBACK.sh" <<ROLLBACK
#!/usr/bin/env bash
# Restore every file this run touched. Does not rebuild or restart.
set -Eeuo pipefail
cd "${APP_ROOT}"
while IFS= read -r line; do
  case "\$line" in
    NEW:*) f="\${line#NEW:}"; [[ -f "\$f" ]] && rm -f "\$f" && echo "removed  \$f" ;;
    *)     install -D "${BACKUP}/\$line" "\$line" && echo "restored \$line" ;;
  esac
done < "${MANIFEST}"
echo
echo "Rollback complete. Now rebuild:"
echo '  NODE_OPTIONS="--max-old-space-size=4096" npm run build'
echo "  pm2 restart setareganplus --update-env"
ROLLBACK
chmod +x "${BACKUP}/ROLLBACK.sh"
ok "rollback script written: ${BACKUP}/ROLLBACK.sh"

# ------------------------------------------------------------------------------
# 2. Anchored patch engine
# ------------------------------------------------------------------------------
cat > "${WORK}/patchlib.py" <<'PYEOF'
"""Anchored, assert-first source transformations."""
import re
import sys

_failed = False


def load(path):
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def save(path, text):
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(text)


def fail(path, message, expected=None):
    sys.stderr.write("\n  ANCHOR MISMATCH in %s\n    %s\n" % (path, message))
    if expected is not None:
        sys.stderr.write("    expected to find exactly this text:\n")
        for line in expected.splitlines():
            sys.stderr.write("      | %s\n" % line)
    sys.exit(3)


def sub(src, path, old, new, count=1, satisfied_if=None):
    """Replace `old` with `new`, asserting it appears exactly `count` times.

    `satisfied_if` is text whose presence means the edit was already applied,
    in which case the source is returned untouched instead of failing.
    """
    found = src.count(old)
    if found == count:
        return src.replace(old, new)
    if satisfied_if is not None and satisfied_if in src:
        sys.stderr.write("    (already canonical, skipped)\n")
        return src
    fail(path, "expected %d occurrence(s), found %d" % (count, found), old)


def require_absent(src, path, needle):
    if needle in src:
        fail(path, "post-condition failed: %r is still present" % needle)


def require_present(src, path, needle):
    if needle not in src:
        fail(path, "post-condition failed: %r is missing" % needle)


def prune_named_import(src, path, module):
    """Drop named bindings from `module` that the file no longer references.

    Removes the whole import statement when nothing from it survives. A binding
    still used elsewhere is kept, so this can never orphan a live reference.
    Idempotent: a already-minimal import is returned unchanged.
    """
    pattern = re.compile(
        r'^import \{([^}]*)\} from "' + re.escape(module) + r'";\n',
        re.M | re.S,
    )
    found = pattern.findall(src)
    if not found:
        return src
    if len(found) != 1:
        fail(path, "expected 1 import from %s, found %d" % (module, len(found)))

    match = pattern.search(src)
    names = [n.strip() for n in match.group(1).split(",") if n.strip()]
    body = src[: match.start()] + src[match.end() :]
    kept = [
        n for n in names
        if re.search(r"\b%s\b" % re.escape(n.split(" as ")[-1].strip()), body)
    ]

    if kept == names:
        return src
    if not kept:
        return body
    if len(kept) == 1:
        rewritten = 'import { %s } from "%s";\n' % (kept[0], module)
    else:
        rewritten = (
            "import {\n"
            + "".join("  %s,\n" % n for n in kept)
            + '} from "%s";\n' % module
        )
    return src[: match.start()] + rewritten + src[match.end() :]
PYEOF

# pypatch <file> <<'PY' ... PY     (CRITICAL: exits on anchor mismatch)
pypatch() {
  local f="$1"
  [[ -f "$f" ]] || die "expected file not found: $f"
  backup_file "$f"
  if PYTHONPATH="$WORK" python3 - "$f"; then
    ok "patched  $f"
  else
    die "anchored patch failed for $f (see anchor text above)"
  fi
}

# pypatch_soft <file> <<'PY' ... PY  (SOFT: records and continues)
pypatch_soft() {
  local f="$1"
  if [[ ! -f "$f" ]]; then
    warn "absent, skipped: $f"
    SOFT_SKIPPED+=("$f (file not present)")
    cat >/dev/null
    return 0
  fi
  backup_file "$f"
  if PYTHONPATH="$WORK" python3 - "$f"; then
    ok "patched  $f"
  else
    warn "soft patch did not apply: $f"
    SOFT_SKIPPED+=("$f")
  fi
  return 0
}

# pyassert <file> <<'PY' ... PY   (read-only: no backup, no MANIFEST entry, no
# write. Used where production is already correct and we only want to prove it.)
pyassert() {
  local f="$1"
  [[ -f "$f" ]] || die "expected file not found: $f"
  PYTHONPATH="$WORK" python3 - "$f" || die "assertion failed for $f (see above)"
}

# write_route <file> — full rewrite of a tiny redirect-only route, after backup
write_route() {
  local f="$1"
  backup_file "$f"
  mkdir -p "$(dirname "$f")"
  cat > "$f"
  ok "redirect $f"
}

# ------------------------------------------------------------------------------
# 3. Canonical constants (new, dependency-free)
# ------------------------------------------------------------------------------
step "3. Canonical route constants"

write_route "lib/guidance/canonical-entry.ts" <<'TS'
/**
 * Guidance — single canonical entry point.
 *
 * One public URL, one login, one dashboard, one journey. Every legacy guidance
 * entry route redirects through these constants so destinations cannot diverge
 * again. Routing only: no auth, journey, or payment behaviour lives here.
 */

/** Canonical authenticated landing screen. Always the dashboard, never a step. */
export const GUIDANCE_CANONICAL_HOME =
  "/portal/student/services/guidance" as const;

/** Journey resolver. Resolves to the student's real V2 currentStep. */
export const GUIDANCE_CANONICAL_JOURNEY_ENTRY =
  "/portal/student/services/guidance/steps" as const;

/** The only public host advertised for the guidance product. */
export const GUIDANCE_PUBLIC_HOST = "entekhab.setareganplus.ir" as const;

/** Absolute public URL, used when redirecting off the main domain. */
export const GUIDANCE_PUBLIC_URL = `https://${GUIDANCE_PUBLIC_HOST}/` as const;

/**
 * True when the request arrived on the canonical guidance host.
 * Tolerates a port suffix and case differences; ignores other subdomains.
 */
export function isGuidanceCanonicalHost(
  host: string | null | undefined,
): boolean {
  if (!host) return false;
  const normalized = host.trim().toLowerCase().split(":")[0];
  return normalized === GUIDANCE_PUBLIC_HOST;
}
TS

# ------------------------------------------------------------------------------
# 4. Compatibility redirect routes (A–G, except D which is deferred to 5.5)
# ------------------------------------------------------------------------------
step "4. Compatibility redirect routes"

# --- A) /entekhab -------------------------------------------------------------
write_route "app/entekhab/page.tsx" <<'TS'
/**
 * Canonical public entry (/entekhab).
 *
 * Compatibility redirect only. This route previously rendered its own portal
 * login form, which created a second guidance entry. Authentication now happens
 * on the canonical /portal route via middleware, which sends anonymous visitors
 * to /portal/login?next=/portal/student/services/guidance.
 */

import { redirect } from "next/navigation";
import { GUIDANCE_CANONICAL_HOME } from "@/lib/guidance/canonical-entry";

export const dynamic = "force-dynamic";

export default async function EntekhabEntryPage() {
  redirect(GUIDANCE_CANONICAL_HOME);
}
TS

# --- B) /guidance -------------------------------------------------------------
write_route "app/guidance/page.tsx" <<'TS'
/**
 * Legacy public guidance landing (/guidance).
 *
 * Compatibility redirect only — one public URL for the product, so this sends
 * visitors to the canonical host instead of rendering a second homepage.
 */

import { permanentRedirect } from "next/navigation";
import { GUIDANCE_PUBLIC_URL } from "@/lib/guidance/canonical-entry";

export const dynamic = "force-dynamic";

export default async function GuidanceLandingPage() {
  permanentRedirect(GUIDANCE_PUBLIC_URL);
}
TS

# --- C) /guidance/pre-register ------------------------------------------------
write_route "app/guidance/pre-register/page.tsx" <<'TS'
/**
 * Legacy guidance pre-registration (/guidance/pre-register).
 *
 * Compatibility redirect only. Pre-registration is no longer a competing entry
 * experience. ./actions.ts and the backend provisioning are deliberately left
 * untouched — other code still imports them.
 */

import { redirect } from "next/navigation";
import { GUIDANCE_CANONICAL_HOME } from "@/lib/guidance/canonical-entry";

export const dynamic = "force-dynamic";

export default async function GuidancePreRegisterPage() {
  redirect(GUIDANCE_CANONICAL_HOME);
}
TS

# --- D) guidance onboarding ---------------------------------------------------
# DEFERRED ON PURPOSE. Turning /onboarding into a redirect back to the dashboard
# is only safe once nothing redirects INTO onboarding, otherwise the two bounce
# off each other forever. It is written in section 5.5, after every CRITICAL
# removal in section 5 has succeeded.

# --- E) legacy 12-step route --------------------------------------------------
write_route "app/portal/student/services/guidance/steps/[step]/page.tsx" <<'TS'
/**
 * Legacy 12-step journey route.
 *
 * Compatibility redirect only — never renders legacy step UI again. Everything
 * goes through the canonical resolver, which resolves the student's real
 * Journey V2 currentStep. Legacy step components and server actions stay in the
 * tree for admin/history use.
 */

import { redirect } from "next/navigation";
import { GUIDANCE_CANONICAL_JOURNEY_ENTRY } from "@/lib/guidance/canonical-entry";

export const dynamic = "force-dynamic";

export default async function LegacyGuidanceJourneyStepPage() {
  redirect(GUIDANCE_CANONICAL_JOURNEY_ENTRY);
}
TS

# The legacy step layout must not render chrome or run guards for a route that
# only redirects. Patched only if it exists.
if [[ -f "app/portal/student/services/guidance/steps/[step]/layout.tsx" ]]; then
  write_route "app/portal/student/services/guidance/steps/[step]/layout.tsx" <<'TS'
/**
 * Legacy 12-step layout — pass-through.
 * The page beneath it is a compatibility redirect, so no guard or chrome runs.
 */

export const dynamic = "force-dynamic";

export default function LegacyGuidanceStepLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
TS
fi

# --- F) every /ms page --------------------------------------------------------
if [[ -d "app/ms" ]]; then
  MS_PAGES="$(find app/ms -type f -name 'page.tsx' | sort)"
  if [[ -z "$MS_PAGES" ]]; then
    warn "app/ms exists but contains no page.tsx"
  fi
  while IFS= read -r page; do
    [[ -n "$page" ]] || continue
    # Derive a unique, valid component name from the route path.
    slug="$(printf '%s' "${page#app/ms/}" | sed 's#/page\.tsx$##; s#page\.tsx$#home#')"
    comp="MajorOffice$(printf '%s' "$slug" | sed 's#[^A-Za-z0-9]\+# #g' \
          | awk '{for(i=1;i<=NF;i++){printf "%s%s", toupper(substr($i,1,1)), substr($i,2)}}')Page"
    [[ "$comp" == "MajorOfficePage" ]] && comp="MajorOfficeHomePage"
    write_route "$page" <<TS
/**
 * Legacy Major Office route (${page#app}).
 * Compatibility redirect only — no Major Office UI is reachable.
 * Sibling actions/backend modules are intentionally left in place; other code
 * still imports them.
 */

import { redirect } from "next/navigation";
import { GUIDANCE_CANONICAL_HOME } from "@/lib/guidance/canonical-entry";

export const dynamic = "force-dynamic";

export default async function ${comp}() {
  redirect(GUIDANCE_CANONICAL_HOME);
}
TS
  done <<< "$MS_PAGES"

  # --- G) /ms layout becomes a pass-through -----------------------------------
  if [[ -f "app/ms/layout.tsx" ]]; then
    write_route "app/ms/layout.tsx" <<'TS'
/**
 * Legacy Major Office layout — pass-through.
 *
 * Every page beneath is a compatibility redirect, so there is no chrome, no
 * onboarding guard, and no dashboard query for a screen that never renders.
 * MajorOfficeShell and the rail helpers stay in the tree.
 */

export const dynamic = "force-dynamic";

export default function MajorOfficeLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
TS
  fi
else
  warn "app/ms not present — nothing to neutralise"
fi

# ------------------------------------------------------------------------------
# 5. CRITICAL hand-merges — remove every redirect INTO onboarding
# ------------------------------------------------------------------------------
# Order matters, and is enforced: all four must succeed before 5.5 turns
# /onboarding into a redirect. Any one of them left in place would turn that
# redirect into an infinite loop, because onboarding points back at the
# dashboard. pypatch aborts the whole script on mismatch, so 5.5 is only ever
# reached with every redirect INTO onboarding already gone.
step "5. Remove onboarding from active routing (loop-critical)"

# --- 5.1 post-login routing ---------------------------------------------------
pypatch "app/portal/login/actions.ts" <<'PY'
import sys
from patchlib import (
    load, save, sub, prune_named_import, require_absent, require_present,
)

path = sys.argv[1]
src = load(path)

# (a) existing users: never resolve to onboarding
src = sub(
    src, path,
    """  const needs = await candidateNeedsGuidanceOnboarding({
    organizationId: params.organizationId,
    userId: params.userId,
    studentId: link.studentId,
  });
  if (needs) return GUIDANCE_ONBOARDING_PATH;
  return guidanceOn ? GUIDANCE_PLATFORM_HOME : "/portal";""",
    """  // Onboarding is never a post-login destination.
  return guidanceOn ? GUIDANCE_PLATFORM_HOME : "/portal";""",
    satisfied_if="// Onboarding is never a post-login destination.",
)

# (b) new external candidates: safe `next` first, else the dashboard
src = sub(
    src, path,
    "    redirectPath = GUIDANCE_ONBOARDING_PATH;",
    """    redirectPath = isSafeRelativePath(requestedNext)
      ? requestedNext.trim()
      : GUIDANCE_PLATFORM_HOME;""",
    satisfied_if="redirectPath = isSafeRelativePath(requestedNext)",
)

# (c) both onboarding bindings are now unreferenced; drop them and keep the rest
src = prune_named_import(src, path, "@/lib/guidance/external-candidate")

# Everything security-sensitive must survive untouched.
for kept in (
    "verifyOtp", "consumeOtp", "requestOtp",
    "createPortalSession", "setPortalSessionCookie",
    "ensureGuidanceCase", "provisionExternalGuidanceCandidate",
    "AuditAction.LOGIN_SUCCESS", "AuditAction.OTP_VERIFIED",
    "isSafeRelativePath",
):
    require_present(src, path, kept)

require_absent(src, path, "GUIDANCE_ONBOARDING_PATH")
require_absent(src, path, "candidateNeedsGuidanceOnboarding")
save(path, src)
PY

# --- 5.2 student portal layout (wraps the dashboard) --------------------------
pypatch "app/portal/student/layout.tsx" <<'PY'
import sys
from patchlib import load, save, sub, prune_named_import, require_absent

path = sys.argv[1]
src = load(path)

src = sub(
    src, path,
    """  if (guidanceEnabled && studentId && pathname && !onOnboarding) {
    const needsOnboarding = await candidateNeedsGuidanceOnboarding({
      organizationId: context.organization.id,
      userId: context.user.id,
      studentId,
    });
    if (needsOnboarding) {
      redirect(GUIDANCE_ONBOARDING_PATH);
    }
  }
""",
    """  // Onboarding is no longer a prerequisite for any student screen. Gating here
  // would bounce the dashboard to /onboarding, which now redirects straight back
  // to the dashboard — an infinite loop.
  void studentId;
""",
    satisfied_if="  void studentId;",
)

# Drop whatever the file no longer references. GUIDANCE_ONBOARDING_PATH is still
# used by the `onOnboarding` short-circuit, so it survives; if a future tree
# stops using it too, the whole import goes with it.
src = prune_named_import(src, path, "@/lib/guidance/external-candidate")

require_absent(src, path, "candidateNeedsGuidanceOnboarding")
require_absent(src, path, "redirect(GUIDANCE_ONBOARDING_PATH)")
save(path, src)
PY

# --- 5.3 guidance layout (wraps the dashboard) --------------------------------
pypatch "app/portal/student/services/guidance/layout.tsx" <<'PY'
import sys
from patchlib import load, save, sub, prune_named_import, require_absent

path = sys.argv[1]
src = load(path)

src = sub(
    src, path,
    """  const needs = await candidateNeedsGuidanceOnboarding({
    organizationId: context.organization.id,
    userId: context.user.id,
    studentId,
  });
  if (needs) {
    redirect(GUIDANCE_ONBOARDING_PATH);
  }

  return children;""",
    """  // No onboarding gate — see app/portal/student/layout.tsx.
  return children;""",
    satisfied_if="// No onboarding gate — see app/portal/student/layout.tsx.",
)

# Same usage-aware prune as the student layout: the pathname short-circuit still
# reads GUIDANCE_ONBOARDING_PATH, so the binding stays only while it is used.
src = prune_named_import(src, path, "@/lib/guidance/external-candidate")

require_absent(src, path, "candidateNeedsGuidanceOnboarding")
require_absent(src, path, "redirect(GUIDANCE_ONBOARDING_PATH)")
save(path, src)
PY

# --- 5.4 the dashboard page — ASSERTION ONLY, FILE IS NEVER MODIFIED ----------
# Production's dashboard reaches its plan through requireStudentPortalAccess and
# loadStudentIntelligenceSnapshot, then renders an empty state when there is no
# plan. It has no onboarding gate to remove, so this section only proves that:
# no backup, no MANIFEST entry, no write.
#
# If either onboarding symbol ever reappears here, stop. We have not seen that
# version of the file, and guessing a transformation for it is exactly the kind
# of blind edit this script exists to avoid.
DASHBOARD_PAGE="app/portal/student/services/guidance/page.tsx"
[[ -f "$DASHBOARD_PAGE" ]] || die "expected file not found: $DASHBOARD_PAGE"

if grep -n -e 'GUIDANCE_ONBOARDING_PATH' -e 'candidateNeedsGuidanceOnboarding' \
     "$DASHBOARD_PAGE" >/dev/null 2>&1; then
  c_red "    onboarding symbols found in $DASHBOARD_PAGE:"
  grep -n -e 'GUIDANCE_ONBOARDING_PATH' -e 'candidateNeedsGuidanceOnboarding' \
    "$DASHBOARD_PAGE"
  die "the dashboard page still references onboarding.
     Not guessing a transformation — inspect the lines above and decide the
     correct edit by hand, then re-run."
fi
ok "dashboard page already onboarding-free — untouched"

# --- 5.4a portal hub routing (CRITICAL) ---------------------------------------
# resolveGuidanceStudentHomePath decides where a guidance-enabled student lands
# on the canonical host. It must resolve to GUIDANCE_PLATFORM_HOME with no
# onboarding decision at all. Host checks, account checks and feature-flag logic
# above it are not touched.
pypatch "lib/guidance/student-entry.ts" <<'PY'
import sys
from patchlib import load, save, sub, require_absent, require_present

path = sys.argv[1]
src = load(path)

# Idempotent short-circuit: both symbols gone and the canonical return still
# present means a previous run already did this.
if (
    "GUIDANCE_ONBOARDING_PATH" not in src
    and "candidateNeedsGuidanceOnboarding" not in src
    and "return GUIDANCE_PLATFORM_HOME;" in src
):
    sys.stderr.write("    (already canonical, skipped)\n")
    sys.exit(0)

# (a) the onboarding decision only. The `return GUIDANCE_PLATFORM_HOME;` that
# follows is deliberately outside the anchor, so it survives byte-for-byte along
# with whatever whitespace separates them.
src = sub(
    src, path,
    """  const needsOnboarding = await candidateNeedsGuidanceOnboarding({
    organizationId: context.organization.id,
    userId: context.user.id,
    studentId,
  });
  if (needsOnboarding) {
    return GUIDANCE_ONBOARDING_PATH;
  }
""",
    """  // A guidance-enabled student always lands on the dashboard. There is no
  // onboarding decision here any more.
""",
)

# (b) both bindings are unreferenced now, so the whole import goes.
src = sub(
    src, path,
    """import {
  GUIDANCE_ONBOARDING_PATH,
  candidateNeedsGuidanceOnboarding,
} from "@/lib/guidance/external-candidate";
""",
    "",
)

require_present(src, path, "return GUIDANCE_PLATFORM_HOME;")
require_absent(src, path, "GUIDANCE_ONBOARDING_PATH")
require_absent(src, path, "candidateNeedsGuidanceOnboarding")
save(path, src)
PY

# --- 5.4b office interest access (CRITICAL) -----------------------------------
# A student with no plan must fall back to the dashboard, never into onboarding.
# loadGuidanceJourneyPlan, the plan semantics and the returned shape are
# unchanged: no plan is created here, and nothing is sent straight to /steps.
pypatch "lib/guidance/office/interest-access.ts" <<'PY'
import sys
from patchlib import load, save, sub, require_absent, require_present

path = sys.argv[1]
src = load(path)

if (
    "GUIDANCE_ONBOARDING_PATH" not in src
    and "redirect(GUIDANCE_PLATFORM_HOME)" in src
):
    sys.stderr.write("    (already canonical, skipped)\n")
    sys.exit(0)

# (a) GUIDANCE_PLATFORM_HOME is exported by portal-nav, which this file does not
# already import from, so the swap cannot produce a duplicate specifier.
src = sub(
    src, path,
    'import { GUIDANCE_ONBOARDING_PATH } from "@/lib/guidance/external-candidate";',
    'import { GUIDANCE_PLATFORM_HOME } from "@/lib/guidance/portal-nav";',
)

# (b) the single redirect.
src = sub(
    src, path,
    "  if (!plan) redirect(GUIDANCE_ONBOARDING_PATH);",
    "  if (!plan) redirect(GUIDANCE_PLATFORM_HOME);",
)

require_present(src, path, "loadGuidanceJourneyPlan")
require_present(src, path, "return { context, plan, studentId };")
require_absent(src, path, "GUIDANCE_ONBOARDING_PATH")
require_absent(src, path, '"@/lib/guidance/external-candidate"')
save(path, src)
PY

# --- 5.5 DEFERRED 4D: now safe to neutralise the onboarding route -------------
# Reached only if 5.1-5.4 all passed, since each aborts on mismatch. The grep
# below re-proves it against the files on disk rather than trusting order.
step "5.5 Neutralise the onboarding route (deferred from 4D)"

if grep -rIn --include=*.ts --include=*.tsx \
     -e 'redirect(GUIDANCE_ONBOARDING_PATH)' \
     -e 'return GUIDANCE_ONBOARDING_PATH' \
     app lib components >/dev/null 2>&1; then
  c_red "    still redirecting INTO onboarding:"
  grep -rIn --include=*.ts --include=*.tsx \
    -e 'redirect(GUIDANCE_ONBOARDING_PATH)' \
    -e 'return GUIDANCE_ONBOARDING_PATH' \
    app lib components | head -20
  die "refusing to make /onboarding a redirect while something still redirects into it —
     that pair would loop forever. Fix the sites listed above, then re-run."
fi
ok "nothing redirects into onboarding — safe to make it a redirect"

write_route "app/portal/student/services/guidance/onboarding/page.tsx" <<'TS'
/**
 * Legacy guidance onboarding.
 *
 * Compatibility redirect only. Onboarding is no longer a prerequisite for the
 * dashboard — every redirect into it was removed first, so this cannot loop.
 * V2 step 1 prefills from any existing onboarding record; the storage model and
 * form component stay in the tree.
 */

import { redirect } from "next/navigation";
import { GUIDANCE_CANONICAL_HOME } from "@/lib/guidance/canonical-entry";

export const dynamic = "force-dynamic";

export default async function GuidanceOnboardingPage() {
  redirect(GUIDANCE_CANONICAL_HOME);
}
TS

# ------------------------------------------------------------------------------
# 6. CRITICAL hand-merge — canonical host routing in middleware
# ------------------------------------------------------------------------------
step "6. Canonical host routing (middleware)"

pypatch "middleware.ts" <<'PY'
import re
import sys
from patchlib import load, save, sub, require_present

path = sys.argv[1]
src = load(path)

# The logic insert is skipped on a re-run, but we must NOT exit here: the matcher
# transformation in (c) is independent and still has to be evaluated.
if "isGuidanceCanonicalHost" in src:
    sys.stderr.write("    (canonical host block already present, skipped)\n")
else:

    # (a) import the helpers, anchored on a near-universal middleware import
    src = sub(
        src, path,
        'import type { NextRequest } from "next/server";',
        'import type { NextRequest } from "next/server";\n'
        'import {\n'
        '  GUIDANCE_CANONICAL_HOME,\n'
        '  isGuidanceCanonicalHost,\n'
        '} from "@/lib/guidance/canonical-entry";',
    )

    # (b) insert the host branch immediately before the /admin gate, i.e. after
    #     any Counselor host handling and before normal route handling. The block
    #     is self-contained so it does not depend on an existing `host` variable.
    BLOCK = """  // Canonical guidance host: "/" is the dashboard. The /portal branch below then
  // handles authentication and sets next=<dashboard>, so an anonymous visitor
  // reaches login and returns to the dashboard — never a journey step, and
  // never a second login UI.
  {
    const canonicalHost =
      request.headers.get("x-forwarded-host") ??
      request.headers.get("host") ??
      "";
    if (
      isGuidanceCanonicalHost(canonicalHost) &&
      (pathname === "/" || pathname === "")
    ) {
      const target = request.nextUrl.clone();
      target.pathname = GUIDANCE_CANONICAL_HOME;
      target.search = "";
      return NextResponse.redirect(target);
    }
  }

"""

    src = sub(
        src, path,
        '  if (pathname.startsWith("/admin")) {',
        BLOCK + '  if (pathname.startsWith("/admin")) {',
    )

# (c) the matcher must carry "/" or the host branch above is dead code. Parse the
#     array and compare entries, rather than searching the file for the substring
#     '"/"' — route literals and redirect targets elsewhere would false-positive.
MATCHER_RX = re.compile(r"matcher:\s*\[([^\]]*)\]", re.S)

occurrences = MATCHER_RX.findall(src)
if len(occurrences) != 1:
    sys.stderr.write(
        "\n  ANCHOR MISMATCH in %s\n"
        "    expected exactly 1 `matcher: [ ... ]`, found %d\n" % (path, len(occurrences))
    )
    sys.exit(3)

match = MATCHER_RX.search(src)
entries = [e.strip() for e in match.group(1).split(",") if e.strip()]
if not entries or not all(re.fullmatch(r'"[^"]*"', e) for e in entries):
    sys.stderr.write(
        "\n  ANCHOR MISMATCH in %s\n"
        "    matcher is not a flat list of string literals, refusing to guess:\n"
        "      %s\n" % (path, match.group(0))
    )
    sys.exit(3)

if '"/"' in entries:
    sys.stderr.write('    (matcher already has the exact "/" entry, skipped)\n')
else:
    rewritten = "matcher: [" + ", ".join(['"/"'] + entries) + "]"
    src = src[: match.start()] + rewritten + src[match.end() :]

# Post-condition: the exact "/" entry, as an entry and not as a substring.
final = MATCHER_RX.search(src)
final_entries = [e.strip() for e in final.group(1).split(",")] if final else []
if '"/"' not in final_entries:
    sys.stderr.write(
        '\n  post-condition failed in %s: matcher still lacks the exact "/" entry\n'
        % path
    )
    sys.exit(3)
sys.stderr.write("    matcher: %s\n" % final.group(0))

# Existing production logic must survive.
for kept in ('pathname.startsWith("/admin")', 'pathname.startsWith("/portal")', "matcher"):
    require_present(src, path, kept)

save(path, src)
PY

# ------------------------------------------------------------------------------
# 7. Dashboard yellow CTA — ASSERTION ONLY, FILE IS NEVER MODIFIED
# ------------------------------------------------------------------------------
# Production already declares the CTA card with the canonical resolver href, so
# there is nothing to patch: no backup, no MANIFEST entry, no write. This section
# only proves the card still points where the flow depends on it pointing.
step "7. Dashboard yellow CTA (assert canonical)"

pyassert "components/guidance/platform/GuidancePlatformDashboard.tsx" <<'PY'
import sys

TITLE = 'title: "ورود به مسیر انتخاب رشته"'
HREF = 'href: "/portal/student/services/guidance/steps"'
TONE = 'tone: "yellow"'

path = sys.argv[1]
with open(path, encoding="utf-8") as fh:
    src = fh.read()


def abort(message, excerpt=None):
    sys.stderr.write("\n  CTA ASSERTION FAILED in %s\n    %s\n" % (path, message))
    if excerpt:
        sys.stderr.write("    card as found:\n")
        for line in excerpt.splitlines():
            sys.stderr.write("      | %s\n" % line)
    sys.exit(3)


found = src.count(TITLE)
if found != 1:
    abort("expected exactly 1 occurrence of %s, found %d" % (TITLE, found))

# Isolate the object literal holding the title by matching braces outward, so the
# href and tone we check are this card's and not a neighbouring card's.
title_at = src.index(TITLE)
start = src.rfind("{", 0, title_at)
if start == -1:
    abort("could not find the opening brace of the CTA card")

depth = 0
end = -1
for i in range(start, len(src)):
    if src[i] == "{":
        depth += 1
    elif src[i] == "}":
        depth -= 1
        if depth == 0:
            end = i + 1
            break
if end == -1:
    abort("could not find the closing brace of the CTA card")

card = src[start:end]

if HREF not in card:
    abort("CTA href is not the canonical resolver (%s)" % HREF, card)
if TONE not in card:
    abort("CTA tone is not yellow (%s)" % TONE, card)
PY

ok "dashboard yellow CTA already canonical — untouched"

# ------------------------------------------------------------------------------
# 8. SOFT — navigation destinations that still point at legacy entries
# ------------------------------------------------------------------------------
# A miss here leaves a cosmetic legacy link, not a broken flow, so these warn
# rather than abort. Every skip is listed in the final summary.
step "8. Navigation cleanup (soft)"

for f in \
  "components/portal/home/PortalGuidanceSummaryWidget.tsx" \
  "lib/portal/intelligence/insight-engine.ts" \
  "lib/portal/intelligence/recommendation-engine.ts" \
  "lib/portal/student/home-presentation.ts" \
  "lib/guidance/journey-presentation.ts" \
  "app/portal/student/services/guidance/grades/page.tsx" \
  "content/guidance.ts" ; do
  pypatch_soft "$f" <<'PY'
import sys
from patchlib import load, save

path = sys.argv[1]
src = load(path)
old = '"/guidance/pre-register"'
if old not in src:
    sys.stderr.write("    (no pre-register link, nothing to do)\n")
    sys.exit(0)
src = src.replace(old, '"/portal/student/services/guidance"')
# Collapse a ternary whose branches became identical.
src = src.replace(
    """      href: input.hasPlan
        ? "/portal/student/services/guidance"
        : "/portal/student/services/guidance",""",
    """      href: "/portal/student/services/guidance",""",
)
save(path, src)
PY
done

# --- journey guard: no plan must land on the dashboard, not pre-register ------
pypatch_soft "lib/guidance/journey/guard.ts" <<'PY'
import sys
from patchlib import load, save

path = sys.argv[1]
src = load(path)
if 'redirect("/guidance/pre-register")' not in src:
    sys.stderr.write("    (guard already canonical)\n")
    sys.exit(0)
src = src.replace(
    'redirect("/guidance/pre-register")',
    "redirect(GUIDANCE_CANONICAL_HOME)",
)
if "GUIDANCE_CANONICAL_HOME" in src and "canonical-entry" not in src:
    src = src.replace(
        'import { notFound, redirect } from "next/navigation";',
        'import { notFound, redirect } from "next/navigation";\n'
        'import { GUIDANCE_CANONICAL_HOME } from "@/lib/guidance/canonical-entry";',
        1,
    )
save(path, src)
PY

# NOTE: lib/guidance/student-entry.ts and lib/guidance/office/interest-access.ts
# used to be patched here as SOFT. They are inbound onboarding redirects, so they
# were promoted to CRITICAL and moved to 5.4a/5.4b, ahead of the 5.5 gate.

# --- dashboard "today task" must not link back into /ms -----------------------
pypatch_soft "lib/guidance/office/dashboard.ts" <<'PY'
import re
import sys
from patchlib import load, save

path = sys.argv[1]
src = load(path)
if "GUIDANCE_CANONICAL_JOURNEY_ENTRY" in src:
    sys.stderr.write("    (already canonical)\n")
    sys.exit(0)

# Only the todayTask href expressions are retargeted; titles, labels, bodies and
# all derivation logic are untouched.
todo = re.search(r"const todayTask: OfficeTodayTask =.*?;\n", src, re.S)
if not todo:
    sys.stderr.write("    todayTask block not found\n")
    sys.exit(3)
block = todo.group(0)
patched = re.sub(
    r"href:\s*(?:MAJOR_OFFICE_[A-Z_]+|intakeHref|\n?\s*plan\.currentStep === 2[^,]*?MAJOR_OFFICE_JOURNEY),",
    "href: GUIDANCE_CANONICAL_JOURNEY_ENTRY,",
    block,
    flags=re.S,
)
if "MAJOR_OFFICE_" in patched:
    sys.stderr.write("    could not retarget every /ms href in todayTask\n")
    sys.exit(3)
src = src.replace(block, patched)
src = src.replace(
    'import {',
    'import { GUIDANCE_CANONICAL_JOURNEY_ENTRY } from "@/lib/guidance/canonical-entry";\nimport {',
    1,
)
save(path, src)
PY

# ------------------------------------------------------------------------------
# 9. Verification
# ------------------------------------------------------------------------------
step "9. Verification"

fail_verify=0
check_absent() {
  local label="$1"; shift
  if grep -rIn --include=*.ts --include=*.tsx "$@" app lib components >/dev/null 2>&1; then
    c_red "    FAIL  $label"
    grep -rIn --include=*.ts --include=*.tsx "$@" app lib components | head -20
    fail_verify=1
  else
    ok "$label"
  fi
}

check_absent "no redirect into guidance onboarding" -e 'redirect(GUIDANCE_ONBOARDING_PATH)'
check_absent "no post-login return to onboarding"   -e 'return GUIDANCE_ONBOARDING_PATH'

# Every legacy route must redirect and render nothing.
for f in \
  app/entekhab/page.tsx \
  app/guidance/page.tsx \
  app/guidance/pre-register/page.tsx \
  app/portal/student/services/guidance/onboarding/page.tsx \
  "app/portal/student/services/guidance/steps/[step]/page.tsx" ; do
  if [[ -f "$f" ]]; then
    if grep -qE 'redirect\(|permanentRedirect\(' "$f"; then ok "redirect-only: $f"
    else c_red "    FAIL  $f does not redirect"; fail_verify=1; fi
  fi
done
if [[ -d app/ms ]]; then
  while IFS= read -r page; do
    [[ -n "$page" ]] || continue
    grep -q 'redirect(' "$page" || { c_red "    FAIL  $page does not redirect"; fail_verify=1; }
  done < <(find app/ms -type f -name 'page.tsx')
  ok "all /ms pages redirect"
fi

# The production V2 resolver must be byte-identical to what we started with.
if grep -q 'guidanceJourneyV2StepPath' "$RESOLVER"; then
  ok "V2 resolver untouched ($RESOLVER)"
else
  c_red "    FAIL  V2 resolver was modified"; fail_verify=1
fi

# Nothing protected may appear in the backup manifest.
if grep -qE "$FORBIDDEN_RX" "$MANIFEST"; then
  c_red "    FAIL  a protected file was modified:"
  grep -E "$FORBIDDEN_RX" "$MANIFEST"
  fail_verify=1
else
  ok "no payment / Counselor / Prisma / SMS / journey-v2 file modified"
fi

[[ "$fail_verify" -eq 0 ]] || die "verification failed — see above. Roll back with ${BACKUP}/ROLLBACK.sh"

# ------------------------------------------------------------------------------
# 10. Typecheck and build
# ------------------------------------------------------------------------------
step "10. Typecheck"
if ! npx tsc --noEmit; then
  die "TypeScript failed. Roll back with: bash ${BACKUP}/ROLLBACK.sh"
fi
ok "tsc --noEmit passed"

step "11. Build"
if ! NODE_OPTIONS="--max-old-space-size=4096" npm run build; then
  die "Build failed. Roll back with: bash ${BACKUP}/ROLLBACK.sh"
fi
ok "npm run build passed"

# ------------------------------------------------------------------------------
# 12. Summary
# ------------------------------------------------------------------------------
trap - ERR

echo
echo "=== GUIDANCE CANONICAL ENTRY PATCH READY ==="
echo "backup: ${BACKUP}"
echo "typecheck: PASS"
echo "build: PASS"
echo "pm2: NOT RESTARTED"
echo "nginx: NOT MODIFIED"

if [[ ${#SOFT_SKIPPED[@]} -gt 0 ]]; then
  echo
  c_ylw "Soft patches not applied (cosmetic legacy links may remain):"
  for s in "${SOFT_SKIPPED[@]}"; do echo "  - $s"; done
  echo "  These do not affect the canonical flow. Review and hand-apply if wanted."
fi

echo
echo "Files changed this run:"
sed 's/^/  /' "$MANIFEST"

echo
echo "Now run these manually:"
echo
echo "  pm2 restart setareganplus --update-env"
echo "  pm2 status"
echo
echo "Rollback if needed:"
echo "  bash ${BACKUP}/ROLLBACK.sh"
echo
echo "Nginx (separate, later — NOT done by this script):"
echo "  remove the 'location = / { proxy_pass http://127.0.0.1:3000/entekhab; }'"
echo "  block from the entekhab server and proxy / normally with Host preserved."
