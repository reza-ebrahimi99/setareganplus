#!/usr/bin/env bash
# Idempotent repository bootstrap for SetareganPlus (Next.js 16 + Prisma 7 + PostgreSQL).
# Runs after the source checkout. Safe to run repeatedly.
set -euo pipefail

PG_MAJOR=16
DB_NAME=setareganplus
DB_USER=staros
DB_PASSWORD=staros_dev_pw
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:5432/${DB_NAME}?schema=public"

# 1. Ensure PostgreSQL is installed (no-op when the base image/snapshot already has it).
if ! command -v pg_ctlcluster >/dev/null 2>&1; then
  sudo apt-get update -y
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y postgresql postgresql-contrib
fi

# 2. Start the cluster so migrations/seed can run during install.
sudo pg_ctlcluster "${PG_MAJOR}" main start 2>/dev/null || true
for _ in $(seq 1 30); do
  if pg_isready -q -h 127.0.0.1 -p 5432; then break; fi
  sleep 1
done

# 3. Create the application role and database if they do not exist yet.
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASSWORD}' CREATEDB;
  END IF;
END \$\$;
SQL
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'" | grep -q 1 \
  || sudo -u postgres createdb -O "${DB_USER}" "${DB_NAME}"

# 4. Provide a local .env with the dev DATABASE_URL (never overwrite an existing one).
if [ ! -f .env ]; then
  cp .env.example .env
  sed -i "s#^DATABASE_URL=.*#DATABASE_URL=\"${DATABASE_URL}\"#" .env
fi

# 5. Install dependencies and generate the Prisma client.
npm ci
npm run db:generate

# 6. Apply migrations and seed baseline tenant data (both idempotent).
export DATABASE_URL
npm run db:migrate:deploy
npm run db:seed

echo "install.sh complete"
