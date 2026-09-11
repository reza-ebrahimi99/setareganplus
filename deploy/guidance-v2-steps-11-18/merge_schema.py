#!/usr/bin/env python3
"""
Surgical, idempotent Guidance V2 Steps 11–18 Prisma merge.

Preserves GuidancePlan.journeyVersion and Counselor OS V2/V3 models.
Additive enum values, nullable columns, relations, and new choice tables only.

Relation insertions are model-scoped and whitespace-tolerant. Enum/column
anchors remain exact unique blocks.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ENUM_OLD = """  STEP11_COMPLETED
  STEP12_COMPLETED
}"""

ENUM_NEW = """  STEP11_COMPLETED
  STEP12_COMPLETED
  STEP13_COMPLETED
  STEP14_COMPLETED
  STEP15_COMPLETED
  STEP16_COMPLETED
  STEP17_COMPLETED
  STEP18_COMPLETED
}"""

DOC_OLD = """  /// Journey Engine Step 5 — official Sanjesh exam result upload.
  EXAM_RESULT
}"""

DOC_NEW = """  /// Journey Engine Step 5 — official Sanjesh exam result upload.
  EXAM_RESULT
  /// V2 Step 18 — official Sanjesh submission receipt (screenshot/PDF).
  SANJESH_RECEIPT
}"""

APPT_OLD = """  status               CounselorAppointmentStatus @default(BOOKED)
  createdAt            DateTime                   @default(now())
  updatedAt            DateTime                   @updatedAt"""

APPT_NEW = """  status               CounselorAppointmentStatus @default(BOOKED)
  /// V2 session purpose: FIRST_SESSION | SECOND_SESSION. Null = generic counseling booking.
  purpose              String?
  createdAt            DateTime                   @default(now())
  updatedAt            DateTime                   @updatedAt"""

APPT_IDX_OLD = """  @@index([organizationId, guidancePlanId])
  @@map("counselor_appointments")"""

APPT_IDX_NEW = """  @@index([organizationId, guidancePlanId])
  @@index([organizationId, studentId, purpose, status], map: "cos_appt_stu_purp_idx")
  @@map("counselor_appointments")"""

PLAN_OLD = """  /// Step 12 — final student digital approval (journey completion).
  finalApprovedAt         DateTime?

  createdAt DateTime  @default(now())"""

PLAN_NEW = """  /// Step 12 — final student digital approval (journey completion).
  finalApprovedAt         DateTime?

  /// V2 Step 17 — acknowledgment copy version (e.g. informed-v1).
  v2InformedAckVersion      String?
  /// V2 Step 17 — confirmed GuidanceChoiceList id (FINAL revision).
  v2InformedRevisionId      String?
  /// V2 Step 18 — official Sanjesh submission tracking (not an API integration).
  v2SanjeshStatus           String?
  v2SanjeshDeclaredAt       DateTime?
  v2SanjeshReference        String?
  v2SanjeshNote             String?   @db.Text
  v2SanjeshVerifiedAt       DateTime?
  v2SanjeshVerifiedByUserId String?

  createdAt DateTime  @default(now())"""

PLAN_IDX_OLD = """  @@index([organizationId, userId, deletedAt])
  @@index([userId])
  @@index([choicesApprovedByUserId])
  @@map("guidance_plans")"""

PLAN_IDX_NEW = """  @@index([organizationId, userId, deletedAt])
  @@index([organizationId, currentStep, deletedAt], map: "gp_org_curstep_idx")
  @@index([userId])
  @@index([choicesApprovedByUserId])
  @@index([v2SanjeshVerifiedByUserId], map: "gp_sanjesh_ver_idx")
  @@map("guidance_plans")"""

USER_INSERT_LINES = [
    '  guidanceChoiceListsAuthored  GuidanceChoiceList[]         @relation("GuidanceChoiceListCounselor")',
    '  guidanceChoiceListsReadyBy   GuidanceChoiceList[]         @relation("GuidanceChoiceListReadyBy")',
    '  guidancePlansSanjeshVerified GuidancePlan[]               @relation("GuidancePlanSanjeshVerifier")',
    '  guidanceChoiceFeedback       GuidanceChoiceFeedback[]     @relation("GuidanceChoiceFeedbackStudent")',
]

USER_NEW_REL_ANCHORS = [
    "GuidanceChoiceListCounselor",
    "GuidanceChoiceListReadyBy",
    "GuidancePlanSanjeshVerifier",
    "GuidanceChoiceFeedbackStudent",
]

ORG_INSERT_LINES = [
    "  guidanceChoiceLists                  GuidanceChoiceList[]",
    "  guidanceChoiceItems                  GuidanceChoiceItem[]",
    "  guidanceChoiceFeedback               GuidanceChoiceFeedback[]",
]

STUDENT_INSERT_LINES = [
    "  guidanceChoiceLists         GuidanceChoiceList[]",
]

PLAN_SANJESH_REL_LINE = (
    '  sanjeshVerifiedByUser    User?                     '
    '@relation("GuidancePlanSanjeshVerifier", fields: [v2SanjeshVerifiedByUserId], '
    "references: [id], onDelete: SetNull)"
)

PLAN_CHOICE_LISTS_LINE = "  choiceLists              GuidanceChoiceList[]"


def die(msg: str) -> None:
    print(f"SCHEMA MERGE ABORT: {msg}", file=sys.stderr)
    sys.exit(3)


def replace_once(src: str, old: str, new: str, label: str) -> str:
    if old not in src:
        die(f"could not find expected block for {label}")
    return src.replace(old, new, 1)


def find_model_span(src: str, model_name: str) -> tuple[int, int]:
    matches = list(
        re.finditer(rf"^model {re.escape(model_name)} \{{", src, re.MULTILINE)
    )
    if len(matches) != 1:
        die(f"model {model_name} expected exactly once, found {len(matches)}")
    brace = src.find("{", matches[0].start())
    if brace < 0:
        die(f"model {model_name} is missing an opening brace")
    depth = 0
    for i in range(brace, len(src)):
        ch = src[i]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return matches[0].start(), i + 1
    die(f"unclosed model {model_name}")


def replace_model(src: str, model_name: str, new_model: str) -> str:
    start, end = find_model_span(src, model_name)
    return src[:start] + new_model + src[end:]


def line_newline(model_text: str) -> str:
    return "\r\n" if "\r\n" in model_text else "\n"


def insert_after_last_anchor(
    model_text: str,
    *,
    required_anchors: list[str],
    last_anchor: str,
    already_anchor: str,
    insert_lines: list[str],
    label: str,
) -> str:
    for anchor in required_anchors:
        if anchor not in model_text:
            die(f"{label}: missing semantic anchor {anchor!r}")
    if already_anchor in model_text:
        return model_text

    hits = [i for i, line in enumerate(model_text.splitlines()) if last_anchor in line]
    if len(hits) != 1:
        die(f"{label}: insertion anchor {last_anchor!r} is missing or ambiguous ({len(hits)} hits)")

    nl = line_newline(model_text)
    lines = model_text.splitlines()
    insert_at = hits[0] + 1
    formatted = [line.rstrip("\r\n") for line in insert_lines]
    lines[insert_at:insert_at] = formatted
    return nl.join(lines) + (nl if model_text.endswith(("\n", "\r\n")) else "")


def merge_user_relations(src: str) -> str:
    start, end = find_model_span(src, "User")
    model = src[start:end]
    for anchor in ("CounselorAppointmentCounselor", "CounselorCaseCorrectionActor"):
        hits = [i for i, line in enumerate(model.splitlines()) if anchor in line]
        if len(hits) != 1:
            die(
                f"User choice relations: {anchor!r} is missing or ambiguous "
                f"({len(hits)} hits)"
            )
    present = [a for a in USER_NEW_REL_ANCHORS if a in model]
    if len(present) == len(USER_NEW_REL_ANCHORS):
        return src
    if present:
        die(
            "User choice relations: partial existing new relations "
            f"{present} — refusing to insert"
        )
    updated = insert_after_last_anchor(
        model,
        required_anchors=[
            "CounselorAppointmentCounselor",
            "CounselorCaseCorrectionActor",
        ],
        last_anchor="CounselorCaseCorrectionActor",
        already_anchor="GuidanceChoiceListCounselor",
        insert_lines=USER_INSERT_LINES,
        label="User choice relations",
    )
    return replace_model(src, "User", updated)


def merge_organization_relations(src: str) -> str:
    start, end = find_model_span(src, "Organization")
    model = src[start:end]
    appt_hits = len(re.findall(r"^\s*counselorAppointments\b", model, re.MULTILINE))
    corr_hits = len(re.findall(r"^\s*counselorCaseCorrections\b", model, re.MULTILINE))
    if appt_hits != 1 or corr_hits != 1:
        die(
            "Organization choice relations: counselorAppointments/"
            f"counselorCaseCorrections anchors are missing or ambiguous "
            f"(appointments={appt_hits}, corrections={corr_hits})"
        )
    org_new = [
        "guidanceChoiceLists",
        "guidanceChoiceItems",
        "guidanceChoiceFeedback",
    ]
    present = [
        name
        for name in org_new
        if re.search(rf"^\s*{name}\s+", model, re.MULTILINE)
    ]
    if len(present) == len(org_new):
        return src
    if present:
        die(
            "Organization choice relations: partial existing new relations "
            f"{present} — refusing to insert"
        )
    updated = insert_after_last_anchor(
        model,
        required_anchors=["counselorAppointments", "counselorCaseCorrections"],
        last_anchor="counselorCaseCorrections",
        already_anchor="guidanceChoiceItems",
        insert_lines=ORG_INSERT_LINES,
        label="Organization choice relations",
    )
    return replace_model(src, "Organization", updated)


def merge_student_relations(src: str) -> str:
    start, end = find_model_span(src, "Student")
    model = src[start:end]
    appt_hits = len(re.findall(r"^\s*counselorAppointments\b", model, re.MULTILINE))
    corr_hits = len(re.findall(r"^\s*counselorCaseCorrections\b", model, re.MULTILINE))
    if appt_hits != 1 or corr_hits != 1:
        die(
            "Student choice relation: counselorAppointments/"
            f"counselorCaseCorrections anchors are missing or ambiguous "
            f"(appointments={appt_hits}, corrections={corr_hits})"
        )
    if re.search(r"^\s*guidanceChoiceLists\s+GuidanceChoiceList\[\]", model, re.MULTILINE):
        return src
    updated = insert_after_last_anchor(
        model,
        required_anchors=["counselorAppointments", "counselorCaseCorrections"],
        last_anchor="counselorCaseCorrections",
        already_anchor="guidanceChoiceLists",
        insert_lines=STUDENT_INSERT_LINES,
        label="Student choice relation",
    )
    return replace_model(src, "Student", updated)


def merge_plan_relations(src: str) -> str:
    start, end = find_model_span(src, "GuidancePlan")
    model = src[start:end]
    required = [
        "GuidancePlanChoicesApprover",
        "counselorAppointments",
        "counselingSessionRecords",
    ]
    for anchor in required:
        if anchor not in model:
            die(f"GuidancePlan late relations: missing semantic anchor {anchor!r}")
    nl = line_newline(model)
    lines = model.splitlines()

    if "GuidancePlanSanjeshVerifier" not in model:
        hits = [i for i, line in enumerate(lines) if "GuidancePlanChoicesApprover" in line]
        if len(hits) != 1:
            die("GuidancePlan late relations: ChoicesApprover line is missing or ambiguous")
        lines.insert(hits[0] + 1, PLAN_SANJESH_REL_LINE.rstrip("\r\n"))

    model2 = nl.join(lines) + (nl if model.endswith(("\n", "\r\n")) else "")
    lines = model2.splitlines()
    if not re.search(r"^\s*choiceLists\s+GuidanceChoiceList\[\]", model2, re.MULTILINE):
        hits = [i for i, line in enumerate(lines) if "counselingSessionRecords" in line]
        if len(hits) != 1:
            die("GuidancePlan late relations: counselingSessionRecords line is missing or ambiguous")
        lines.insert(hits[0] + 1, PLAN_CHOICE_LISTS_LINE.rstrip("\r\n"))

    updated = nl.join(lines) + (nl if model.endswith(("\n", "\r\n")) else "")
    return replace_model(src, "GuidancePlan", updated)


def main() -> None:
    if len(sys.argv) != 3:
        die("usage: merge_schema.py <schema.prisma> <fragment.prisma>")
    schema_path = Path(sys.argv[1])
    fragment_path = Path(sys.argv[2])
    if not schema_path.is_file():
        die(f"missing schema: {schema_path}")
    if not fragment_path.is_file():
        die(f"missing fragment: {fragment_path}")

    src = schema_path.read_text(encoding="utf-8")
    fragment = fragment_path.read_text(encoding="utf-8").strip() + "\n"

    if "model GuidancePlan" not in src:
        die("production schema is missing GuidancePlan")
    if "journeyVersion" not in src:
        die("production schema is missing GuidancePlan.journeyVersion — refusing merge")
    if "model BookingAdvisor" not in src:
        die("production schema is missing BookingAdvisor")
    if "model CounselorStudentAssignment" not in src:
        die("production schema is missing CounselorStudentAssignment")
    if "model CounselorCaseCorrection" not in src:
        die("production schema is missing CounselorCaseCorrection")

    user_start, user_end = find_model_span(src, "User")
    already = (
        "STEP18_COMPLETED" in src
        and "SANJESH_RECEIPT" in src
        and "v2SanjeshStatus" in src
        and "model GuidanceChoiceList" in src
        and "model GuidanceChoiceItem" in src
        and "model GuidanceChoiceFeedback" in src
        and "gp_org_curstep_idx" in src
        and "GuidanceChoiceListCounselor" in src[user_start:user_end]
    )
    if already:
        if "journeyVersion" not in src:
            die("journeyVersion disappeared")
        print("SCHEMA MERGE: already applied — skipped")
        return

    if "STEP18_COMPLETED" not in src:
        src = replace_once(src, ENUM_OLD, ENUM_NEW, "GuidancePlanStatus 13-18")
    if "SANJESH_RECEIPT" not in src:
        src = replace_once(src, DOC_OLD, DOC_NEW, "GuidanceDocumentType SANJESH_RECEIPT")
    if not re.search(r"^\s*purpose\s+String\?", src, re.MULTILINE) or "cos_appt_stu_purp_idx" not in src:
        if not re.search(r"^\s*purpose\s+String\?", src, re.MULTILINE):
            src = replace_once(src, APPT_OLD, APPT_NEW, "CounselorAppointment.purpose")
        if "cos_appt_stu_purp_idx" not in src:
            src = replace_once(src, APPT_IDX_OLD, APPT_IDX_NEW, "appointment purpose index")
    if "v2SanjeshStatus" not in src:
        src = replace_once(src, PLAN_OLD, PLAN_NEW, "GuidancePlan V2 late columns")
    if "gp_org_curstep_idx" not in src:
        src = replace_once(src, PLAN_IDX_OLD, PLAN_IDX_NEW, "GuidancePlan late indexes")

    start, end = find_model_span(src, "GuidancePlan")
    if "GuidancePlanSanjeshVerifier" not in src[start:end] or not re.search(
        r"^\s*choiceLists\s+GuidanceChoiceList\[\]", src[start:end], re.MULTILINE
    ):
        src = merge_plan_relations(src)

    start, end = find_model_span(src, "Organization")
    if "guidanceChoiceItems" not in src[start:end]:
        src = merge_organization_relations(src)

    start, end = find_model_span(src, "User")
    if "GuidanceChoiceListCounselor" not in src[start:end]:
        src = merge_user_relations(src)

    start, end = find_model_span(src, "Student")
    if not re.search(r"^\s*guidanceChoiceLists\s+GuidanceChoiceList\[\]", src[start:end], re.MULTILINE):
        src = merge_student_relations(src)

    if "model GuidanceChoiceList" not in src:
        src = src.rstrip() + "\n\n" + fragment

    if "journeyVersion" not in src:
        die("merge would remove GuidancePlan.journeyVersion")
    if "model BookingAdvisor" not in src or "model CounselorStudentAssignment" not in src:
        die("merge would remove Counselor OS models")
    if "STEP18_COMPLETED" not in src or "model GuidanceChoiceList" not in src:
        die("merge did not install required V2 late schema")
    start, end = find_model_span(src, "User")
    if "GuidanceChoiceListCounselor" not in src[start:end]:
        die("User choice relations were not installed")
    if src[start:end].count("GuidanceChoiceListCounselor") != 1:
        die("User choice relations were duplicated")

    schema_path.write_text(src, encoding="utf-8", newline="\n")
    print("SCHEMA MERGE: applied")


if __name__ == "__main__":
    main()
