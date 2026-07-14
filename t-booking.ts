[1mdiff --git a/package.json b/package.json[m
[1mindex fc7735e..4be62ae 100644[m
[1m--- a/package.json[m
[1m+++ b/package.json[m
[36m@@ -14,11 +14,14 @@[m
     "db:migrate:deploy": "prisma migrate deploy",[m
     "db:seed": "prisma db seed",[m
     "db:studio": "prisma studio",[m
[31m-    "auth:bootstrap-admin": "tsx scripts/bootstrap-admin.ts"[m
[32m+[m[32m    "auth:bootstrap-admin": "tsx scripts/bootstrap-admin.ts",[m
[32m+[m[32m    "test:booking": "tsx --env-file=.env scripts/booking-integration-tests.ts",[m
[32m+[m[32m    "test:jalali": "tsx --env-file=.env lib/booking/jalali-smoke.ts"[m
   },[m
   "dependencies": {[m
     "@prisma/adapter-pg": "^7.8.0",[m
     "@prisma/client": "^7.8.0",[m
[32m+[m[32m    "exceljs": "^4.4.0",[m
     "jalaali-js": "^2.0.0",[m
     "next": "16.2.10",[m
     "pg": "^8.22.0",[m
