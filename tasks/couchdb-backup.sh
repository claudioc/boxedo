#!/bin/bash

# Note: we cannot stop the server in the container, or the container will stop

docker exec couchdb-joongle tar -czf /tmp/couchdb-backup.tar.gz -C /opt/couchdb/data .
docker cp couchdb-joongle:/tmp/couchdb-backup.tar.gz .
