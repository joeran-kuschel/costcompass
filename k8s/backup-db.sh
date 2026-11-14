#!/usr/bin/env bash
set -euo pipefail
umask 077
#shellcheck source=db-common.sh
source "$(dirname "$0")/db-common.sh"

BACKUP_DIR=${BACKUP_DIR:-$HOME/costcompass-backups}
mkdir -p "$BACKUP_DIR"

FILE="$BACKUP_DIR/costcompass-$(date +%Y%m%d-%H%M%S).sql.gz"
PARTIAL="$FILE.partial"
trap 'rm -f "$PARTIAL"' EXIT

echo "Backing up to $FILE"
# shellcheck disable=SC2016  # the variables are meant to be expanded inside the pod
kubectl exec -n "$NAMESPACE" "$POD" -- sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' | gzip > "$PARTIAL"
mv "$PARTIAL" "$FILE"

KEEP=${KEEP:-10}
# shellcheck disable=SC2012  # our own file names contain only letters, digits and dashes
ls -1t "$BACKUP_DIR"/costcompass-*.sql.gz | tail -n +"$((KEEP + 1))" | while read -r OLD; do
    rm -- "$OLD"
    echo "Removed old backup $OLD"
done
echo "Done $(wc -c < "$FILE") bytes"
