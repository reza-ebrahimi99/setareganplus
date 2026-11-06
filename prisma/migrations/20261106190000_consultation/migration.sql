-- Free consultation booking. Additive only. No consultant, window, or slot rows are inserted.

CREATE TABLE IF NOT EXISTS "Consultant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "specialty" TEXT NOT NULL DEFAULT '',
    "bio" TEXT,
    "photo" TEXT,
    "offersPublic" BOOLEAN NOT NULL DEFAULT false,
    "offersSpecial" BOOLEAN NOT NULL DEFAULT false,
    "offersOnline" BOOLEAN NOT NULL DEFAULT false,
    "offersInPerson" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Consultant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ConsultantWindow" (
    "id" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "slotMinutes" INTEGER,
    "capacity" INTEGER,
    "online" BOOLEAN NOT NULL DEFAULT false,
    "inPerson" BOOLEAN NOT NULL DEFAULT false,
    "audience" TEXT NOT NULL DEFAULT 'BOTH',
    CONSTRAINT "ConsultantWindow_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ConsultantWindow_weekday_check" CHECK ("weekday" BETWEEN 0 AND 6),
    CONSTRAINT "ConsultantWindow_capacity_check" CHECK ("capacity" IS NULL OR ("capacity" BETWEEN 1 AND 20)),
    CONSTRAINT "ConsultantWindow_slot_check" CHECK ("slotMinutes" IS NULL OR ("slotMinutes" BETWEEN 10 AND 180)),
    CONSTRAINT "ConsultantWindow_audience_check" CHECK ("audience" IN ('PUBLIC', 'SPECIAL', 'BOTH'))
);

CREATE TABLE IF NOT EXISTS "ConsultantException" (
    "id" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "slotMinutes" INTEGER,
    "capacity" INTEGER,
    "online" BOOLEAN NOT NULL DEFAULT false,
    "inPerson" BOOLEAN NOT NULL DEFAULT false,
    "audience" TEXT NOT NULL DEFAULT 'BOTH',
    "note" TEXT,
    CONSTRAINT "ConsultantException_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ConsultantException_kind_check" CHECK ("kind" IN ('OFF', 'EXTRA')),
    CONSTRAINT "ConsultantException_date_check" CHECK ("date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
    CONSTRAINT "ConsultantException_capacity_check" CHECK ("capacity" IS NULL OR ("capacity" BETWEEN 1 AND 20)),
    CONSTRAINT "ConsultantException_slot_check" CHECK ("slotMinutes" IS NULL OR ("slotMinutes" BETWEEN 10 AND 180)),
    CONSTRAINT "ConsultantException_audience_check" CHECK ("audience" IN ('PUBLIC', 'SPECIAL', 'BOTH'))
);

CREATE TABLE IF NOT EXISTS "EnrolledStudent" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "mobile" TEXT,
    "grade" TEXT,
    "note" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "codeHash" TEXT NOT NULL,
    "codeSuffix" TEXT NOT NULL,
    "codeVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EnrolledStudent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Consultation" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "consultantId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "bookerName" TEXT NOT NULL,
    "bookerRole" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "phoneProof" TEXT NOT NULL,
    "note" TEXT,
    "studentId" TEXT,
    "source" TEXT NOT NULL DEFAULT '',
    "medium" TEXT NOT NULL DEFAULT '',
    "campaign" TEXT NOT NULL DEFAULT '',
    "cancelReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "rescheduledFrom" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Consultation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Consultation_audience_check" CHECK ("audience" IN ('PUBLIC', 'SPECIAL')),
    CONSTRAINT "Consultation_mode_check" CHECK ("mode" IN ('ONLINE', 'IN_PERSON')),
    CONSTRAINT "Consultation_status_check" CHECK ("status" IN ('PENDING', 'CONFIRMED', 'CANCELLED')),
    CONSTRAINT "Consultation_role_check" CHECK ("bookerRole" IN ('PARENT', 'STUDENT')),
    CONSTRAINT "Consultation_proof_check" CHECK ("phoneProof" IN ('SMS', 'ACCESS_CODE'))
);

