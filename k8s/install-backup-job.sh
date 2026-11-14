#!/usr/bin/env bash
set -euo pipefail

LABEL=com.costcompass.db-backup
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
DOMAIN="gui/$(id -u)"
SCRIPT="$(cd "$(dirname "$0")" && pwd)/scheduled-backup.sh"

if [ "${1:-}" = "--uninstall" ]; then
    launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null || true
    rm -f "$PLIST"
    echo "Uninstalled $LABEL. Backups already made stay in place."
    exit 0
fi

if [ -n "${1:-}" ] && [ "$1" != "--daily" ]; then
    echo "Usage: $0 [--daily | --uninstall]" >&2
    exit 1
fi

SCHEDULE=hourly
KEEP=168
TRIGGER='<key>StartInterval</key>
    <integer>3600</integer>'

if [ "${1:-}" = "--daily" ]; then
    SCHEDULE=daily
    KEEP=30
    TRIGGER='<key>StartCalendarInterval</key>
    <dict><key>Hour</key><integer>12</integer><key>Minute</key><integer>0</integer></dict>'
fi

mkdir -p "$(dirname "$PLIST")"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>$LABEL</string>
    <key>ProgramArguments</key>
    <array>
        <string>$SCRIPT</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
        <key>KEEP</key>
        <string>$KEEP</string>
    </dict>
    $TRIGGER
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
EOF

plutil -lint "$PLIST"
launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null || true
launchctl bootstrap "$DOMAIN" "$PLIST"

echo "Installed $LABEL: $SCHEDULE backup, keeping the newest $KEEP."
echo "Runs: $SCRIPT"
echo "Files: ${BACKUP_DIR:-$HOME/costcompass-backups}, log: ~/Library/Logs/costcompass-backup.log"
echo "Remove it with: $0 --uninstall"
