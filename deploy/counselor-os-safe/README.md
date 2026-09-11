# Counselor OS SAFE — admin-only bundle

**Do not deploy until asked.** This folder is a local bundle only.

Activates `/admin/counselor/*` only.

Does **not** enable the student counseling card, does **not** copy `guidance/page.tsx`, does **not** modify middleware, and does **not** drop Counselor tables on rollback.

Login after a future approved deploy:

`/admin/login?next=/admin/counselor`

## Production commands later (do not run now)

Copy this folder onto the server next to the app, then:

```bash
# on the production host only, after explicit approval
cd /var/www/setareganplus
# confirm the bundle is present
ls deploy/counselor-os-safe/apply-production.sh
# convert CRLF if a Windows copy introduced it
sed -i 's/\r$//' deploy/counselor-os-safe/apply-production.sh
bash -n deploy/counselor-os-safe/apply-production.sh
bash deploy/counselor-os-safe/apply-production.sh
```

Rollback (files only; Counselor tables are never auto-dropped):

```bash
bash /var/backups/counselor-os-safe-<timestamp>/ROLLBACK.sh
```

