#!/usr/bin/env bash
# Behavior/route smoke — no fragile internal function-name greps.

set -Eeuo pipefail

fail() { echo "SMOKE FAIL: $*" >&2; exit 1; }

[[ -f "app/portal/student/services/guidance/page.tsx" ]] || fail "guidance dashboard missing"
[[ -f "app/portal/student/services/guidance/journey/steps/actions/step10.ts" ]] || fail "step10 action missing"
[[ -f "app/admin/counselor/students/[studentId]/export/[kind]/page.tsx" ]] || fail "print export route missing"
[[ -f "components/counselor-os/SessionWorksheetDocument.tsx" ]] || fail "worksheet missing"
[[ -f "components/counselor-os/CaseBookDocument.tsx" ]] || fail "case book missing"

if grep -q "چیدمان اولیه انتخاب‌ها" lib/guidance/journey-v2/steps/step10-packages.ts; then
  fail "FREE plan still promises arrangement"
fi
grep -q "ثبت اولویت رشته، شهر و دوره" lib/guidance/journey-v2/steps/step10-packages.ts \
  || fail "FREE plan terminal feature missing"

if grep -q "GuidanceV2EarlyStepsStub" \
  "app/portal/student/services/guidance/journey/steps/[step]/page.early.tsx" 2>/dev/null; then
  fail "page.early.tsx is the local stub"
fi

if [[ -n "${SMOKE_BASE_URL:-}" ]]; then
  curl -fsS -o /dev/null -m 20 "${SMOKE_BASE_URL}/portal/login" || fail "login route"
  curl -fsS -o /dev/null -m 20 "${SMOKE_BASE_URL}/portal/student/services/guidance" || true
fi

echo "SMOKE PASS"
