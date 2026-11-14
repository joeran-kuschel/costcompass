#!/usr/bin/env bash
set -uo pipefail
export PATH=/usr/local/bin:/usr/bin:/bin

LOG=${LOG:-$HOME/Library/Logs/costcompass-backup.log}
mkdir -p "$(dirname "$LOG")"

STATUS=0
{
    echo "=== $(date '+%Y-%m-%d %H:%M:%S') ==="
    "$(dirname "$0")/backup-db.sh" || STATUS=$?
    echo "exit code $STATUS"
} >> "$LOG" 2>&1

tail -n 500 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
exit "$STATUS"
