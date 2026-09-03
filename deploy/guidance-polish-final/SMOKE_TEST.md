# Guidance Polish Final — smoke test

Test at **360px**, **390px**, and desktop. No horizontal scrolling anywhere.

## Regression guards (run FIRST)

- [ ] `/admin/counselor` returns 404 or is not reachable — Counselor OS must **not** be live
- [ ] No new tables in the database; `npx prisma migrate status` shows nothing applied today
- [ ] Login → `/portal/student/services/guidance` (yellow dashboard), **not** `/ms`
- [ ] Yellow «ورود به مسیر انتخاب رشته» → `/portal/student/services/guidance/steps`
      → lands on the account's **real** current step (not step 1)
- [ ] A paid account still shows its package as active; no checkout amount changed

## Issue checks

1. **Upload** — Step 1, Step 5, and `/portal/student/services/guidance/grades`:
   no «Browse…» / «No file selected»; shows «انتخاب فایل» and
   «فایلی انتخاب نشده است», then «فایل انتخاب‌شده: …» after picking.
2. **Yellow dashboard** — cards equal height, checks render as a card grid,
   readable hierarchy at 360px.
3. **معرفی دانشگاه‌ها** — card opens `?view=universities`; search box filters
   real entries; tabs «همه / نظام‌های دانشگاهی / انواع دوره» work; empty state
   appears for nonsense input; every card opens a real Discover page.
4. **Majors** — `/discover/majors` search + exam-group filters are ≥44px tall;
   single column at 360px; major count unchanged from before deploy.
5. **Public entry** — header «ورود به پرتال» and «سامانه جامع انتخاب رشته» go to
   `/portal/login?next=%2Fportal%2Fstudent%2Fservices%2Fguidance`; after OTP the
   student lands on the yellow dashboard.
6. **START plan** — free plan card lists «چیدمان اولیه انتخاب‌ها»; SMART /
   SPECIALIZED / PREMIUM prices unchanged. *(production V2 patch)*
7. **انواع دوره‌ها** — Step 6 link and universities-hub footer both open
   `/discover/programs`.
8. **Journey buttons** — every step footer: same height/radius; on mobile they
   stack full-width with the primary action on top; disabled state during submit
   still works; step progression unchanged in DB afterwards.
9. **Discount** — invalid code shows the real server error; valid code applies the
   real amount; no code = full price. *(production V2 patch)*
10. **Logout** — «خروج از حساب» visible on the dashboard at 360px and desktop;
    lands on `/guidance`, not `/ms`.

## Rollback

Restore from `/var/backups/guidance-polish-<STAMP>/`, then rebuild and
`pm2 restart setareganplus`.
