#!/bin/bash

if ! command -v jq &> /dev/null; then
    echo "Error: jq is not installed but is required for this script"
    echo "Please install it using your package manager:"
    echo "  - Ubuntu/Debian: sudo apt install jq"
    echo "  - macOS: brew install jq"
    echo "  - Fedora: sudo dnf install jq"
    exit 1
fi

if [ ! -f .env ]; then
    echo "Error: .env file not found" >&2
    exit 1
fi

export $(cat .env | grep -v '#' | xargs)

# Get correct volume name from docker compose
VOLUME_NAME=$(docker compose config --format json | jq -r '.volumes | keys[0]')
if [ -z "$VOLUME_NAME" ]; then
    echo "Error: Could not determine volume name"
    exit 1
fi

# Get project name prefix
PROJECT_NAME=$(basename $(pwd))
FULL_VOLUME_NAME="${PROJECT_NAME}_${VOLUME_NAME}"

echo "About to delete your database by nuking docker volume ${FULL_VOLUME_NAME}."
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
    if curl -s ${DB_REMOTE_URL} > /dev/null; then
        break
    fi
    sleep 1
done

echo "Creating _users database..."

# Remove either http:// or https:// from the start
host="${DB_REMOTE_URL#http://}"
host="${host#https://}"

# Get the original protocol (http or https)
protocol="${DB_REMOTE_URL%://*}"

host="${DB_REMOTE_URL#http://}"
url="${protocol}://${DB_REMOTE_USER}:${DB_REMOTE_PASSWORD}@${host}/_users"

curl -X PUT ${url} || { echo "Failed to create _users database"; exit 1; }

echo "Reset completed successfully"
