-- Experience Engine v0 (SXP Phase S1)
-- Additive only. Does not alter DomainEventOutbox, SMS, CRM, booking, or portal tables.

CREATE TYPE "ExperienceEngineHandlerName" AS ENUM (
  'TIMELINE_APPENDER',
  'FEED_CURATOR',
  'WIDGET_SNAPSHOTTER'
);

CREATE TYPE "ExperienceEngineInboxStatus" AS ENUM (
  'PENDING',
  'PROCESSED',
  'SKIPPED',
  'FAILED',
  'DEAD_LETTER'
);

CREATE TYPE "ExperienceTimelineVisibility" AS ENUM (
  'SELF',
  'GUARDIANS',
  'STAFF',
  'SYSTEM_HIDDEN'
);

CREATE TYPE "ExperienceWidgetKey" AS ENUM (
  'NEXT_ACTION',
  'UPCOMING_RESERVATION',
  'OPEN_BALANCE',
  'LOYALTY_CHIP',
  'READY_PICKUP',
  'RECENT_FEED'
);

CREATE TABLE "organization_feature_flags" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "organization_feature_flags_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organization_feature_flags_organizationId_key_key"
  ON "organization_feature_flags"("organizationId", "key");

CREATE INDEX "organization_feature_flags_organizationId_enabled_idx"
  ON "organization_feature_flags"("organizationId", "enabled");

ALTER TABLE "organization_feature_flags"
  ADD CONSTRAINT "organization_feature_flags_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "experience_profiles" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "displayName" TEXT,
  "interests" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "experience_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "experience_profiles_organizationId_userId_key"
  ON "experience_profiles"("organizationId", "userId");

CREATE UNIQUE INDEX "experience_profiles_organizationId_id_key"
  ON "experience_profiles"("organizationId", "id");

CREATE INDEX "experience_profiles_organizationId_deletedAt_idx"
  ON "experience_profiles"("organizationId", "deletedAt");

CREATE INDEX "experience_profiles_userId_idx"
  ON "experience_profiles"("userId");

ALTER TABLE "experience_profiles"
  ADD CONSTRAINT "experience_profiles_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "experience_profiles"
  ADD CONSTRAINT "experience_profiles_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "experience_engine_inbox" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "outboxEventId" TEXT NOT NULL,
  "handlerName" "ExperienceEngineHandlerName" NOT NULL,
  "status" "ExperienceEngineInboxStatus" NOT NULL DEFAULT 'PENDING',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "experience_engine_inbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "experience_engine_inbox_organizationId_outboxEventId_handlerName_key"
  ON "experience_engine_inbox"("organizationId", "outboxEventId", "handlerName");

CREATE INDEX "experience_engine_inbox_organizationId_status_createdAt_idx"
  ON "experience_engine_inbox"("organizationId", "status", "createdAt");

CREATE INDEX "experience_engine_inbox_handlerName_status_createdAt_idx"
  ON "experience_engine_inbox"("handlerName", "status", "createdAt");

ALTER TABLE "experience_engine_inbox"
  ADD CONSTRAINT "experience_engine_inbox_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "experience_timeline_events" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "inboxId" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceEventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "aggregateType" TEXT NOT NULL,
  "aggregateId" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "href" TEXT,
  "visibility" "ExperienceTimelineVisibility" NOT NULL DEFAULT 'SELF',
  "feedEligible" BOOLEAN NOT NULL DEFAULT false,
  "feedRank" INTEGER NOT NULL DEFAULT 0,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "experience_timeline_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "experience_timeline_events_organizationId_userId_sourceEventId_key"
  ON "experience_timeline_events"("organizationId", "userId", "sourceEventId");

CREATE UNIQUE INDEX "experience_timeline_events_organizationId_id_key"
  ON "experience_timeline_events"("organizationId", "id");

CREATE INDEX "experience_timeline_events_organizationId_userId_occurredAt_idx"
  ON "experience_timeline_events"("organizationId", "userId", "occurredAt");

CREATE INDEX "experience_timeline_events_organizationId_userId_feedEligible_feedRank_occurredAt_idx"
  ON "experience_timeline_events"("organizationId", "userId", "feedEligible", "feedRank", "occurredAt");

CREATE INDEX "experience_timeline_events_organizationId_userId_visibility_occurredAt_idx"
  ON "experience_timeline_events"("organizationId", "userId", "visibility", "occurredAt");

CREATE INDEX "experience_timeline_events_organizationId_sourceEventId_idx"
  ON "experience_timeline_events"("organizationId", "sourceEventId");

CREATE INDEX "experience_timeline_events_userId_occurredAt_idx"
  ON "experience_timeline_events"("userId", "occurredAt");

ALTER TABLE "experience_timeline_events"
  ADD CONSTRAINT "experience_timeline_events_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "experience_timeline_events"
  ADD CONSTRAINT "experience_timeline_events_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "experience_widget_snapshots" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "widgetKey" "ExperienceWidgetKey" NOT NULL,
  "payload" JSONB NOT NULL,
  "refreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "experience_widget_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "experience_widget_snapshots_organizationId_userId_widgetKey_key"
  ON "experience_widget_snapshots"("organizationId", "userId", "widgetKey");

CREATE INDEX "experience_widget_snapshots_organizationId_userId_idx"
  ON "experience_widget_snapshots"("organizationId", "userId");

ALTER TABLE "experience_widget_snapshots"
  ADD CONSTRAINT "experience_widget_snapshots_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "experience_widget_snapshots"
  ADD CONSTRAINT "experience_widget_snapshots_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
