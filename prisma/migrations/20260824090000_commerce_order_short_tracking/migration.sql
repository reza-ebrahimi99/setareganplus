-- Public order tracking: permanent short codes for the /o/{code} short link
-- and the /order/{orderNumber} tracking page. Additive only — qrToken and
-- the existing /booklet/{qrToken} pickup receipt flow are untouched.

ALTER TABLE "commerce_orders"
  ADD COLUMN IF NOT EXISTS "shortCode" TEXT;

-- Backfill existing rows with a unique 6-character uppercase alphanumeric
-- code (matches the application-level generator). Uses only built-in
-- functions (random/md5/generate_series) — no extensions required.
DO $$
DECLARE
  order_row RECORD;
  candidate TEXT;
  alphabet TEXT := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  attempt INT;
BEGIN
  FOR order_row IN
    SELECT "id" FROM "commerce_orders"
    WHERE "shortCode" IS NULL OR btrim("shortCode") = ''
  LOOP
    attempt := 0;
    LOOP
      SELECT string_agg(substr(alphabet, floor(random() * length(alphabet))::int + 1, 1), '')
      INTO candidate
      FROM generate_series(1, 6);

      attempt := attempt + 1;

      IF NOT EXISTS (
        SELECT 1 FROM "commerce_orders" WHERE "shortCode" = candidate
      ) THEN
        EXIT;
      END IF;

      -- Astronomically unlikely, but stay correct under contention by
      -- widening the candidate instead of looping forever.
      IF attempt > 20 THEN
        candidate := candidate || substr(md5(random()::text), 1, 2);
        EXIT;
      END IF;
    END LOOP;

    UPDATE "commerce_orders" SET "shortCode" = candidate WHERE "id" = order_row."id";
  END LOOP;
END $$;

ALTER TABLE "commerce_orders"
  ALTER COLUMN "shortCode" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "commerce_orders_shortCode_key"
  ON "commerce_orders"("shortCode");
