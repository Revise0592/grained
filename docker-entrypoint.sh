#!/bin/sh
set -e

# Ensure data directories exist
mkdir -p /data/uploads

# Report auth configuration so Unraid users can verify their setup
if [ -n "$AUTH_PASSWORD" ]; then
  echo "Auth: enabled (AUTH_PASSWORD is set)"
else
  echo "Auth: disabled (AUTH_PASSWORD is not set — app will be publicly accessible)"
fi

# Run database migrations
echo "Running database migrations..."
node node_modules/prisma/build/index.js migrate deploy --schema=./prisma/schema.prisma

echo "Starting Grained..."
exec node server.js
