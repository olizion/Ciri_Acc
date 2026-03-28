#!/usr/bin/env bash
# PostgreSQL restore script for Ciri
# Usage: ./pg_restore.sh <backup_file>

set -euo pipefail

BACKUP_FILE="${1:?Usage: pg_restore.sh <backup_file>}"
BACKUP_DIR="/backups"

echo "WARNING: This will overwrite the current database!"
echo "Restoring from: ${BACKUP_FILE}"
read -p "Continue? (y/N) " -n 1 -r
echo
[[ $REPLY =~ ^[Yy]$ ]] || exit 1

# Drop and recreate database
docker exec ciri-db psql -U ciri -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='ciri' AND pid <> pg_backend_pid();" 2>/dev/null || true
docker exec ciri-db psql -U ciri -d postgres -c "DROP DATABASE IF EXISTS ciri;"
docker exec ciri-db psql -U ciri -d postgres -c "CREATE DATABASE ciri OWNER ciri;"

# Restore
docker exec ciri-db pg_restore -U ciri -d ciri --no-owner "${BACKUP_DIR}/${BACKUP_FILE}"

echo "Restore complete: ${BACKUP_FILE}"
