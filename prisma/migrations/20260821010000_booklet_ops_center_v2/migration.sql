-- Booklet Operations Center v2
-- Additive: pickup branch, student/academic fields, handover staff,
-- canonical three booklet branches. No destructive drops.

DO $$ BEGIN
  CREATE TYPE "CommerceBookletBranchKey" AS ENUM ('BOYS', 'GIRLS', 'ELEMENTARY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CommerceStudentGrade" AS ENUM (
    'GRADE_1','GRADE_2','GRADE_3','GRADE_4','GRADE_5','GRADE_6',
    'GRADE_7','GRADE_8','GRADE_9','GRADE_10','GRADE_11','GRADE_12'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CommerceStudentMajor" AS ENUM (
    'MATH','EMPIRICAL','HUMANITIES','TECHNICAL','KAR_DANESH'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CommerceAcquisitionSource" AS ENUM (
    'INSTAGRAM','TELEGRAM','FRIEND','TEACHER','PARENT','OTHER'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CommerceBookletPaymentMethod" AS ENUM (
    'ONLINE','CASH','CARD','TRANSFER','OTHER'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "branches"
  ADD COLUMN IF NOT EXISTS "address" TEXT,
  ADD COLUMN IF NOT EXISTS "bookletOpsKey" "CommerceBookletBranchKey";

CREATE INDEX IF NOT EXISTS "branches_organizationId_bookletOpsKey_idx"
  ON "branches"("organizationId", "bookletOpsKey");

ALTER TABLE "commerce_orders"
  ADD COLUMN IF NOT EXISTS "pickupBranchId" TEXT,
  ADD COLUMN IF NOT EXISTS "buyerFirstName" TEXT,
  ADD COLUMN IF NOT EXISTS "buyerLastName" TEXT,
  ADD COLUMN IF NOT EXISTS "parentName" TEXT,
  ADD COLUMN IF NOT EXISTS "studentGrade" "CommerceStudentGrade",
  ADD COLUMN IF NOT EXISTS "studentMajor" "CommerceStudentMajor",
  ADD COLUMN IF NOT EXISTS "acquisitionSource" "CommerceAcquisitionSource",
  ADD COLUMN IF NOT EXISTS "referredBy" TEXT,
  ADD COLUMN IF NOT EXISTS "discountCode" TEXT,
  ADD COLUMN IF NOT EXISTS "bookletPaymentMethod" "CommerceBookletPaymentMethod",
  ADD COLUMN IF NOT EXISTS "urgentDelivery" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "preferredPickupAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "specialNotes" TEXT,
  ADD COLUMN IF NOT EXISTS "handoverStaffUserId" TEXT;

CREATE INDEX IF NOT EXISTS "commerce_orders_organizationId_pickupBranchId_idx"
  ON "commerce_orders"("organizationId", "pickupBranchId");

CREATE INDEX IF NOT EXISTS "commerce_orders_organizationId_studentGrade_idx"
  ON "commerce_orders"("organizationId", "studentGrade");

CREATE INDEX IF NOT EXISTS "commerce_orders_handoverStaffUserId_idx"
  ON "commerce_orders"("handoverStaffUserId");

DO $$ BEGIN
  ALTER TABLE "commerce_orders"
    ADD CONSTRAINT "commerce_orders_pickupBranch_fkey"
    FOREIGN KEY ("organizationId", "pickupBranchId")
    REFERENCES "branches"("organizationId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "commerce_orders"
    ADD CONSTRAINT "commerce_orders_handoverStaffUserId_fkey"
    FOREIGN KEY ("handoverStaffUserId") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Canonicalize the three booklet branches per organization (in-place, keep IDs).
DO $$
DECLARE
  org RECORD;
  boys_id TEXT;
  girls_id TEXT;
  elem_id TEXT;
BEGIN
  FOR org IN SELECT DISTINCT "organizationId" FROM "branches" LOOP
    SELECT id INTO boys_id
    FROM "branches"
    WHERE "organizationId" = org."organizationId"
      AND "deletedAt" IS NULL
      AND (
        slug IN ('pesaran-ghalamchi', 'pesaran')
        OR name ILIKE '%پسران%'
      )
    ORDER BY
      CASE
        WHEN slug = 'pesaran-ghalamchi' THEN 0
        WHEN slug = 'pesaran' THEN 1
        ELSE 2
      END,
      "createdAt" ASC
    LIMIT 1;

    SELECT id INTO girls_id
    FROM "branches"
    WHERE "organizationId" = org."organizationId"
      AND "deletedAt" IS NULL
      AND (
        slug IN ('dokhtaran-ghalamchi', 'dokhtaran')
        OR name ILIKE '%دختران%'
      )
    ORDER BY
      CASE
        WHEN slug = 'dokhtaran-ghalamchi' THEN 0
        WHEN slug = 'dokhtaran' THEN 1
        ELSE 2
      END,
      "createdAt" ASC
    LIMIT 1;

    SELECT id INTO elem_id
    FROM "branches"
    WHERE "organizationId" = org."organizationId"
      AND "deletedAt" IS NULL
      AND (
        slug IN ('dabestan-setaregan', 'nasim-shahr')
        OR name ILIKE '%دبستان%'
        OR name ILIKE '%نسیم%'
      )
    ORDER BY
      CASE
        WHEN slug = 'dabestan-setaregan' THEN 0
        WHEN slug = 'nasim-shahr' THEN 1
        ELSE 2
      END,
      "createdAt" ASC
    LIMIT 1;

    IF boys_id IS NULL THEN
      boys_id := replace(gen_random_uuid()::text, '-', '');
      INSERT INTO "branches" (
        id, "organizationId", name, slug, address, "accentColor", "bookletOpsKey",
        "isActive", "createdAt", "updatedAt"
      ) VALUES (
        boys_id, org."organizationId",
        'شعبه پسران قلم چی نسیم شهر', 'pesaran-ghalamchi',
        'بین کلانتری و بانک مسکن', '#2563eb', 'BOYS',
        true, NOW(), NOW()
      );
    ELSE
      UPDATE "branches"
      SET
        name = 'شعبه پسران قلم چی نسیم شهر',
        slug = CASE
          WHEN NOT EXISTS (
            SELECT 1 FROM "branches" other
            WHERE other."organizationId" = org."organizationId"
              AND other.slug = 'pesaran-ghalamchi'
              AND other.id <> boys_id
          ) THEN 'pesaran-ghalamchi'
          ELSE slug
        END,
        address = 'بین کلانتری و بانک مسکن',
        "accentColor" = COALESCE("accentColor", '#2563eb'),
        "bookletOpsKey" = 'BOYS',
        "isActive" = true,
        "deletedAt" = NULL,
        "updatedAt" = NOW()
      WHERE id = boys_id;
    END IF;

    IF girls_id IS NULL THEN
      girls_id := replace(gen_random_uuid()::text, '-', '');
      INSERT INTO "branches" (
        id, "organizationId", name, slug, address, "accentColor", "bookletOpsKey",
        "isActive", "createdAt", "updatedAt"
      ) VALUES (
        girls_id, org."organizationId",
        'شعبه دختران قلم چی نسیم شهر', 'dokhtaran-ghalamchi',
        'کوچه پاییزان', '#7c3aed', 'GIRLS',
        true, NOW(), NOW()
      );
    ELSE
      UPDATE "branches"
      SET
        name = 'شعبه دختران قلم چی نسیم شهر',
        slug = CASE
          WHEN NOT EXISTS (
            SELECT 1 FROM "branches" other
            WHERE other."organizationId" = org."organizationId"
              AND other.slug = 'dokhtaran-ghalamchi'
              AND other.id <> girls_id
          ) THEN 'dokhtaran-ghalamchi'
          ELSE slug
        END,
        address = 'کوچه پاییزان',
        "accentColor" = COALESCE("accentColor", '#7c3aed'),
        "bookletOpsKey" = 'GIRLS',
        "isActive" = true,
        "deletedAt" = NULL,
        "updatedAt" = NOW()
      WHERE id = girls_id;
    END IF;

    IF elem_id IS NULL THEN
      elem_id := replace(gen_random_uuid()::text, '-', '');
      INSERT INTO "branches" (
        id, "organizationId", name, slug, address, "accentColor", "bookletOpsKey",
        "isActive", "createdAt", "updatedAt"
      ) VALUES (
        elem_id, org."organizationId",
        'دبستان ستارگان', 'dabestan-setaregan',
        'بین خیابان اول و دوم', '#0d9488', 'ELEMENTARY',
        true, NOW(), NOW()
      );
    ELSE
      UPDATE "branches"
      SET
        name = 'دبستان ستارگان',
        slug = CASE
          WHEN NOT EXISTS (
            SELECT 1 FROM "branches" other
            WHERE other."organizationId" = org."organizationId"
              AND other.slug = 'dabestan-setaregan'
              AND other.id <> elem_id
          ) THEN 'dabestan-setaregan'
          ELSE slug
        END,
        address = 'بین خیابان اول و دوم',
        "accentColor" = COALESCE("accentColor", '#0d9488'),
        "bookletOpsKey" = 'ELEMENTARY',
        "isActive" = true,
        "deletedAt" = NULL,
        "updatedAt" = NOW()
      WHERE id = elem_id;
    END IF;

    -- Point leftover commerce rows at elementary, then deactivate extras.
    UPDATE "commerce_orders"
    SET "branchId" = elem_id, "updatedAt" = NOW()
    WHERE "organizationId" = org."organizationId"
      AND "branchId" IS NOT NULL
      AND "branchId" NOT IN (boys_id, girls_id, elem_id);

    UPDATE "commerce_items"
    SET "branchId" = elem_id, "updatedAt" = NOW()
    WHERE "organizationId" = org."organizationId"
      AND "branchId" IS NOT NULL
      AND "branchId" NOT IN (boys_id, girls_id, elem_id);

    UPDATE "commerce_categories"
    SET "branchId" = elem_id, "updatedAt" = NOW()
    WHERE "organizationId" = org."organizationId"
      AND "branchId" IS NOT NULL
      AND "branchId" NOT IN (boys_id, girls_id, elem_id);

    UPDATE "branches"
    SET "isActive" = false, "bookletOpsKey" = NULL, "updatedAt" = NOW()
    WHERE "organizationId" = org."organizationId"
      AND id NOT IN (boys_id, girls_id, elem_id)
      AND "deletedAt" IS NULL
      AND "isActive" = true;
  END LOOP;
END $$;

UPDATE "commerce_orders"
SET "pickupBranchId" = COALESCE("pickupBranchId", "branchId")
WHERE "pickupBranchId" IS NULL AND "branchId" IS NOT NULL;

UPDATE "commerce_orders"
SET
  "buyerFirstName" = COALESCE(
    NULLIF(btrim("buyerFirstName"), ''),
    NULLIF(split_part(btrim(COALESCE("buyerName", '')), ' ', 1), '')
  ),
  "buyerLastName" = COALESCE(
    NULLIF(btrim("buyerLastName"), ''),
    NULLIF(
      NULLIF(btrim(substr(btrim(COALESCE("buyerName", '')), strpos(btrim(COALESCE("buyerName", '')), ' ') + 1)), btrim(COALESCE("buyerName", ''))),
      ''
    )
  )
WHERE "buyerName" IS NOT NULL
  AND ("buyerFirstName" IS NULL OR "buyerLastName" IS NULL);

CREATE UNIQUE INDEX IF NOT EXISTS "branches_organizationId_bookletOpsKey_active_key"
  ON "branches"("organizationId", "bookletOpsKey")
  WHERE "bookletOpsKey" IS NOT NULL AND "deletedAt" IS NULL;
