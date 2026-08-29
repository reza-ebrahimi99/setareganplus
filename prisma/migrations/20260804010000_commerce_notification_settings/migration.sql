-- Commerce order admin SMS notification settings (additive)

CREATE TABLE IF NOT EXISTS "commerce_notification_settings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "adminNotificationSmsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "adminSmsRecipients" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commerce_notification_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "commerce_notification_settings_organizationId_key"
  ON "commerce_notification_settings"("organizationId");

ALTER TABLE "commerce_notification_settings"
  ADD CONSTRAINT "commerce_notification_settings_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
