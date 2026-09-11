#!/usr/bin/env python3
"""
Surgical, idempotent Counselor OS Prisma schema merge.

Inserts only Counselor OS relation fields + appends enums/models.
Aborts if production anchors are missing or the file is partially merged.
Never overwrites the rest of schema.prisma.
"""

from __future__ import annotations

import sys
from pathlib import Path

ORG_REL = """  counselorStudentAssignments          CounselorStudentAssignment[]
  counselingSessionRecords             CounselingSessionRecord[]
  counselorNotes                       CounselorNote[]
  counselorFollowUps                   CounselorFollowUp[]
  counselorAppointments                CounselorAppointment[]
"""

USER_REL = """  counselorStudentAssignments  CounselorStudentAssignment[] @relation("CounselorAssignmentCounselor")
  counselorAssignmentsCreated    CounselorStudentAssignment[] @relation("CounselorAssignmentAssignedBy")
  counselingSessionRecords       CounselingSessionRecord[]    @relation("CounselingSessionCounselor")
  counselorNotes                 CounselorNote[]              @relation("CounselorNoteAuthor")
  counselorFollowUps             CounselorFollowUp[]          @relation("CounselorFollowUpCounselor")
  counselorAppointments          CounselorAppointment[]       @relation("CounselorAppointmentCounselor")
"""

STUDENT_REL = """  counselorStudentAssignments CounselorStudentAssignment[]
  counselingSessionRecords    CounselingSessionRecord[]
  counselorNotes              CounselorNote[]
  counselorFollowUps          CounselorFollowUp[]
  counselorAppointments       CounselorAppointment[]
"""

PLAN_REL = """  counselorAppointments CounselorAppointment[]
  counselingSessionRecords CounselingSessionRecord[]
"""

RESERVATION_REL = """  counselorAppointment CounselorAppointment?
  counselingSessionRecord CounselingSessionRecord?
"""

INSERTS = (
    (
        "Organization",
        "  guidanceStepReviewEvents             GuidanceStepReviewEvent[]\n\n  @@map(\"organizations\")",
        "  guidanceStepReviewEvents             GuidanceStepReviewEvent[]\n"
        + ORG_REL
        + "\n  @@map(\"organizations\")",
        "counselorStudentAssignments          CounselorStudentAssignment[]",
    ),
    (
        "User",
        "  guidanceStepReviewEvents     GuidanceStepReviewEvent[]  @relation(\"GuidanceStepReviewEventActor\")\n\n  @@index([status])",
        "  guidanceStepReviewEvents     GuidanceStepReviewEvent[]  @relation(\"GuidanceStepReviewEventActor\")\n"
        + USER_REL
        + "\n  @@index([status])",
        'CounselorAssignmentCounselor',
    ),
    (
        "Student",
        "  guidancePlans      GuidancePlan[]\n\n  @@unique([organizationId, slug])",
        "  guidancePlans      GuidancePlan[]\n"
        + STUDENT_REL
        + "\n  @@unique([organizationId, slug])",
        "counselorStudentAssignments CounselorStudentAssignment[]",
    ),
    (
        "GuidancePlan",
        "  stepReviews           GuidanceStepReview[]\n\n  @@unique([organizationId, publicId])",
        "  stepReviews           GuidanceStepReview[]\n"
        + PLAN_REL
        + "\n  @@unique([organizationId, publicId])",
        "counselorAppointments CounselorAppointment[]",
    ),
    (
        "BookingReservation",
        "  checkIns        BookingCheckIn[]\n\n  @@unique([organizationId, trackingCode])",
        "  checkIns        BookingCheckIn[]\n"
        + RESERVATION_REL
        + "\n  @@unique([organizationId, trackingCode])",
        "counselorAppointment CounselorAppointment?",
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
    if "model CounselorStudentAssignment" not in fragment:
        die("fragment is missing CounselorStudentAssignment")

    already_models = (
        "model CounselorStudentAssignment" in src
        and "model CounselorAppointment" in src
        and "model CounselingSessionRecord" in src
        and "model CounselorNote" in src
        and "model CounselorFollowUp" in src
    )
    already_rels = all(marker in src for _, _, _, marker in INSERTS)

    if already_models and already_rels:
        print("SCHEMA MERGE: already present — skipped")
        return

    if already_models != already_rels:
        die("partial Counselor OS schema merge detected — refusing to guess")

    out = src
    for name, old, new, marker in INSERTS:
        if marker in out:
            continue
        if old not in out:
            die(f"{name} anchor mismatch — production schema drifted; merge manually")
        if out.count(old) != 1:
            die(f"{name} anchor is not unique ({out.count(old)} matches)")
        out = out.replace(old, new, 1)

    if "model CounselorStudentAssignment" not in out:
        if not out.endswith("\n"):
            out += "\n"
        out += "\n" + fragment.rstrip() + "\n"

    required = (
        "model CounselorStudentAssignment",
        "model CounselorAppointment",
        "model CounselingSessionRecord",
        "model CounselorNote",
        "model CounselorFollowUp",
        '@@map("counselor_student_assignments")',
        '@@map("booking_advisors")',
        '@@map("booking_reservations")',
    )
    for needle in required:
        if needle not in out:
            die(f"post-merge missing {needle}")

    schema_path.write_text(out, encoding="utf-8", newline="\n")
    print("SCHEMA MERGE: applied Counselor OS enums/models/relations")


if __name__ == "__main__":
    main()
