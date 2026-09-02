# Counselor OS Smoke Test

## Flow A — Counselor login → student case → journey
1. Login staff with `guidance.view` at `/admin/login?next=/admin/counselor`
2. Dashboard loads with real stats (may be zeros)
3. Open `/admin/counselor/students` → pick student → case tabs load
4. Journey tab shows step rail from GuidancePlan

## Flow B — Availability
1. `/admin/counselor/calendar` → add weekday rule
2. Verify rule listed

## Flow C — Student booking
1. Student guidance dashboard shows «جلسه مشاوره» card
2. `/portal/student/services/guidance?view=appointments` → pick slot → book
3. Confirmation message; slot no longer available

## Flow D — Session recording
1. Counselor `/admin/counselor/appointments` → open session workspace
2. Fill form → save draft → mark completed
3. Refresh — data persists

## Flow E — Session history
1. Student case → sessions tab → previous session visible

## Flow F — Follow-ups
1. Create follow-up on student case
2. `/admin/counselor/follow-ups` → mark complete

## Flow G — Unauthorized access
1. Counselor A changes student ID in URL to unassigned student → 404

## Flow H — Double booking
1. Two parallel booking attempts on same capacity-1 slot → only one succeeds

## Subdomain
1. `moshaver.setareganplus.ir/` → redirects to `/admin/counselor`
