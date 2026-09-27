-- Star Academy foundation

-- AlterEnum
ALTER TYPE "PaymentPayableType" ADD VALUE 'ACADEMY_ORDER';

-- CreateEnum
CREATE TYPE "AcademyCourseStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "AcademyLessonType" AS ENUM ('VIDEO', 'FILE', 'TEXT', 'QUIZ');
CREATE TYPE "AcademyLessonStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "AcademyVideoAssetStatus" AS ENUM ('UPLOADING', 'PROCESSING', 'READY', 'FAILED', 'ARCHIVED');
CREATE TYPE "AcademyOrderStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED', 'FAILED', 'REFUNDED');
CREATE TYPE "AcademyEntitlementSource" AS ENUM ('PURCHASE', 'ADMIN_GRANT', 'PROMOTION', 'MIGRATION');
CREATE TYPE "AcademyDiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');
CREATE TYPE "AcademySecurityEventType" AS ENUM ('LOGIN_RATE_LIMITED', 'INVALID_PLAYBACK_TOKEN', 'DEVICE_LIMIT_REACHED', 'SESSION_REVOKED', 'ENTITLEMENT_DENIED', 'CONCURRENT_PLAYBACK_BLOCKED', 'SUSPICIOUS_REQUEST');

-- CreateTable
CREATE TABLE "academy_settings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'آکادمی ستارگان',
    "maxDevices" INTEGER NOT NULL DEFAULT 2,
    "maxConcurrentStreams" INTEGER NOT NULL DEFAULT 1,
    "watermarkEnabled" BOOLEAN NOT NULL DEFAULT true,
    "watermarkIntervalMinSec" INTEGER NOT NULL DEFAULT 20,
    "watermarkIntervalMaxSec" INTEGER NOT NULL DEFAULT 45,
    "completionThresholdPct" INTEGER NOT NULL DEFAULT 90,
    "defaultAccessDays" INTEGER,
    "supportEmail" TEXT,
    "supportPhone" TEXT,
    "supportNote" TEXT,
    "defaultSeoTitle" TEXT,
    "defaultSeoDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academy_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "academy_courses" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "subtitle" TEXT,
    "shortDescription" TEXT,
    "description" TEXT,
    "instructorName" TEXT,
    "thumbnailStorageKey" TEXT,
    "coverStorageKey" TEXT,
    "status" "AcademyCourseStatus" NOT NULL DEFAULT 'DRAFT',
    "priceRials" INTEGER NOT NULL DEFAULT 0,
    "compareAtPriceRials" INTEGER,
    "accessDurationDays" INTEGER,
    "lifetimeAccess" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "academy_courses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "academy_sections" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academy_sections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "academy_video_assets" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "hlsStoragePrefix" TEXT,
    "status" "AcademyVideoAssetStatus" NOT NULL DEFAULT 'UPLOADING',
    "originalFilename" TEXT,
    "mimeType" TEXT,
    "sizeBytes" BIGINT,
    "durationSeconds" INTEGER,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academy_video_assets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "academy_lessons" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "sectionId" TEXT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "lessonType" "AcademyLessonType" NOT NULL DEFAULT 'VIDEO',
    "status" "AcademyLessonStatus" NOT NULL DEFAULT 'DRAFT',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPreview" BOOLEAN NOT NULL DEFAULT false,
    "sellIndividually" BOOLEAN NOT NULL DEFAULT false,
    "individualPriceRials" INTEGER,
    "durationSeconds" INTEGER,
    "videoAssetId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academy_lessons_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "academy_orders" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "status" "AcademyOrderStatus" NOT NULL DEFAULT 'PENDING',
    "subtotalRials" INTEGER NOT NULL,
    "discountRials" INTEGER NOT NULL DEFAULT 0,
    "totalRials" INTEGER NOT NULL,
    "discountCodeId" TEXT,
    "discountCodeLabel" TEXT,
    "idempotencyKey" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academy_orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "academy_order_items" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "courseId" TEXT,
    "lessonId" TEXT,
    "titleSnapshot" TEXT NOT NULL,
    "unitPriceRials" INTEGER NOT NULL,
    "compareAtPriceRials" INTEGER,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "lineTotalRials" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academy_order_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "academy_content_entitlements" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT,
    "lessonId" TEXT,
    "source" "AcademyEntitlementSource" NOT NULL,
    "orderId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "grantedByUserId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academy_content_entitlements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "academy_discount_codes" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "AcademyDiscountType" NOT NULL,
    "value" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "maxUses" INTEGER,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "perUserLimit" INTEGER NOT NULL DEFAULT 1,
    "minCartRials" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "courseId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academy_discount_codes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "academy_discount_redemptions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "discountCodeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academy_discount_redemptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "academy_video_progress" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "lastPositionSeconds" INTEGER NOT NULL DEFAULT 0,
    "maxPositionSeconds" INTEGER NOT NULL DEFAULT 0,
    "durationSeconds" INTEGER,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "lastViewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academy_video_progress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "academy_playback_sessions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "deviceId" TEXT,
    "sessionTokenHash" TEXT NOT NULL,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastHeartbeatAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "lastPositionSeconds" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "academy_playback_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "academy_user_devices" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceKey" TEXT NOT NULL,
    "browserLabel" TEXT,
    "osLabel" TEXT,
    "deviceType" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trustedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "academy_user_devices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "academy_security_events" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "type" "AcademySecurityEventType" NOT NULL,
    "lessonId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academy_security_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "academy_settings_organizationId_key" ON "academy_settings"("organizationId");
