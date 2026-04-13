#!/bin/sh
set -e

# Ensure data directories exist
mkdir -p /data/uploads

# Run database migrations
echo "Running database migrations..."
node node_modules/prisma/build/index.js migrate deploy --schema=./prisma/schema.prisma

echo "Starting Grained..."
exec node server.js
