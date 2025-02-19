#!/bin/bash

if [ ! -f .env ]; then
    echo "Error: .env file not found" >&2
    exit 1
fi

export $(cat .env | grep -v '#' | xargs)

echo "About to delete your database by nuking the directory ${DB_LOCAL_PATH}."
read -p "To confirm, please write the name of the directory: " confirmation
if [ "$confirmation" != "$DB_LOCAL_PATH" ]; then
    echo "Directory name does not match. Aborting." >&2
    exit 1
fi
echo

rm -rf ${DB_LOCAL_PATH}

echo "Database removed."
