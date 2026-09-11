#!/usr/bin/env python3
"""
Surgical, idempotent Counselor OS v3 Prisma merge.

Adds BookingAdvisor title/specialty/capacity/photoMediaId + MediaAsset relation.
Aborts if production anchors are missing or the file is partially merged.
Never overwrites the rest of schema.prisma.
"""

from __future__ import annotations

import sys
from pathlib import Path

ADVISOR_OLD = """  displayName    String
  description    String?
  colorKey       String?"""

ADVISOR_NEW = """  displayName    String
  description    String?
  /// Counselor OS canonical profile — professional title (e.g. مشاور انتخاب رشته).
  title          String?
  /// Counselor OS canonical profile — specialty / focus area.
  specialty      String?
  /// Max active assigned students. null = unlimited; 0 = no new assignments.
  capacity       Int?
  photoMediaId   String?
  colorKey       String?"""

USER_REL_OLD = """  user              User?                          @relation(fields: [userId], references: [id], onDelete: Restrict)
  serviceLinks      BookingAdvisorService[]"""

USER_REL_NEW = """  user              User?                          @relation(fields: [userId], references: [id], onDelete: Restrict)
  photoMedia        MediaAsset?                    @relation("BookingAdvisorPhoto", fields: [photoMediaId], references: [id], onDelete: SetNull)
  serviceLinks      BookingAdvisorService[]"""

INDEX_OLD = """  @@index([organizationId, userId])
  @@map("booking_advisors")"""

INDEX_NEW = """  @@index([organizationId, userId])
  @@index([photoMediaId], map: "bk_adv_photo_idx")
  @@map("booking_advisors")"""

MEDIA_OLD = """  guidanceDocuments            GuidanceDocument[]

  @@index([organizationId, deletedAt])"""

MEDIA_NEW = """  guidanceDocuments            GuidanceDocument[]
  bookingAdvisorPhotos         BookingAdvisor[]              @relation("BookingAdvisorPhoto")

  @@index([organizationId, deletedAt])"""


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
    if "model BookingAdvisor" not in src:
        die("production schema is missing BookingAdvisor")
    if "model CounselorStudentAssignment" not in src:
        die("production schema is missing CounselorStudentAssignment")
    if "model GuidancePlan" not in src:
        die("production schema is missing GuidancePlan")

    already = (
        'title          String?' in src
        and "BookingAdvisorPhoto" in src
        and "bk_adv_photo_idx" in src
        and "bookingAdvisorPhotos" in src
    )
    if already:
        print("SCHEMA MERGE: Counselor OS v3 BookingAdvisor fields already present — skipped")
        return

    out = src
    replacements = (
        ("BookingAdvisor fields", ADVISOR_OLD, ADVISOR_NEW),
        ("BookingAdvisor photo relation", USER_REL_OLD, USER_REL_NEW),
        ("BookingAdvisor photo index", INDEX_OLD, INDEX_NEW),
        ("MediaAsset relation", MEDIA_OLD, MEDIA_NEW),
    )
    for name, old, new in replacements:
        if old not in out:
            die(f"{name} anchor mismatch — production schema drifted; merge manually")
        if out.count(old) != 1:
            die(f"{name} anchor is not unique ({out.count(old)} matches)")
        out = out.replace(old, new, 1)

    if "model GuidancePlan" not in out:
        die("merge removed model GuidancePlan")
    if "journeyVersion" in src and "journeyVersion" not in out:
        die("merge removed production GuidancePlan.journeyVersion")
    if src.count("model CounselorCaseCorrection") != out.count("model CounselorCaseCorrection"):
        die("merge altered CounselorCaseCorrection")

    required = (
        'title          String?',
        "capacity       Int?",
        "BookingAdvisorPhoto",
        "bk_adv_photo_idx",
        "model CounselorStudentAssignment",
        "model BookingAdvisor",
    )
    for needle in required:
        if needle not in out:
            die(f"post-merge missing {needle}")

    schema_path.write_text(out, encoding="utf-8", newline="\n")
    print("SCHEMA MERGE: applied Counselor OS v3 BookingAdvisor fields")


if __name__ == "__main__":
    main()
