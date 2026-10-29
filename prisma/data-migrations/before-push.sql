-- Runs before `prisma db push` on every container start; must stay idempotent.

-- GBP is the only supported currency: drop the old per-record currency columns
-- (`db push` refuses to drop columns that contain data on its own).
ALTER TABLE IF EXISTS "BankAccount" DROP COLUMN IF EXISTS "currency";
ALTER TABLE IF EXISTS "Budget" DROP COLUMN IF EXISTS "currency";
ALTER TABLE IF EXISTS "UserPreference" DROP COLUMN IF EXISTS "baseCurrency";

-- The recurring transactions feature was removed.
DROP TABLE IF EXISTS "RecurringTransaction";

-- PDF statement import was removed.
DROP TABLE IF EXISTS "Statement";
DROP TYPE IF EXISTS "StatementStatus";
