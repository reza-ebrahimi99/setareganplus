# Restore GuidancePlatformDashboard

Smallest forward-only student-home fix. **Does not deploy itself.**

Does not touch Prisma, Zibal, middleware, `.env`, Nginx, PM2 config, or `page.early.tsx`.

## Apply

```bash
cd /var/www/setareganplus
bash deploy/guidance-dashboard-restore/apply-production.sh
```
