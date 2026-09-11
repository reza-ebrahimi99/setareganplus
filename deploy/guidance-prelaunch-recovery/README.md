# Guidance prelaunch recovery

Forward-only recovery after the master release copied files and applied
`20260909090000_guidance_prelaunch_hardening`, then stopped before build/PM2.

Does **not** deploy itself. Does **not** rewrite the already-applied migration.
Does **not** touch Zibal, middleware, `.env`, Nginx, PM2 config, or `page.early.tsx`.

## Apply

```bash
cd /var/www/setareganplus
bash deploy/guidance-prelaunch-recovery/apply-production.sh
```
