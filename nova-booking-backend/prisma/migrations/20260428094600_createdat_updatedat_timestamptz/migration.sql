-- Convert audit timestamps to TIMESTAMPTZ (timezone-aware) without shifting instants.
--
-- IMPORTANT:
-- Existing columns are TIMESTAMP WITHOUT TIME ZONE and were historically populated using
-- CURRENT_TIMESTAMP in a UTC-based environment (Docker default). That means the stored
-- "wall time" represents UTC. To preserve the original instant, we interpret existing
-- values as UTC during conversion.
--
-- If your historical data was written in Asia/Ho_Chi_Minh local time instead, change
-- 'UTC' below to 'Asia/Ho_Chi_Minh' before applying.

ALTER TABLE "User"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING ("createdAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING ("updatedAt" AT TIME ZONE 'UTC');

ALTER TABLE "Court"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING ("createdAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING ("updatedAt" AT TIME ZONE 'UTC');

ALTER TABLE "Booking"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING ("createdAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING ("updatedAt" AT TIME ZONE 'UTC');

ALTER TABLE "Payment"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING ("createdAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING ("updatedAt" AT TIME ZONE 'UTC');

ALTER TABLE "Review"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING ("createdAt" AT TIME ZONE 'UTC');

-- Re-assert defaults (safety): createdAt should default to CURRENT_TIMESTAMP
ALTER TABLE "User" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Court" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Booking" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Payment" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Review" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

