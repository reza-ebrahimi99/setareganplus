# TODO / open questions: setareganplus.ir lean rebuild

Everything seeded comes from the live site or the audit snapshot. Nothing is invented. Items below need a decision or real content from Reza.

## Content conflicts (the live value was used)
- [ ] **Staff count:** the live site says **58**, an older snapshot said 87. Seeded stats: 378 / 58 / 13 / 58. Confirm in Admin → Settings → Stats.
- [ ] **Primary-school founding year:** sources conflict (1400 vs 1401). The About timeline keeps one factual title-only entry, "۱۴۰۰: تأسیس دبستان غیردولتی ستارگان آینده". Confirm the year, or delete the entry (Admin → Settings → About → timeline).
- [ ] **Team member توحید افشارپور:** the live role is "مدیر دبستان ستارگان آینده". It is kept as factual. Change or remove it if the school must not appear at all (Admin → Team).
- [ ] **Team photos:** the source had 17 cards. After merging duplicates there are 16 unique people. Check that nobody is missing.
- [ ] **Hero subtitle:** edited to remove the school mention. Review the wording (Admin → Settings → Home).

## Missing content (the live site had none)
- [ ] **Tutoring/konkur center (/education):** there are no per-class texts, schedules or fees. The highlights "تیزهوشان" and "پانسیون" are titles only. The center has no own address/branch, so the branches list is empty. Fill these in via Admin → Centers → آموزشگاه.
- [ ] **News/blog:** there was no real news content, so `/news` is omitted. Add it later if needed.
- [x] **Opening hours:** confirmed by the owner: Sat–Wed 12:00–20:30, Thu 10:00–20:30, Fri closed (lib/hours.ts; old default replaced on deploy by scripts/update-defaults.ts).
- [ ] **Ghalamchi exam calendar:** the only listed exams (summer 1405) are past, so none are shown. Add the new term's dates to the Ghalamchi body text when available.

## Follow-ups (out of scope for this lean pass)
- [ ] **Ghalamchi online registration + Zibal payment** (the old `/ghalamchi/register`). For now it 308-redirects to `/ghalamchi#register`, which is the builder pre-registration form. Port it as a separate flow: Zibal merchant key in env, payment table, callback verify.
- [ ] **Kanoon (قلم‌چی) logo:** `public/brand/ghalamchi.jpg` is used on the Ghalamchi page. Confirm the agency is allowed to use it, or get an official asset.
- [ ] **Enamad seal:** the footer uses the existing enamad image URL and link from settings. It is external and didn't load on the dev box. Verify it renders on the production domain.
- [ ] **SMS/Telegram notification** on new submissions (not built; the inbox shows a "new" badge).
- [ ] **Multiple admin users / roles:** currently there is one env-configured admin.
- [ ] Rate limiting is in-memory (single PM2 instance). Move it to nginx `limit_req` if you scale out.

## Housekeeping
- [ ] Old-DB data import (optional): see DEPLOY.md §7.
