#!/usr/bin/env bash

# ==============================================================================
# Automated Daily PostgreSQL Database Backup Script
# The Mailing Company — Pre-Launch Hardening Checklist (Task 8)
# ==============================================================================

set -eo pipefail

BACKUP_DIR="${BACKUP_DIR:-/tmp/pg_backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/mailpersonalize_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=7

mkdir -p "${BACKUP_DIR}"

if [ -z "${DATABASE_URL}" ]; then
  echo "⚠️ DATABASE_URL environment variable is not set. Defaulting to local postgres..."
  DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mailpersonalize"
fi

echo "📦 Starting automated database backup at $(date)..."
pg_dump "${DATABASE_URL}" | gzip > "${BACKUP_FILE}"

echo "✅ Backup created successfully: ${BACKUP_FILE} ($(du -sh "${BACKUP_FILE}" | cut -f1))"

echo "🧹 Cleaning up backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -type f -name "mailpersonalize_*.sql.gz" -mtime +${RETENTION_DAYS} -delete

echo "🎉 Backup automation complete."
