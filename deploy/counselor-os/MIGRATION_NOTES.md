# Counselor OS Migration Notes

## Migration: `20260903120000_counselor_os_foundation`

**Additive only.** Creates:

### Enums
- `CounselorAssignmentStatus`
- `CounselorAppointmentStatus`
- `CounselingSessionRecordStatus`
- `CounselingSessionType`
- `CounselorNoteVisibility`
- `CounselorFollowUpStatus`
- `CounselorFollowUpPriority`

### Tables
- `counselor_student_assignments`
- `counselor_appointments` (1:1 with `booking_reservations`)
- `counseling_session_records`
- `counselor_notes`
- `counselor_follow_ups`

### Relations added
- `User`, `Student`, `Organization`, `GuidancePlan`, `BookingReservation`

**No drops. No data migration required.**

Post-migrate: optionally seed assignments for existing guidance students.
