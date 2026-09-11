# Guidance Zibal callback hotfix

Sends guidance package checkouts to `/payments/callback/guidance`
even when `ZIBAL_CALLBACK_URL` points at the generic Zibal callback.

Does **not** reconcile the existing unpaid/unverified incident.
Does **not** edit production `.env`.
Does **not** change Registration or Commerce callback pages.

## Apply on production

```bash
cd /var/www/setareganplus
bash deploy/guidance-zibal-callback-hotfix/apply-production.sh
```
