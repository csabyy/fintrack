#!/bin/sh
set -e

# Create / update the database schema. `db push` refuses changes that would
# drop data, so it is safe to run on every start. The SQL files around it are
# idempotent data migrations that `db push` cannot express.
if [ "${SKIP_DB_PUSH:-false}" != "true" ]; then
  PRISMA="node node_modules/prisma/build/index.js"
  echo "Applying database schema..."
  $PRISMA db execute --schema prisma/schema.prisma --file prisma/data-migrations/before-push.sql
  $PRISMA db push --skip-generate
  $PRISMA db execute --schema prisma/schema.prisma --file prisma/data-migrations/after-push.sql
fi

exec "$@"