CREATE UNIQUE INDEX "ac_course_org_slug" ON "academy_courses"("organizationId", "slug");
CREATE INDEX "ac_course_org_st_feat" ON "academy_courses"("organizationId", "status", "featured");
CREATE INDEX "ac_course_org_del" ON "academy_courses"("organizationId", "deletedAt");
CREATE INDEX "ac_sec_org_course_ord" ON "academy_sections"("organizationId", "courseId", "sortOrder");
CREATE UNIQUE INDEX "ac_lesson_org_course_slug" ON "academy_lessons"("organizationId", "courseId", "slug");
CREATE INDEX "ac_lesson_org_course_st" ON "academy_lessons"("organizationId", "courseId", "status");
CREATE INDEX "ac_lesson_individual" ON "academy_lessons"("organizationId", "sellIndividually", "status");
CREATE INDEX "ac_video_org_st" ON "academy_video_assets"("organizationId", "status");
CREATE UNIQUE INDEX "ac_order_org_num" ON "academy_orders"("organizationId", "orderNumber");
CREATE INDEX "ac_order_org_user_st" ON "academy_orders"("organizationId", "userId", "status");
CREATE INDEX "ac_order_org_st_at" ON "academy_orders"("organizationId", "status", "createdAt");
CREATE INDEX "ac_oi_org_order" ON "academy_order_items"("organizationId", "orderId");
CREATE INDEX "ac_ent_org_user_rev" ON "academy_content_entitlements"("organizationId", "userId", "revokedAt");
CREATE INDEX "ac_ent_org_course" ON "academy_content_entitlements"("organizationId", "courseId");
CREATE INDEX "ac_ent_org_lesson" ON "academy_content_entitlements"("organizationId", "lessonId");
CREATE INDEX "ac_ent_user_exp" ON "academy_content_entitlements"("userId", "expiresAt");
CREATE UNIQUE INDEX "ac_disc_org_code" ON "academy_discount_codes"("organizationId", "code");
CREATE INDEX "ac_disc_org_active" ON "academy_discount_codes"("organizationId", "isActive");
CREATE INDEX "ac_red_org_code" ON "academy_discount_redemptions"("organizationId", "discountCodeId");
CREATE INDEX "ac_red_org_user_code" ON "academy_discount_redemptions"("organizationId", "userId", "discountCodeId");
CREATE UNIQUE INDEX "ac_prog_org_user_lesson" ON "academy_video_progress"("organizationId", "userId", "lessonId");
CREATE INDEX "ac_prog_org_user_viewed" ON "academy_video_progress"("organizationId", "userId", "lastViewedAt");
CREATE UNIQUE INDEX "academy_playback_sessions_sessionTokenHash_key" ON "academy_playback_sessions"("sessionTokenHash");
CREATE INDEX "ac_play_org_user_active" ON "academy_playback_sessions"("organizationId", "userId", "revokedAt", "endedAt");
CREATE INDEX "ac_play_org_lesson" ON "academy_playback_sessions"("organizationId", "lessonId");
CREATE UNIQUE INDEX "ac_dev_org_user_key" ON "academy_user_devices"("organizationId", "userId", "deviceKey");
CREATE INDEX "ac_dev_org_user_rev" ON "academy_user_devices"("organizationId", "userId", "revokedAt");
CREATE INDEX "ac_sec_org_type_at" ON "academy_security_events"("organizationId", "type", "createdAt");

