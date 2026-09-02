# Counselor OS — Morning Handoff Report

**Date:** 2026-09-03  
**Branch:** feat/admin-crm-ui-foundation (local)

## 1. What was built

SetareganPlus **Counselor OS** — a production-grade counselor operating system integrated with the existing Guidance Journey and Smart Booking Engine. Persistent PostgreSQL records for sessions, notes, and follow-ups. Student-facing appointment booking on the guidance dashboard without altering the canonical yellow «ورود به مسیر انتخاب رشته» flow.

## 2. Routes created/modified

### New counselor routes (`/admin/counselor/*`)
| Route | Purpose |
|-------|---------|
| `/admin/counselor` | Dashboard |
| `/admin/counselor/students` | Searchable student list |
| `/admin/counselor/students/[studentId]` | Student case 360° |
| `/admin/counselor/calendar` | Availability rules |
| `/admin/counselor/appointments` | Upcoming/past appointments |
| `/admin/counselor/sessions/[sessionId]` | Session workspace |
| `/admin/counselor/follow-ups` | Follow-up queue |
| `/admin/counselor/settings` | Account / booking profile |

### Modified
- `/portal/student/services/guidance` — counseling card + `?view=appointments`
- `middleware.ts` — `moshaver.setareganplus.ir` → `/admin/counselor`

## 3. Prisma models/migrations

Migration: `prisma/migrations/20260903120000_counselor_os_foundation`

Models: `CounselorStudentAssignment`, `CounselorAppointment`, `CounselingSessionRecord`, `CounselorNote`, `CounselorFollowUp`

## 4. Authorization model

- Entry: `AdminSession` + `guidance.view`
- Student scope: `CounselorStudentAssignment` (active) OR bootstrap all guidance students if `guidance.review` and no assignments
- Server-side `assertCounselorCanAccessStudent()` on all case loads
- Student booking via `requireStudentPortalAccess()` — no client-trusted IDs

## 5. Counselor features completed

- [x] Dashboard with real aggregates
- [x] Student list + search
- [x] Student case (overview, journey, sessions, notes, follow-ups)
- [x] Calendar / availability rules (reuses booking engine)
- [x] Appointments list + session workspace
- [x] Follow-up CRUD + completion
- [x] Responsive RTL shell + logout
- [x] Link to legacy `/admin/guidance` workspace

## 6. Student booking features completed

- [x] «جلسه مشاوره» card on guidance dashboard
- [x] Full booking page `?view=appointments`
- [x] Slot listing from counselor availability
- [x] Secure server action booking
- [x] Upcoming appointment display
- [x] Duplicate future booking prevention

## 7. Session-record features completed

- [x] Persistent `CounselingSessionRecord` in PostgreSQL
- [x] Session workspace form (subject, body, decisions, action items, summary)
- [x] Draft save + mark completed
- [x] Auto follow-up on completion with next date
- [x] Session history on student case

## 8. Follow-up features completed

- [x] Create from student case
- [x] Dashboard surfacing (due/overdue)
- [x] Dedicated follow-ups page with quick complete

## 9. SMS integration status

**Not wired** for counselor-specific events this release. Existing `createReservation` may trigger booking SMS if production config allows — verify env guards. Architecture ready for future hook.

## 10. Tests performed

- TypeScript: `npx tsc --noEmit` — **PASS**
- Production build: `npx next build --webpack` — **PASS**
- Manual flow reasoning documented in `deploy/counselor-os/SMOKE_TEST.md`
- Live E2E against production DB not run locally

## 11. Typecheck result

**PASS** (NODE_OPTIONS=--max-old-space-size=4096)

## 12. Build result

**PASS**

## 13. Git commits

```
ce8b1ab feat(counselor): complete counselor OS pages and student booking UI
76f6095 feat(counselor): add counselor OS dashboard, cases, and sessions UI (styles + middleware)
8c8a3cb feat(student): add counseling appointment booking on guidance dashboard (deploy package)
76ee734 feat(counselor): add counselor domain foundation
```

## 14. Files safe to transfer

- `lib/counselor-os/**`
- `app/admin/counselor/**`
- `components/counselor-os/**`
- `app/portal/student/services/guidance/counseling-actions.ts`
- `prisma/migrations/20260903120000_counselor_os_foundation/**`
- `deploy/counselor-os/**`
- `deploy/apply-counselor-os-production.sh`

## 15. Files requiring surgical production merge

- `app/globals.css` — append cos-* styles
- `app/portal/student/services/guidance/page.tsx`
- `components/guidance/office/GuidanceStudentDashboardPanels.tsx`
- `middleware.ts`
- `prisma/schema.prisma` — verify no production-only fields diverged

## 16. Production-only files to preserve

- `components/guidance/journey-v2/**`
- `lib/guidance/journey-v2/**`
- Payment / Step5 / package progression logic
- Production yellow dashboard variants if diverged from local

## 17. Exact deployment steps

1. Backup `/var/www/setareganplus`
2. Merge/sync Counselor OS files
3. `npx prisma migrate deploy && npx prisma generate`
4. `npm run build && pm2 restart setareganplus`
5. Configure nginx for `moshaver.setareganplus.ir` if needed
6. Bootstrap BookingAdvisor + assignments
7. Run smoke tests

See `deploy/counselor-os/PRODUCTION_DEPLOY.md`

## 18. Remaining limitations

- No dedicated SMS reminders for counselor appointments
- No reschedule/cancel UI for students yet
- Assignment admin UI not built — manual DB/admin seeding
- Session edit restricted to conducting counselor (reviewers can view case)
- Management overview not implemented
- Student timeline abstraction minimal

## 19. Recommended next phase

1. Admin UI for counselor–student assignment
2. Student cancel/reschedule with policy config
3. SMS hooks (booking confirm + reminder cron)
4. Management workload dashboard
5. Richer case timeline (appointments + sessions + journey milestones)
6. Week calendar view for counselors

---

## Checklist

- [x] Counselor login (`/admin/login?next=/admin/counselor`)
- [x] Counselor dashboard
- [x] Student list
- [x] Student case
- [x] Journey integration (read-only)
- [x] Availability management
- [x] Student booking
- [x] Double-booking protection (via booking engine + duplicate check)
- [x] Session recording
- [x] Session history
- [x] Counselor notes
- [x] Follow-ups
- [x] Persian/Jalali dates (display)
- [x] Mobile UX (responsive shell)
- [x] RBAC security
- [x] Logout
- [x] Typecheck
- [x] Production build
- [x] Deployment package
