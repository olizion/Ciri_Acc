#!/usr/bin/env bash
# PostgreSQL backup script for Ciri
# Usage: ./pg_backup.sh [daily|weekly|manual]
# Runs pg_dump inside the ciri-db container

set -euo pipefail

BACKUP_TYPE="${1:-daily}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
FILENAME="ciri_${BACKUP_TYPE}_${TIMESTAMP}.dump"

# Run pg_dump inside the db container
docker exec ciri-db pg_dump -U ciri -d ciri --format=custom --file="${BACKUP_DIR}/${FILENAME}"

echo "Backup created: ${FILENAME}"

# Retention: keep 30 daily, 12 weekly, 60 monthly (5 years for compliance)
if [ "$BACKUP_TYPE" = "daily" ]; then
    docker exec ciri-db find "$BACKUP_DIR" -name "ciri_daily_*.dump" -mtime +30 -delete 2>/dev/null || true
elif [ "$BACKUP_TYPE" = "weekly" ]; then
    docker exec ciri-db find "$BACKUP_DIR" -name "ciri_weekly_*.dump" -mtime +84 -delete 2>/dev/null || true
fi

# Verify backup integrity
docker exec ciri-db pg_restore --list "${BACKUP_DIR}/${FILENAME}" > /dev/null 2>&1
echo "Backup verified: ${FILENAME}"
