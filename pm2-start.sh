#!/bin/bash

npm run build

# Check if the app is already running in PM2
if pm2 list | grep -q "boxedo"; then
    echo "Application already exists in PM2, restarting..."
    pm2 restart boxedo
    exit 0
fi

# Check if CouchDB container is running
if ! docker compose ps | grep -q "couchdb"; then
    echo "CouchDB container is not running. Starting docker-compose..."
    if ! docker compose up -d; then
        echo "Failed to start docker-compose"
        exit 1
    fi

    # Wait for CouchDB to be ready
    echo "Waiting for CouchDB to be ready..."
    max_attempts=30
    attempt=1
    while ! curl -s http://localhost:5984 > /dev/null; do
        if [ $attempt -eq $max_attempts ]; then
            echo "CouchDB failed to start after $max_attempts attempts"
            exit 1
        fi
        echo "Attempt $attempt: CouchDB not ready yet..."
        sleep 2
        ((attempt++))
    done
fi

# Start the Node.js application with PM2
echo "Starting Node.js application with PM2..."
if ! pm2 start npm --name "boxedo" -- start; then
    echo "Failed to start application with PM2"
    exit 1
fi

echo "Startup sequence completed successfully"
