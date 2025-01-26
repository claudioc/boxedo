#!/bin/bash

docker cp couchdb-backup.tar.gz couchdb-joongle:/tmp/ && docker exec couchdb-joongle tar -xzf /tmp/couchdb-backup.tar.gz -C /opt/couchdb/data
npm run db:stop
npm run db:start
