DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'RegistrationFlowFulfillmentMode'
  ) THEN
    CREATE TYPE "RegistrationFlowFulfillmentMode" AS ENUM (
      'NONE',
      'PICKUP_AT_SCHOOL',
      'COURIER',
      'CLASSROOM_DELIVERY',
      'DIGITAL_DOWNLOAD'
    );
  END IF;
END
$$;

ALTER TABLE "registration_flows"
ADD COLUMN IF NOT EXISTS "fulfillmentMode"
"RegistrationFlowFulfillmentMode"
NOT NULL
DEFAULT 'NONE';