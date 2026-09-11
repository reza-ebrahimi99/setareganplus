# Discover detail-page cleanup

Presentation-only bundle for university/program Discover detail pages.

**Do not deploy until asked.** Copy this folder to the server, then run:

```bash
bash deploy/discover-detail-cleanup/apply-production.sh
```

## What this changes

- `/discover/systems/[slug]` — shared encyclopedia template (all 8 system slugs)
- `DiscoverCover` — removes hashed school/classroom photos for leftover pathway/career callers
- Program encyclopedia details — back links only
- CSS merge into `app/globals.css` (never a wholesale replace)

## What this does not touch

Guidance V2 journey, payment/Zibal, discounts, auth, Prisma, Counselor OS, SMS, Nginx, middleware, PM2 config (restart only after tsc+build).
