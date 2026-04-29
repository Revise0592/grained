#!/bin/sh
set -e

# Ensure data directories exist
mkdir -p /data/uploads

# Report auth configuration so Unraid users can verify their setup
auth_disabled="$(printf '%s' "${AUTH_DISABLED:-}" | tr '[:upper:]' '[:lower:]')"
if [ "$auth_disabled" = "1" ] || [ "$auth_disabled" = "true" ] || [ "$auth_disabled" = "yes" ] || [ "$auth_disabled" = "on" ]; then
  echo "Auth: disabled explicitly (AUTH_DISABLED=true)"
else
  echo "Auth: enabled (single-admin app auth)"
fi

# Run database migrations
echo "Running database migrations..."
node node_modules/prisma/build/index.js migrate deploy --schema=./prisma/schema.prisma

echo "Starting Grained..."
exec node server.js
