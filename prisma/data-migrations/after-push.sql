-- Runs after `prisma db push` on every container start; must stay idempotent.

-- Accounts with card metadata or a TrueLayer card connection are credit cards.
UPDATE "BankAccount"
SET "type" = 'CREDIT_CARD'
WHERE "type" = 'CURRENT'
  AND (
    "creditLimit" IS NOT NULL
    OR "cardNetwork" IS NOT NULL
    OR "id" IN (SELECT "bankAccountId" FROM "BankConnection" WHERE "accountType" = 'card')
  );

-- TrueLayer card transactions were imported with inverted signs (purchases as income, payments
-- as expenses) and card balances as positive amounts owed. Flip them once.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "DataMigration" WHERE "id" = 'truelayer-card-signs') THEN
    UPDATE "Transaction" t
    SET "amount" = -t."amount",
        "type" = CASE t."type"
          WHEN 'INCOME' THEN 'EXPENSE'::"TransactionType"
          WHEN 'EXPENSE' THEN 'INCOME'::"TransactionType"
          ELSE t."type"
        END
    FROM "BankAccount" a
    LEFT JOIN "BankConnection" c ON c."bankAccountId" = a."id"
    WHERE t."accountId" = a."id"
      AND t."importedFrom" LIKE 'truelayer:%'
      AND (c."accountType" = 'card' OR (c."id" IS NULL AND a."type" = 'CREDIT_CARD'));

    UPDATE "BankAccount" a
    SET "balance" = -a."balance"
    FROM "BankConnection" c
    WHERE c."bankAccountId" = a."id" AND c."accountType" = 'card';

    INSERT INTO "DataMigration" ("id") VALUES ('truelayer-card-signs');
  END IF;
END $$;
