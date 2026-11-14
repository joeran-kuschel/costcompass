# shellcheck shell=bash
# shellcheck disable=SC2034  # the variables are used by the scripts that source this file
# Shared by backup-db.sh and restore-db.sh. Load it with: source "$(dirname "$0")/db-common.sh"
NAMESPACE=costcompass
POD=postgres-0
CONTEXT=$(kubectl config current-context)

if [ "$CONTEXT" != "docker-desktop" ]; then
    echo "Refusing to run: the context is not docker-desktop" >&2
    exit 1
 fi