-- AddForeignKey
ALTER TABLE "academy_settings" ADD CONSTRAINT "academy_settings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "academy_courses" ADD CONSTRAINT "academy_courses_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "academy_sections" ADD CONSTRAINT "academy_sections_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "academy_sections" ADD CONSTRAINT "academy_sections_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "academy_courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "academy_video_assets" ADD CONSTRAINT "academy_video_assets_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "academy_lessons" ADD CONSTRAINT "academy_lessons_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "academy_lessons" ADD CONSTRAINT "academy_lessons_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "academy_courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "academy_lessons" ADD CONSTRAINT "academy_lessons_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "academy_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "academy_lessons" ADD CONSTRAINT "academy_lessons_videoAssetId_fkey" FOREIGN KEY ("videoAssetId") REFERENCES "academy_video_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "academy_orders" ADD CONSTRAINT "academy_orders_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "academy_orders" ADD CONSTRAINT "academy_orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "academy_order_items" ADD CONSTRAINT "academy_order_items_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "academy_order_items" ADD CONSTRAINT "academy_order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "academy_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "academy_order_items" ADD CONSTRAINT "academy_order_items_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "academy_courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "academy_order_items" ADD CONSTRAINT "academy_order_items_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "academy_lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "academy_content_entitlements" ADD CONSTRAINT "academy_content_entitlements_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "academy_content_entitlements" ADD CONSTRAINT "academy_content_entitlements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "academy_content_entitlements" ADD CONSTRAINT "academy_content_entitlements_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "academy_courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "academy_content_entitlements" ADD CONSTRAINT "academy_content_entitlements_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "academy_lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "academy_content_entitlements" ADD CONSTRAINT "academy_content_entitlements_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "academy_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "academy_content_entitlements" ADD CONSTRAINT "academy_content_entitlements_grantedByUserId_fkey" FOREIGN KEY ("grantedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "academy_discount_codes" ADD CONSTRAINT "academy_discount_codes_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "academy_discount_redemptions" ADD CONSTRAINT "academy_discount_redemptions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "academy_discount_redemptions" ADD CONSTRAINT "academy_discount_redemptions_discountCodeId_fkey" FOREIGN KEY ("discountCodeId") REFERENCES "academy_discount_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "academy_discount_redemptions" ADD CONSTRAINT "academy_discount_redemptions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "academy_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "academy_video_progress" ADD CONSTRAINT "academy_video_progress_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "academy_video_progress" ADD CONSTRAINT "academy_video_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "academy_video_progress" ADD CONSTRAINT "academy_video_progress_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "academy_courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "academy_video_progress" ADD CONSTRAINT "academy_video_progress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "academy_lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "academy_playback_sessions" ADD CONSTRAINT "academy_playback_sessions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "academy_playback_sessions" ADD CONSTRAINT "academy_playback_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "academy_playback_sessions" ADD CONSTRAINT "academy_playback_sessions_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "academy_lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "academy_user_devices" ADD CONSTRAINT "academy_user_devices_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "academy_user_devices" ADD CONSTRAINT "academy_user_devices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "academy_security_events" ADD CONSTRAINT "academy_security_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
