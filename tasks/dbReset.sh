#!/bin/bash

if [ ! -f .env ]; then
    echo "Error: .env file not found" >&2
    exit 1
fi

export $(cat .env | grep -v '#' | xargs)

case "$DB_BACKEND" in
   "remote")
       ./tasks/couchdb/couchdb-reset.sh
       ;;
   "local")
       ./tasks/leveldb/leveldb-reset.sh
       ;;
   *)
       echo "Error: DB_BACKEND must be either 'remote' or 'local'" >&2
       exit 1
       ;;
esac
