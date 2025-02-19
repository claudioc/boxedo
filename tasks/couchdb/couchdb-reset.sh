#!/bin/bash

if ! command -v jq &> /dev/null; then
    echo "Error: jq is not installed but is required for this script"
    echo "Please install it using your package manager:"
    echo "  - Ubuntu/Debian: sudo apt install jq"
    echo "  - macOS: brew install jq"
    echo "  - Fedora: sudo dnf install jq"
    exit 1
fi

# Get correct volume name from docker compose
VOLUME_NAME=$(docker compose config --format json | jq -r '.volumes | keys[0]')
if [ -z "$VOLUME_NAME" ]; then
    echo "Error: Could not determine volume name"
    exit 1
fi

# Get project name prefix
PROJECT_NAME=$(basename $(pwd))
FULL_VOLUME_NAME="${PROJECT_NAME}_${VOLUME_NAME}"

read -p "About to delete your database by nuking docker volume ${FULL_VOLUME_NAME}."
read -p "To confirm, please write the name of the volume: " confirmation
if [ "$confirmation" != "$FULL_VOLUME_NAME" ]; then
    echo "Volume name does not match. Aborting." >&2
    exit 1
fi
echo

echo "Stopping containers..."
docker compose down || { echo "Failed to stop containers"; exit 1; }

echo "Removing volume ${FULL_VOLUME_NAME}..."
docker volume rm "${FULL_VOLUME_NAME}" || { echo "Failed to remove volume"; exit 1; }

echo "Starting containers..."
docker compose up -d || { echo "Failed to start containers"; exit 1; }

echo "Waiting for CouchDB to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:5984 > /dev/null; then
        break
    fi
    sleep 1
done

echo "Creating _users database..."
curl -X PUT http://admin:password@localhost:5984/_users || { echo "Failed to create _users database"; exit 1; }

echo "Reset completed successfully"
