-- Optional Instagram gift code on a consultation. Additive and nullable.

ALTER TABLE "Consultation" ADD COLUMN IF NOT EXISTS "giftCode" TEXT;
