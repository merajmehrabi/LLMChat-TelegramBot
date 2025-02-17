#!/bin/sh
set -e

# Wait for MongoDB using Node.js script
echo "Checking MongoDB connection..."
node build/scripts/wait-for-mongodb.js || exit 1

# Run database initialization
echo "Initializing database..."
npm run db:init

# Start the application
echo "Starting application..."
exec node build/index.js
