# Combined: Discover detail cleanup + guidance logout return

**Do not deploy until asked.** After this folder is on the server:

```bash
bash deploy/guidance-discover-combined/apply-production.sh
```

Applies both approved fixes in one run:

1. Discover encyclopedia detail pages (no school-photo covers)
2. Guidance dashboard logout `next="/"` so the existing `/portal/logout` returns to the canonical entekhab entry

One timestamped backup, one allowlist, idempotent CSS merge. Does not copy Guidance V2 step files, payment libs, middleware, Prisma, Nginx, or env files.

Rollback is written at apply time:

```bash
bash /var/backups/guidance-discover-combined-<stamp>/ROLLBACK.sh
```
