#!/bin/sh
set -e

echo "Preparing database migrations..."

# Resolve any previously failed migration (fixes Prisma P3009 error).
# This marks the failed migration as rolled-back so it can be re-applied cleanly.
# Safe to run even when no failed migration exists — the command will simply exit.
npx prisma migrate resolve --rolled-back 20260314121000_add_bug_reports 2>/dev/null || true

echo "Deploying database migrations..."
npx prisma migrate deploy

echo "Starting application..."
exec npm run start:prod