CREATE TABLE IF NOT EXISTS "ConsultationSeat" (
    "id" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "seat" INTEGER NOT NULL,
    "consultationId" TEXT NOT NULL,
    CONSTRAINT "ConsultationSeat_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ConsultationSeat_seat_check" CHECK ("seat" >= 0)
);

CREATE TABLE IF NOT EXISTS "ConsultOtp" (
    "id" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConsultOtp_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ConsultCodeAttempt" (
    "id" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConsultCodeAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ConsultNotice" (
    "id" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "detail" TEXT,
    "slotStartsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    CONSTRAINT "ConsultNotice_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ConsultNotice_kind_check" CHECK ("kind" IN ('CREATED', 'CANCELLED', 'MOVED', 'REMINDER')),
    CONSTRAINT "ConsultNotice_status_check" CHECK ("status" IN ('QUEUED', 'SENDING', 'SENT', 'FAILED', 'SKIPPED'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "EnrolledStudent_codeHash_key" ON "EnrolledStudent"("codeHash");
CREATE UNIQUE INDEX IF NOT EXISTS "Consultation_code_key" ON "Consultation"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "ConsultationSeat_consultationId_key" ON "ConsultationSeat"("consultationId");
CREATE UNIQUE INDEX IF NOT EXISTS "ConsultationSeat_consultantId_startsAt_seat_key" ON "ConsultationSeat"("consultantId", "startsAt", "seat");

CREATE INDEX IF NOT EXISTS "ConsultantWindow_consultantId_idx" ON "ConsultantWindow"("consultantId");
CREATE INDEX IF NOT EXISTS "ConsultantException_consultantId_date_idx" ON "ConsultantException"("consultantId", "date");
CREATE INDEX IF NOT EXISTS "Consultation_status_startsAt_idx" ON "Consultation"("status", "startsAt");
CREATE INDEX IF NOT EXISTS "Consultation_mobile_idx" ON "Consultation"("mobile");
CREATE INDEX IF NOT EXISTS "Consultation_consultantId_startsAt_idx" ON "Consultation"("consultantId", "startsAt");
CREATE INDEX IF NOT EXISTS "Consultation_audience_createdAt_idx" ON "Consultation"("audience", "createdAt");
CREATE INDEX IF NOT EXISTS "Consultation_studentId_idx" ON "Consultation"("studentId");
CREATE INDEX IF NOT EXISTS "EnrolledStudent_active_idx" ON "EnrolledStudent"("active");
CREATE INDEX IF NOT EXISTS "EnrolledStudent_mobile_idx" ON "EnrolledStudent"("mobile");
CREATE INDEX IF NOT EXISTS "ConsultOtp_mobile_createdAt_idx" ON "ConsultOtp"("mobile", "createdAt");
CREATE INDEX IF NOT EXISTS "ConsultOtp_expiresAt_idx" ON "ConsultOtp"("expiresAt");
CREATE INDEX IF NOT EXISTS "ConsultCodeAttempt_ipHash_createdAt_idx" ON "ConsultCodeAttempt"("ipHash", "createdAt");
CREATE INDEX IF NOT EXISTS "ConsultNotice_consultationId_kind_idx" ON "ConsultNotice"("consultationId", "kind");
CREATE INDEX IF NOT EXISTS "ConsultNotice_status_createdAt_idx" ON "ConsultNotice"("status", "createdAt");

DO $$ BEGIN
  ALTER TABLE "ConsultantWindow" ADD CONSTRAINT "ConsultantWindow_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ConsultantException" ADD CONSTRAINT "ConsultantException_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "EnrolledStudent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ConsultationSeat" ADD CONSTRAINT "ConsultationSeat_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ConsultationSeat" ADD CONSTRAINT "ConsultationSeat_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ConsultNotice" ADD CONSTRAINT "ConsultNotice_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
