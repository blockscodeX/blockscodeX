#!/bin/sh
set -e

echo "Preparing database migrations..."

# Mark the previously failed migration as already applied (fixes Prisma P3009 error).
# The database already has all the tables/columns from this migration (applied manually),
# so we use --applied to tell Prisma to record it as done without re-running the SQL.
# Safe to run even when the migration is already recorded — the command will simply exit.
# NOTE: Once the migration has been successfully deployed, this line can be removed.
npx prisma migrate resolve --applied 20260314121000_add_bug_reports 2>/dev/null || true

echo "Deploying database migrations..."
npx prisma migrate deploy

echo "Starting application..."
exec npm run start:prod
