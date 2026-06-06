#!/usr/bin/env bash
# Aranya HRIS — PostgreSQL Daily Backup to GCS
# Setup cron: 0 2 * * * /home/aranya/aranya/scripts/backup-db.sh >> /var/log/aranya-backup.log 2>&1
set -euo pipefail

# ── Config (override via env or edit here) ───────────────────────────────────
CONTAINER_NAME="${POSTGRES_CONTAINER_NAME:-aranya-postgres-1}"
POSTGRES_DB="${POSTGRES_DB:?POSTGRES_DB is required}"
POSTGRES_USER="${POSTGRES_USER:?POSTGRES_USER is required}"
GCS_BUCKET="${GCS_BUCKET_NAME:?GCS_BUCKET_NAME is required}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

BACKUP_DIR="/tmp/aranya-backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/aranya_${TIMESTAMP}.sql.gz"
GCS_PATH="backups/postgres/aranya_${TIMESTAMP}.sql.gz"

# ── Backup ────────────────────────────────────────────────────────────────────
echo "[$(date -Iseconds)] Starting PostgreSQL backup..."
mkdir -p "$BACKUP_DIR"

docker exec "$CONTAINER_NAME" \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" \
  | gzip > "$BACKUP_FILE"

BACKUP_SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo "[$(date -Iseconds)] Backup created: ${BACKUP_FILE} (${BACKUP_SIZE})"

# ── Upload to GCS ─────────────────────────────────────────────────────────────
echo "[$(date -Iseconds)] Uploading to gs://${GCS_BUCKET}/${GCS_PATH}..."
gsutil -q cp "$BACKUP_FILE" "gs://${GCS_BUCKET}/${GCS_PATH}"
echo "[$(date -Iseconds)] Upload complete."

# ── Cleanup local file ────────────────────────────────────────────────────────
rm -f "$BACKUP_FILE"

# ── Prune old backups from GCS ────────────────────────────────────────────────
echo "[$(date -Iseconds)] Pruning backups older than ${RETENTION_DAYS} days..."
CUTOFF_DATE=$(date -d "${RETENTION_DAYS} days ago" +%Y-%m-%dT%H:%M:%S)

gsutil ls -l "gs://${GCS_BUCKET}/backups/postgres/" \
  | grep "aranya_" \
  | awk -v cutoff="$CUTOFF_DATE" '$2 < cutoff {print $3}' \
  | while read -r old_file; do
      echo "[$(date -Iseconds)] Removing old backup: $old_file"
      gsutil -q rm "$old_file"
    done

echo "[$(date -Iseconds)] Backup complete: gs://${GCS_BUCKET}/${GCS_PATH}"
