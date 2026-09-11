#!/usr/bin/env python3
"""
Surgical, idempotent Counselor OS v2 Prisma merge.

Adds CounselorCaseCorrection relations + model only.
Aborts if production anchors are missing or the file is partially merged.
Never overwrites the rest of schema.prisma.
"""

from __future__ import annotations

import sys
from pathlib import Path

INSERTS = (
    (
        "Organization",
        "  counselorAppointments                CounselorAppointment[]\n\n  @@map(\"organizations\")",
        "  counselorAppointments                CounselorAppointment[]\n"
        "  counselorCaseCorrections             CounselorCaseCorrection[]\n\n"
        "  @@map(\"organizations\")",
        "counselorCaseCorrections             CounselorCaseCorrection[]",
    ),
    (
        "User",
        "  counselorAppointments          CounselorAppointment[]       @relation(\"CounselorAppointmentCounselor\")\n\n  @@index([status])",
        "  counselorAppointments          CounselorAppointment[]       @relation(\"CounselorAppointmentCounselor\")\n"
        "  counselorCaseCorrections       CounselorCaseCorrection[]    @relation(\"CounselorCaseCorrectionActor\")\n\n"
        "  @@index([status])",
        "CounselorCaseCorrectionActor",
    ),
    (
        "Student",
        "  counselorAppointments       CounselorAppointment[]\n\n  @@unique([organizationId, slug])",
        "  counselorAppointments       CounselorAppointment[]\n"
        "  counselorCaseCorrections    CounselorCaseCorrection[]\n\n"
        "  @@unique([organizationId, slug])",
        "counselorCaseCorrections    CounselorCaseCorrection[]",
    ),
)


def die(msg: str) -> None:
    print(f"SCHEMA MERGE ABORT: {msg}", file=sys.stderr)
    sys.exit(3)


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
    fragment = fragment_path.read_text(encoding="utf-8")
    if "model CounselorCaseCorrection" not in fragment:
        die("fragment is missing CounselorCaseCorrection")
    if "model CounselorFollowUp" not in src:
        die("production schema is missing Counselor OS foundation — deploy counselor-os-safe first")

    already_model = "model CounselorCaseCorrection" in src
    already_rels = all(marker in src for _, _, _, marker in INSERTS)

    if already_model and already_rels:
        print("SCHEMA MERGE: CounselorCaseCorrection already present — skipped")
        return

    if already_model != already_rels:
        die("partial CounselorCaseCorrection schema merge detected — refusing to guess")

    out = src
    for name, old, new, marker in INSERTS:
        if marker in out:
            continue
        if old not in out:
            die(f"{name} anchor mismatch — production schema drifted; merge manually")
        if out.count(old) != 1:
            die(f"{name} anchor is not unique ({out.count(old)} matches)")
        out = out.replace(old, new, 1)

    if "model CounselorCaseCorrection" not in out:
        if not out.endswith("\n"):
            out += "\n"
        out += "\n" + fragment.rstrip() + "\n"

    required = (
        "model CounselorCaseCorrection",
        '@@map("counselor_case_corrections")',
        "cos_corr_org_stu_at_idx",
        "model CounselorFollowUp",
        "model BookingAdvisor",
    )
    for needle in required:
        if needle not in out:
            die(f"post-merge missing {needle}")

    schema_path.write_text(out, encoding="utf-8", newline="\n")
    print("SCHEMA MERGE: applied CounselorCaseCorrection")


if __name__ == "__main__":
    main()
